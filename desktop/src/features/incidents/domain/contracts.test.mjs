import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERIM_INCIDENT_PLAYBOOK_VERSION,
  parseIncidentControlRecord,
} from "./contracts.ts";

const baseRecord = () => ({
  schemaVersion: 1,
  classification: "OFFICIAL",
  id: "incident-1",
  reference: "INC-2026-001",
  title: "Workplace safety occurrence",
  summary: "A workplace occurrence was reported during the morning watch.",
  status: "active",
  stage: "manage",
  playbookVersion: INTERIM_INCIDENT_PLAYBOOK_VERSION,
  occurredAt: "2026-08-01T00:00:00Z",
  openedAt: "2026-08-01T00:15:00Z",
  updatedAt: "2026-08-01T00:15:00Z",
  safety: {
    state: "confirmed",
    immediateRisk: "The affected workspace was isolated.",
    medicalOrWelfareSupport: "Medical assessment offered.",
    workplaceControls: "Access restricted pending assessment.",
    evidencePreservation: "Scene and records preserved.",
  },
  facts: ["A report was made at 1000."],
  allegations: ["Unsafe equipment was in use."],
  assumptions: [],
  unknowns: ["The equipment inspection outcome is pending."],
  actions: [
    {
      id: "action-1",
      title: "Confirm equipment inspection",
      ownerRole: "XO",
      status: "inProgress",
      dueAt: "2026-08-03T00:00:00Z",
      evidence: null,
      blocker: null,
      updatedAt: "2026-08-01T00:15:00Z",
    },
  ],
  notifications: {
    commandNotifiedAt: "2026-08-01T00:10:00Z",
    specialists: ["Safety"],
    note: "Command and Safety were notified separately.",
  },
  reporting: {
    formalReportStatus: "inProgress",
    note: "N1 is preparing the initial report.",
  },
  lastReviewedAt: "2026-08-01T00:15:00Z",
  nextReviewAt: "2026-08-15T00:15:00Z",
  lastDecmsUpdatedAt: "2026-08-01T00:15:00Z",
  decmsReference: "DECMS-001",
  reviews: [],
  closure: {
    actionsComplete: false,
    outcomesRecorded: false,
    partiesAdvised: false,
    supportConcluded: false,
    handoverComplete: false,
    lessonsIdentified: false,
    repeatPatternChecked: false,
    evidence: null,
  },
});

test("parses and freezes the strict incident record", () => {
  const parsed = parseIncidentControlRecord(baseRecord());
  assert.equal(parsed.playbookVersion, "interim-incident-guidance-2026-08-25");
  assert.equal(parsed.actions[0].ownerRole, "XO");
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.actions));
  assert.ok(Object.isFrozen(parsed.actions[0]));
});

test("rejects unknown fields so incident state fails closed", () => {
  assert.throws(
    () => parseIncidentControlRecord({ ...baseRecord(), hidden: true }),
    /unknown or missing field/,
  );
});

test("requires an explicit safety state and valid timestamps", () => {
  const missingSafetyState = baseRecord();
  delete missingSafetyState.safety.state;
  assert.throws(
    () => parseIncidentControlRecord(missingSafetyState),
    /unknown or missing field/,
  );

  assert.throws(
    () =>
      parseIncidentControlRecord({
        ...baseRecord(),
        nextReviewAt: "14 days",
      }),
    /nextReviewAt must be RFC3339/,
  );
});

test("rejects completion without evidence and blocking without a reason", () => {
  const complete = baseRecord();
  complete.actions[0] = { ...complete.actions[0], status: "complete" };
  assert.throws(
    () => parseIncidentControlRecord(complete),
    /complete action requires evidence/,
  );

  const blocked = baseRecord();
  blocked.actions[0] = { ...blocked.actions[0], status: "blocked" };
  assert.throws(
    () => parseIncidentControlRecord(blocked),
    /blocked action requires blocker/,
  );
});

test("rejects closure while any closure gate lacks evidence", () => {
  assert.throws(
    () =>
      parseIncidentControlRecord({
        ...baseRecord(),
        status: "closed",
      }),
    /closed incident requires every closure gate and closure evidence/,
  );
});

test("accepts an append-only ordered review history", () => {
  const input = baseRecord();
  input.reviews = [
    {
      id: "review-1",
      reviewedAt: "2026-08-15T00:15:00Z",
      summary: "All active controls and actions were reviewed.",
      decmsUpdated: true,
      decmsReference: "DECMS-001",
    },
    {
      id: "review-2",
      reviewedAt: "2026-08-29T00:15:00Z",
      summary: "The investigation remains active and support continues.",
      decmsUpdated: false,
      decmsReference: null,
    },
  ];
  input.lastReviewedAt = "2026-08-29T00:15:00Z";
  input.nextReviewAt = "2026-09-12T00:15:00Z";
  input.lastDecmsUpdatedAt = "2026-08-15T00:15:00Z";
  assert.equal(parseIncidentControlRecord(input).reviews.length, 2);

  input.reviews.reverse();
  assert.throws(
    () => parseIncidentControlRecord(input),
    /reviews must be ordered/,
  );
});
