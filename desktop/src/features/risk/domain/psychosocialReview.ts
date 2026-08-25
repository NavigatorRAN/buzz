import type {
  BattleRhythmEvent,
  BattleRhythmRevision,
  BattleRhythmSource,
} from "@/features/battle-rhythm/domain/contracts";
import type { PsychosocialHazard, RiskRecordV1 } from "./contracts";

const DAY_MS = 86_400_000;
const REVIEW_WINDOW_DAYS = 7;

export const psychosocialHazardLabels: Readonly<
  Record<PsychosocialHazard, string>
> = Object.freeze({
  jobDemands: "Job demands",
  lowJobControl: "Low job control",
  poorSupport: "Poor support",
  lackOfRoleClarity: "Lack of role clarity",
  poorOrganisationalChangeManagement: "Poor organisational change management",
  inadequateRewardAndRecognition: "Inadequate reward and recognition",
  poorOrganisationalJustice: "Poor organisational justice",
  traumaticEventsOrMaterial: "Traumatic events or material",
  remoteOrIsolatedWork: "Remote or isolated work",
  poorPhysicalEnvironment: "Poor physical environment",
  harmfulBehaviours: "Harmful behaviours or poor workplace relationships",
});

const programmeChangeHazards = Object.freeze<PsychosocialHazard[]>([
  "jobDemands",
  "poorSupport",
  "lackOfRoleClarity",
  "poorOrganisationalChangeManagement",
]);

export type PsychosocialReviewSuggestion = Readonly<{
  id: string;
  revisionId: string;
  eventId: string;
  eventTitle: string;
  eventStart: string;
  changeKind: "added" | "changed" | "removed";
  sourceType: "fas" | "longcast";
  sourceName: string;
  sourceLocation: string;
  importedAt: string;
  hazards: readonly PsychosocialHazard[];
  basis: string;
}>;

function changedEvent(
  change: BattleRhythmRevision["changes"][number],
): BattleRhythmEvent {
  return change.kind === "removed" ? change.before : change.after;
}

function sourceLocation(event: BattleRhythmEvent, source: BattleRhythmSource) {
  return event.ownership.kind === "source"
    ? event.ownership.sourceLocation
    : source.sourceReference;
}

export function suggestPsychosocialReviews(
  revisions: readonly BattleRhythmRevision[],
  sources: readonly BattleRhythmSource[],
  now: string,
): readonly PsychosocialReviewSuggestion[] {
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) return [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const suggestions: PsychosocialReviewSuggestion[] = [];

  for (const revision of revisions) {
    const source = sourceById.get(revision.sourceId);
    if (
      !source ||
      !["fas", "longcast"].includes(source.type) ||
      source.status === "cancelled"
    )
      continue;
    const importedMs = Date.parse(revision.importedAt);
    if (Number.isNaN(importedMs) || importedMs > nowMs) continue;

    for (const change of revision.changes) {
      const event = changedEvent(change);
      const startMs = Date.parse(event.start);
      const endMs = Date.parse(event.end);
      const noticeMs = startMs - importedMs;
      if (
        !event.allDay ||
        Number.isNaN(startMs) ||
        Number.isNaN(endMs) ||
        noticeMs < 0 ||
        noticeMs > REVIEW_WINDOW_DAYS * DAY_MS ||
        endMs < nowMs - DAY_MS
      )
        continue;

      suggestions.push(
        Object.freeze({
          id: `${revision.id}:${event.id}:${change.kind}`,
          revisionId: revision.id,
          eventId: event.id,
          eventTitle: event.title,
          eventStart: event.start,
          changeKind: change.kind,
          sourceType: source.type as "fas" | "longcast",
          sourceName: source.displayName,
          sourceLocation: sourceLocation(event, source),
          importedAt: revision.importedAt,
          hazards: programmeChangeHazards,
          basis: `${source.displayName} ${change.kind} ${event.title} within seven days of execution; review role clarity, change communication, support, and workload.`,
        }),
      );
    }
  }

  return Object.freeze(
    suggestions
      .sort(
        (left, right) =>
          Date.parse(left.eventStart) - Date.parse(right.eventStart),
      )
      .filter(
        (suggestion, index, all) =>
          all.findIndex((item) => item.eventId === suggestion.eventId) ===
          index,
      ),
  );
}

export function createRiskFromPsychosocialSuggestion(
  suggestion: PsychosocialReviewSuggestion,
  now: string,
): RiskRecordV1 {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: `Programme change: ${suggestion.eventTitle}`,
    description: suggestion.basis,
    consequenceDescription:
      "Unclear priorities, compressed preparation, or insufficient support may affect personnel and mission delivery.",
    domain: "mission",
    operationalTags: ["psychosocial", suggestion.sourceType],
    owner: "Executive Officer",
    scope: {
      type: "activity",
      id: suggestion.eventId,
      label: suggestion.eventTitle,
    },
    inherentAssessment: { likelihood: 3, consequence: "C" },
    controls: [],
    residualAssessment: {
      likelihood: 3,
      consequence: "C",
      basis: "Projected until controls are implemented and reviewed.",
      state: "projected",
    },
    status: "open",
    reviewDate: suggestion.eventStart.slice(0, 10),
    acceptance: {
      state: "notAccepted",
      authority: null,
      decidedBy: null,
      decidedAt: null,
      direction: null,
    },
    psychosocialReview: {
      state: "consideration",
      hazards: suggestion.hazards,
      exposure: {
        frequency: "isolated",
        duration: "brief",
        severity: "moderate",
      },
      basis: suggestion.basis,
      linkedRiskId: null,
      reviewedAt: now,
    },
    sourceEvidence: suggestion.sourceLocation,
    sourceConstraintId: null,
    createdAt: now,
    updatedAt: now,
  };
}
