import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCombinedIncidentReview,
  deriveCombinedIncidentSync,
  deriveIncidentFollowUps,
} from "./evaluation.ts";
import {
  INTERIM_INCIDENT_PLAYBOOK_VERSION,
  parseIncidentControlRecord,
} from "./contracts.ts";

function incident(overrides = {}) {
  return parseIncidentControlRecord({
    schemaVersion: 1,
    classification: "OFFICIAL",
    id: "incident-1",
    reference: "INC-2026-001",
    title: "Workplace safety occurrence",
    summary: "A workplace occurrence was reported.",
    status: "active",
    stage: "manageUpdate",
    playbookVersion: INTERIM_INCIDENT_PLAYBOOK_VERSION,
    occurredAt: "2026-08-01T00:00:00Z",
    openedAt: "2026-08-01T00:15:00Z",
    updatedAt: "2026-08-01T00:15:00Z",
    safety: {
      state: "confirmed",
      immediateRisk: "Workspace isolated.",
      medicalOrWelfareSupport: "Support offered.",
      workplaceControls: "Access restricted.",
      evidencePreservation: "Records preserved.",
    },
    facts: ["The occurrence was reported."],
    allegations: [],
    assumptions: [],
    unknowns: ["Inspection outcome pending."],
    actions: [],
    notifications: {
      commandNotifiedAt: "2026-08-01T00:10:00Z",
      specialists: ["Safety"],
      note: "Command and Safety notified.",
    },
    reporting: {
      formalReportStatus: "complete",
      note: "Initial report submitted.",
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
    ...overrides,
  });
}

test("flags unsafe state and overdue action for CO follow-up", () => {
  const value = incident({
    safety: {
      state: "actionsUnderway",
      immediateRisk: "Isolation underway.",
      medicalOrWelfareSupport: "Support offered.",
      workplaceControls: "Access restriction underway.",
      evidencePreservation: "Records preserved.",
    },
    actions: [
      {
        id: "a1",
        title: "Confirm isolation",
        ownerRole: "XO",
        status: "inProgress",
        dueAt: "2026-08-02T00:00:00Z",
        evidence: null,
        blocker: null,
        updatedAt: "2026-08-01T00:15:00Z",
      },
    ],
  });
  const flags = deriveIncidentFollowUps([value], "2026-08-10T00:00:00Z");
  assert.deepEqual(
    flags.map(({ code, priority, responsibleRole }) => ({
      code,
      priority,
      responsibleRole,
    })),
    [
      {
        code: "safety-unconfirmed",
        priority: "critical",
        responsibleRole: "CO",
      },
      { code: "action-overdue", priority: "high", responsibleRole: "XO" },
    ],
  );
});

test("uses a 14-day DECMS target and a distinct 28-day maximum", () => {
  assert.deepEqual(
    deriveIncidentFollowUps([incident()], "2026-08-15T00:15:00Z").map(
      (flag) => flag.code,
    ),
    ["review-overdue", "decms-target-due"],
  );
  assert.deepEqual(
    deriveIncidentFollowUps([incident()], "2026-08-29T00:15:00Z").map(
      (flag) => flag.code,
    ),
    ["decms-maximum-breached", "review-overdue"],
  );
});

test("combined sync uses the earliest active incident date", () => {
  const later = incident({
    id: "later",
    reference: "INC-2026-002",
    nextReviewAt: "2026-08-20T01:00:00Z",
  });
  const earlier = incident({
    id: "earlier",
    reference: "INC-2026-003",
    nextReviewAt: "2026-08-12T01:00:00Z",
  });
  const closed = incident({
    id: "closed",
    reference: "INC-2026-004",
    status: "closed",
    nextReviewAt: "2026-08-05T01:00:00Z",
    closure: {
      actionsComplete: true,
      outcomesRecorded: true,
      partiesAdvised: true,
      supportConcluded: true,
      handoverComplete: true,
      lessonsIdentified: true,
      repeatPatternChecked: true,
      evidence: "Closure approved by CO.",
    },
  });
  assert.deepEqual(deriveCombinedIncidentSync([later, closed, earlier]), {
    date: "2026-08-12",
    drivingIncidentId: "earlier",
    activeIncidentIds: ["earlier", "later"],
    activeIncidentCount: 2,
  });
});

test("recording the combined sync resets every active incident review clock", () => {
  const first = incident({ id: "first", reference: "INC-2026-001" });
  const second = incident({ id: "second", reference: "INC-2026-002" });
  const results = applyCombinedIncidentReview(
    [first, second],
    [
      {
        incidentId: "first",
        summary: "Controls and actions reviewed; DECMS narrative updated.",
        decmsUpdated: true,
        decmsReference: "DECMS-001",
      },
      {
        incidentId: "second",
        summary: "Controls and actions reviewed; no formal update submitted.",
        decmsUpdated: false,
        decmsReference: null,
      },
    ],
    "2026-08-10T02:00:00Z",
    () => "review-id",
  );
  assert.deepEqual(
    results.map((value) => ({
      id: value.id,
      nextReviewAt: value.nextReviewAt,
      lastDecmsUpdatedAt: value.lastDecmsUpdatedAt,
      reviewCount: value.reviews.length,
    })),
    [
      {
        id: "first",
        nextReviewAt: "2026-08-24T02:00:00.000Z",
        lastDecmsUpdatedAt: "2026-08-10T02:00:00Z",
        reviewCount: 1,
      },
      {
        id: "second",
        nextReviewAt: "2026-08-24T02:00:00.000Z",
        lastDecmsUpdatedAt: "2026-08-01T00:15:00Z",
        reviewCount: 1,
      },
    ],
  );
});

test("combined sync rejects a missing active-incident summary", () => {
  assert.throws(
    () => applyCombinedIncidentReview([incident()], [], "2026-08-10T02:00:00Z"),
    /review outcome required for every active incident/,
  );
});
