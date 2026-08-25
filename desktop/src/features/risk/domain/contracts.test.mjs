import assert from "node:assert/strict";
import test from "node:test";

import { parseRiskAuthorityProfile, parseRiskRecord } from "./contracts.ts";

function risk() {
  return {
    schemaVersion: 1,
    id: "risk-davit",
    title: "Seaboat davit unavailable",
    description: "The port seaboat davit cannot launch the assigned boat.",
    consequenceDescription:
      "The mission may lose its assigned seaboat capability.",
    domain: "capability",
    operationalTags: ["MEO", "seaboat"],
    owner: "Marine Engineering Officer",
    scope: {
      type: "project",
      id: "deployment-1",
      label: "Regional deployment",
    },
    inherentAssessment: { likelihood: 4, consequence: "D" },
    controls: [
      {
        id: "repair",
        description: "Repair and function-test the davit.",
        owner: "MEO",
        status: "inProgress",
        linkedTaskId: "repair-davit",
        dueDate: "2026-08-24",
        effectiveness: null,
      },
    ],
    residualAssessment: {
      likelihood: 2,
      consequence: "D",
      basis: "Projected after repair and operational test.",
      state: "projected",
    },
    status: "treating",
    reviewDate: "2026-08-25",
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
    sourceEvidence: "Defect list 42",
    sourceConstraintId: "constraint-1",
    createdAt: "2026-08-19T00:00:00Z",
    updatedAt: "2026-08-19T00:00:00Z",
  };
}

function profile() {
  return {
    schemaVersion: 1,
    id: "adfp-default",
    title: "ADF operational risk authority",
    localAcceptanceCeiling: "medium",
    authorities: {
      veryLow: "Team Leader APS4-6 / Corporal-O3",
      low: "O3-O4 / Deputy Director / EL1",
      medium:
        "Commanding Officer / independent Officer Commanding / Director EL2 / O4-O6",
      high: "Functional or Formation Commander / CJTF / 1-2 Star / SES Band 1-2",
      veryHigh: "Secretary / CDF / Chief of Service / CJOPS / CJC / Group Head",
    },
    reviewCadenceDays: {
      veryLow: 90,
      low: 30,
      medium: 7,
      high: 1,
      veryHigh: 1,
    },
    source: "ADFP 5.0.1 Annex 1C Table 1C.5",
    updatedAt: "2026-08-19T00:00:00Z",
  };
}

test("accepts the exact immutable risk and authority contracts", () => {
  assert.deepEqual(parseRiskRecord(risk()), risk());
  assert.deepEqual(parseRiskAuthorityProfile(profile()), profile());
});

test("rejects unknown fields, duplicate controls, and task scope without an id", () => {
  assert.throws(() => parseRiskRecord({ ...risk(), unexpected: true }));
  const duplicate = risk();
  duplicate.controls.push({ ...duplicate.controls[0] });
  assert.throws(() => parseRiskRecord(duplicate), /control ids/i);
  const taskScope = risk();
  taskScope.scope = { type: "task", id: null, label: "Repair" };
  assert.throws(() => parseRiskRecord(taskScope), /scope id/i);
});

test("validated residual risk requires implemented controls and effectiveness", () => {
  const validated = risk();
  validated.residualAssessment.state = "validated";
  assert.throws(() => parseRiskRecord(validated), /implemented/i);
  validated.controls[0].status = "implemented";
  assert.throws(() => parseRiskRecord(validated), /effectiveness/i);
  validated.controls[0].effectiveness =
    "Function test and launch trial passed.";
  assert.equal(
    parseRiskRecord(validated).residualAssessment.state,
    "validated",
  );
});

test("accepted and elevated states require a complete human decision", () => {
  for (const state of ["accepted", "elevated"]) {
    const decided = risk();
    decided.status = state;
    decided.controls[0].status = "implemented";
    decided.controls[0].effectiveness = "Verified.";
    decided.residualAssessment.state = "validated";
    decided.acceptance.state = state;
    assert.throws(() => parseRiskRecord(decided), /decision/i);
    decided.acceptance.authority = "Commanding Officer";
    decided.acceptance.decidedBy = "CO HMAS Supply";
    decided.acceptance.decidedAt = "2026-08-19T01:00:00Z";
    decided.acceptance.direction = "Proceed with controls maintained.";
    assert.equal(parseRiskRecord(decided).acceptance.state, state);
  }
});

test("closing a risk requires command direction", () => {
  const closed = risk();
  closed.status = "closed";
  assert.throws(() => parseRiskRecord(closed), /direction/i);
  closed.acceptance.direction = "Mission changed; seaboat task removed.";
  assert.equal(parseRiskRecord(closed).status, "closed");
});

test("consideration and material psychosocial reviews require bounded assessment details", () => {
  const considered = risk();
  considered.psychosocialReview = {
    state: "consideration",
    hazards: ["lackOfRoleClarity", "poorOrganisationalChangeManagement"],
    exposure: {
      frequency: "isolated",
      duration: "brief",
      severity: "moderate",
    },
    basis: "The sailing programme changed within the preparation window.",
    linkedRiskId: null,
    reviewedAt: "2026-08-25T01:00:00Z",
  };
  assert.equal(
    parseRiskRecord(considered).psychosocialReview.state,
    "consideration",
  );

  const missingHazards = structuredClone(considered);
  missingHazards.psychosocialReview.hazards = [];
  assert.throws(() => parseRiskRecord(missingHazards), /hazard/i);

  const missingExposure = structuredClone(considered);
  missingExposure.psychosocialReview.exposure = null;
  assert.throws(() => parseRiskRecord(missingExposure), /exposure/i);

  const linkedConsideration = structuredClone(considered);
  linkedConsideration.psychosocialReview.linkedRiskId = "risk-personnel-1";
  assert.throws(() => parseRiskRecord(linkedConsideration), /linked/i);

  const material = structuredClone(considered);
  material.psychosocialReview.state = "material";
  material.psychosocialReview.linkedRiskId = "risk-personnel-1";
  assert.equal(
    parseRiskRecord(material).psychosocialReview.linkedRiskId,
    "risk-personnel-1",
  );
});
