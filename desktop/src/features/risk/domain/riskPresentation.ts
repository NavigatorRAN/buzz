import type { MissionConstraint } from "@/features/plans/domain/contracts";
import type {
  RiskAuthorityProfileV1,
  RiskConsequence,
  RiskLikelihood,
  RiskRecordV1,
} from "./contracts";
import { requiresElevation, riskLevelFor } from "./riskMatrix";

export function summarizeRisks(
  risks: readonly RiskRecordV1[],
  profile: RiskAuthorityProfileV1,
  today: string,
) {
  const active = risks.filter((risk) => risk.status !== "closed");
  return Object.freeze({
    active: active.length,
    overdue: active.filter((risk) => risk.reviewDate < today).length,
    elevationRequired: active.filter(
      (risk) =>
        !["accepted", "elevated"].includes(risk.acceptance.state) &&
        requiresElevation(
          riskLevelFor(
            risk.residualAssessment.likelihood,
            risk.residualAssessment.consequence,
          ),
          profile,
        ),
    ).length,
    projectedControls: active.filter(
      (risk) => risk.residualAssessment.state === "projected",
    ).length,
  });
}

const severityAssessment: Readonly<
  Record<
    MissionConstraint["severity"],
    { likelihood: RiskLikelihood; consequence: RiskConsequence }
  >
> = {
  low: { likelihood: 2, consequence: "B" },
  medium: { likelihood: 3, consequence: "C" },
  high: { likelihood: 4, consequence: "D" },
  critical: { likelihood: 4, consequence: "E" },
};

export function createRiskFromConstraint(
  constraint: MissionConstraint,
  projectTitle: string,
  now: string,
): RiskRecordV1 {
  const assessment = severityAssessment[constraint.severity];
  const reviewDate = constraint.requiredDate ?? now.slice(0, 10);
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: constraint.description,
    description:
      constraint.dispositionNote ??
      `Assess the operational risk created by ${constraint.description}.`,
    consequenceDescription:
      "Mission consequence requires assessment and command review.",
    domain:
      constraint.type === "defect" || constraint.type === "missingCapability"
        ? "capability"
        : "mission",
    operationalTags: [constraint.type],
    owner: constraint.owner,
    scope: {
      type: "project",
      id: constraint.projectId,
      label: projectTitle,
    },
    inherentAssessment: assessment,
    controls: constraint.linkedTaskId
      ? [
          {
            id: crypto.randomUUID(),
            description: "Complete the linked planning task.",
            owner: constraint.owner,
            status: "planned",
            linkedTaskId: constraint.linkedTaskId,
            dueDate: constraint.requiredDate,
            effectiveness: null,
          },
        ]
      : [],
    residualAssessment: {
      ...assessment,
      basis: "Projected until controls are implemented and reviewed.",
      state: "projected",
    },
    status: "open",
    reviewDate,
    acceptance: {
      state: "notAccepted",
      authority: null,
      decidedBy: null,
      decidedAt: null,
      direction: null,
    },
    psychosocialReview: {
      state: "notIndicated",
      hazards: [],
      exposure: null,
      basis: null,
      linkedRiskId: null,
      reviewedAt: null,
    },
    sourceEvidence: constraint.sourceEvidence,
    sourceConstraintId: constraint.id,
    createdAt: now,
    updatedAt: now,
  };
}
