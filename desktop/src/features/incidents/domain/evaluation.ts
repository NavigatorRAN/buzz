import {
  parseIncidentControlRecord,
  type IncidentControlRecordV1,
  type IncidentOwnerRole,
} from "./contracts.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_DAYS = 14;
const DECMS_MAXIMUM_DAYS = 28;

export type IncidentFollowUpPriority = "critical" | "high" | "medium";
export type IncidentFollowUpCode =
  | "safety-unconfirmed"
  | "action-overdue"
  | "action-blocked"
  | "review-overdue"
  | "decms-target-due"
  | "decms-maximum-breached";

export type IncidentFollowUp = Readonly<{
  id: string;
  incidentId: string;
  incidentReference: string;
  code: IncidentFollowUpCode;
  priority: IncidentFollowUpPriority;
  responsibleRole: IncidentOwnerRole;
  title: string;
  reason: string;
  dueAt: string | null;
}>;

export type CombinedIncidentSync = Readonly<{
  date: string;
  drivingIncidentId: string;
  activeIncidentIds: readonly string[];
  activeIncidentCount: number;
}>;

export type IncidentReviewOutcome = Readonly<{
  incidentId: string;
  summary: string;
  decmsUpdated: boolean;
  decmsReference: string | null;
}>;

function plusDays(timestamp: string, days: number) {
  return new Date(Date.parse(timestamp) + days * DAY_MS).toISOString();
}

function makeFollowUp(
  incident: IncidentControlRecordV1,
  input: Omit<IncidentFollowUp, "id" | "incidentId" | "incidentReference">,
): IncidentFollowUp {
  return Object.freeze({
    id: `${incident.id}:${input.code}:${input.dueAt ?? "open"}`,
    incidentId: incident.id,
    incidentReference: incident.reference,
    ...input,
  });
}

/** Derive the CO follow-up queue without changing signed incident state. */
export function deriveIncidentFollowUps(
  incidents: readonly IncidentControlRecordV1[],
  now: string = new Date().toISOString(),
): readonly IncidentFollowUp[] {
  const nowMs = Date.parse(now);
  const flags: IncidentFollowUp[] = [];
  for (const incident of incidents) {
    if (incident.status !== "active") continue;
    if (incident.safety.state !== "confirmed") {
      flags.push(
        makeFollowUp(incident, {
          code: "safety-unconfirmed",
          priority: "critical",
          responsibleRole: "CO",
          title: "Confirm immediate safety",
          reason: "Immediate safety actions are still recorded as underway.",
          dueAt: null,
        }),
      );
    }

    const decmsBase = incident.lastDecmsUpdatedAt ?? incident.openedAt;
    const decmsTarget = plusDays(decmsBase, REVIEW_DAYS);
    const decmsMaximum = plusDays(decmsBase, DECMS_MAXIMUM_DAYS);
    if (Date.parse(decmsMaximum) <= nowMs) {
      flags.push(
        makeFollowUp(incident, {
          code: "decms-maximum-breached",
          priority: "critical",
          responsibleRole: "N1",
          title: "DECMS maximum interval reached",
          reason: "No confirmed DECMS update is recorded within 28 days.",
          dueAt: decmsMaximum,
        }),
      );
    }

    if (Date.parse(incident.nextReviewAt) <= nowMs) {
      flags.push(
        makeFollowUp(incident, {
          code: "review-overdue",
          priority: "high",
          responsibleRole: "CO",
          title: "CO incident review due",
          reason:
            "The internal 14-day review cadence has reached its due time.",
          dueAt: incident.nextReviewAt,
        }),
      );
    }

    if (Date.parse(decmsTarget) <= nowMs && Date.parse(decmsMaximum) > nowMs) {
      flags.push(
        makeFollowUp(incident, {
          code: "decms-target-due",
          priority: "high",
          responsibleRole: "N1",
          title: "Preferred DECMS update due",
          reason: "The internal 14-day DECMS update target has been reached.",
          dueAt: decmsTarget,
        }),
      );
    }

    for (const action of incident.actions) {
      if (action.status === "complete" || action.status === "cancelled") {
        continue;
      }
      if (Date.parse(action.dueAt) <= nowMs) {
        flags.push(
          makeFollowUp(incident, {
            code: "action-overdue",
            priority: "high",
            responsibleRole: action.ownerRole,
            title: action.title,
            reason: "The assigned action has passed its due time.",
            dueAt: action.dueAt,
          }),
        );
      } else if (action.status === "blocked") {
        flags.push(
          makeFollowUp(incident, {
            code: "action-blocked",
            priority: "medium",
            responsibleRole: action.ownerRole,
            title: action.title,
            reason: action.blocker ?? "The assigned action is blocked.",
            dueAt: action.dueAt,
          }),
        );
      }
    }
  }
  const rank = { critical: 0, high: 1, medium: 2 } as const;
  const codeRank: Record<IncidentFollowUpCode, number> = {
    "safety-unconfirmed": 0,
    "decms-maximum-breached": 1,
    "review-overdue": 2,
    "decms-target-due": 3,
    "action-overdue": 4,
    "action-blocked": 5,
  };
  return Object.freeze(
    flags.sort(
      (left, right) =>
        rank[left.priority] - rank[right.priority] ||
        codeRank[left.code] - codeRank[right.code] ||
        (left.dueAt ?? "").localeCompare(right.dueAt ?? "") ||
        left.incidentReference.localeCompare(right.incidentReference) ||
        left.id.localeCompare(right.id),
    ),
  );
}

/** Select the single combined sync from the earliest active review date. */
export function deriveCombinedIncidentSync(
  incidents: readonly IncidentControlRecordV1[],
): CombinedIncidentSync | null {
  const active = incidents
    .filter((incident) => incident.status === "active")
    .sort(
      (left, right) =>
        left.nextReviewAt.localeCompare(right.nextReviewAt) ||
        left.id.localeCompare(right.id),
    );
  const driving = active[0];
  if (!driving) return null;
  return Object.freeze({
    date: driving.nextReviewAt.slice(0, 10),
    drivingIncidentId: driving.id,
    activeIncidentIds: Object.freeze(active.map((incident) => incident.id)),
    activeIncidentCount: active.length,
  });
}

/** Apply one CO sync outcome to every active incident and reset its review clock. */
export function applyCombinedIncidentReview(
  incidents: readonly IncidentControlRecordV1[],
  outcomes: readonly IncidentReviewOutcome[],
  reviewedAt: string,
  createReviewId: () => string = () => crypto.randomUUID(),
): readonly IncidentControlRecordV1[] {
  if (Number.isNaN(Date.parse(reviewedAt))) {
    throw new Error("reviewedAt must be RFC3339");
  }
  const active = incidents.filter((incident) => incident.status === "active");
  const outcomeByIncident = new Map(
    outcomes.map((outcome) => [outcome.incidentId, outcome]),
  );
  if (
    outcomeByIncident.size !== outcomes.length ||
    outcomeByIncident.size !== active.length ||
    active.some((incident) => !outcomeByIncident.has(incident.id))
  ) {
    throw new Error("review outcome required for every active incident");
  }
  return Object.freeze(
    incidents.map((incident) => {
      if (incident.status !== "active") return incident;
      const outcome = outcomeByIncident.get(incident.id);
      if (!outcome?.summary.trim()) {
        throw new Error("review outcome required for every active incident");
      }
      if (outcome.decmsUpdated !== Boolean(outcome.decmsReference?.trim())) {
        throw new Error("confirmed DECMS update requires its reference");
      }
      return parseIncidentControlRecord({
        ...incident,
        updatedAt: reviewedAt,
        lastReviewedAt: reviewedAt,
        nextReviewAt: plusDays(reviewedAt, REVIEW_DAYS),
        lastDecmsUpdatedAt: outcome.decmsUpdated
          ? reviewedAt
          : incident.lastDecmsUpdatedAt,
        decmsReference: outcome.decmsUpdated
          ? outcome.decmsReference
          : incident.decmsReference,
        reviews: [
          ...incident.reviews,
          {
            id: createReviewId(),
            reviewedAt,
            summary: outcome.summary.trim(),
            decmsUpdated: outcome.decmsUpdated,
            decmsReference: outcome.decmsUpdated
              ? outcome.decmsReference?.trim()
              : null,
          },
        ],
      });
    }),
  );
}
