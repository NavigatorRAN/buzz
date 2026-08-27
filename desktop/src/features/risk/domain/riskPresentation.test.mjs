import assert from "node:assert/strict";
import test from "node:test";

import { authorityProfile, riskRecord } from "./testFixtures.ts";
import {
  createRiskFromConstraint,
  summarizeRisks,
} from "./riskPresentation.ts";

test("summary counts active, overdue, elevation, and projected-control risks", () => {
  const summary = summarizeRisks(
    [riskRecord, { ...riskRecord, id: "closed", status: "closed" }],
    { ...authorityProfile, localAcceptanceCeiling: "low" },
    "2026-08-26",
  );
  assert.deepEqual(summary, {
    active: 1,
    overdue: 1,
    elevationRequired: 1,
    projectedControls: 1,
  });
});

test("summary does not request elevation after command has accepted or elevated the risk", () => {
  const acceptedRisk = {
    ...riskRecord,
    acceptance: {
      ...riskRecord.acceptance,
      state: "accepted",
      authority: "CO",
      decidedBy: "Matthew",
      decidedAt: "2026-08-19T00:00:00Z",
      direction: "Accept for the activity.",
    },
  };
  const elevatedRisk = {
    ...acceptedRisk,
    id: "elevated",
    acceptance: { ...acceptedRisk.acceptance, state: "elevated" },
  };

  const summary = summarizeRisks(
    [acceptedRisk, elevatedRisk],
    { ...authorityProfile, localAcceptanceCeiling: "low" },
    "2026-08-19",
  );

  assert.equal(summary.elevationRequired, 0);
});

test("risk candidates prefill a project-scoped risk without inventing acceptance", () => {
  const risk = createRiskFromConstraint(
    {
      schemaVersion: 1,
      id: "constraint-1",
      projectId: "deployment-1",
      type: "defect",
      description: "Seaboat davit unavailable",
      owner: "MEO",
      severity: "critical",
      status: "riskCandidate",
      linkedMissionRequirementId: null,
      linkedCapabilityId: "seaboat",
      linkedTaskId: "repair-davit",
      linkedMilestoneId: null,
      requiredDate: "2026-08-24",
      dispositionNote: "Assess mission impact.",
      sourceEvidence: "Defect list 42",
      createdAt: "2026-08-18T00:00:00Z",
      updatedAt: "2026-08-18T00:00:00Z",
    },
    "Regional deployment",
    "2026-08-19T00:00:00Z",
  );
  assert.equal(risk.sourceConstraintId, "constraint-1");
  assert.equal(risk.scope.id, "deployment-1");
  assert.equal(risk.acceptance.state, "notAccepted");
  assert.equal(risk.controls[0].linkedTaskId, "repair-davit");
});
