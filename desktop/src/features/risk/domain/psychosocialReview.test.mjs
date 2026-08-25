import assert from "node:assert/strict";
import test from "node:test";

import {
  createRiskFromPsychosocialSuggestion,
  suggestPsychosocialReviews,
} from "./psychosocialReview.ts";

function source(type = "fas") {
  return {
    schemaVersion: 1,
    id: `source-${type}`,
    type,
    displayName: type.toUpperCase(),
    coverageStart: "2026-08-01T00:00:00+10:00",
    coverageEnd: "2026-09-01T00:00:00+10:00",
    documentName: `${type}.xlsx`,
    documentHash: "a".repeat(64),
    revisionId: "revision-2",
    priorRevisionId: "revision-1",
    importedAt: "2026-08-25T08:00:00+10:00",
    status: "approved",
    sourceReference: `${type}.xlsx`,
  };
}

function event(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "programme-sailing",
    ownership: {
      kind: "source",
      sourceId: "source-fas",
      revisionId: "revision-2",
      sourceLocation: "FAS row 17",
    },
    title: "Sail for regional deployment",
    description: null,
    type: "programme",
    start: "2026-08-28T00:00:00+10:00",
    end: "2026-08-30T00:00:00+10:00",
    allDay: true,
    timeZone: "Australia/Sydney",
    status: "approved",
    location: "Sea",
    responsibleOwner: "Operations Officer",
    participants: [],
    remarks: null,
    linkedPlanId: null,
    linkedTaskId: null,
    linkedMissionRequirementId: null,
    parentActivityId: null,
    recurrence: null,
    excludedOccurrenceStarts: [],
    ...overrides,
  };
}

function revision(change, sourceId = "source-fas") {
  return {
    schemaVersion: 1,
    id: "revision-2",
    sourceId,
    priorRevisionId: "revision-1",
    importedAt: "2026-08-25T08:00:00+10:00",
    changes: [change],
  };
}

test("suggests a review for a short-notice all-day FAS programme change", () => {
  const before = event({
    start: "2026-08-29T00:00:00+10:00",
    end: "2026-08-31T00:00:00+10:00",
  });
  const suggestions = suggestPsychosocialReviews(
    [revision({ kind: "changed", before, after: event() })],
    [source()],
    "2026-08-25T10:00:00+10:00",
  );

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].eventId, "programme-sailing");
  assert.deepEqual(suggestions[0].hazards, [
    "jobDemands",
    "poorSupport",
    "lackOfRoleClarity",
    "poorOrganisationalChangeManagement",
  ]);
});

test("does not suggest for timed, distant, or Shortcast changes", () => {
  const timed = revision({ kind: "added", after: event({ allDay: false }) });
  const distant = revision({
    kind: "added",
    after: event({
      id: "distant",
      start: "2026-09-20T00:00:00+10:00",
      end: "2026-09-21T00:00:00+10:00",
    }),
  });
  const shortcast = revision(
    {
      kind: "added",
      after: event({
        id: "shortcast",
        ownership: {
          kind: "source",
          sourceId: "source-shortcast",
          revisionId: "revision-2",
          sourceLocation: "Shortcast row 3",
        },
      }),
    },
    "source-shortcast",
  );

  assert.deepEqual(
    suggestPsychosocialReviews(
      [timed, distant, shortcast],
      [source(), source("shortcast")],
      "2026-08-25T10:00:00+10:00",
    ),
    [],
  );
});

test("creates an unsaved review draft without changing the ADFP assessment", () => {
  const [suggestion] = suggestPsychosocialReviews(
    [revision({ kind: "added", after: event() })],
    [source()],
    "2026-08-25T10:00:00+10:00",
  );
  const draft = createRiskFromPsychosocialSuggestion(
    suggestion,
    "2026-08-25T10:00:00+10:00",
  );

  assert.equal(draft.psychosocialReview.state, "consideration");
  assert.equal(draft.sourceEvidence, "FAS row 17");
  assert.deepEqual(draft.inherentAssessment, {
    likelihood: 3,
    consequence: "C",
  });
  assert.deepEqual(draft.residualAssessment, {
    likelihood: 3,
    consequence: "C",
    basis: "Projected until controls are implemented and reviewed.",
    state: "projected",
  });
  assert.deepEqual(draft.controls, []);
});
