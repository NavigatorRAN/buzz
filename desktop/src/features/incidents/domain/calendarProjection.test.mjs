import assert from "node:assert/strict";
import test from "node:test";
import { incidentFixture } from "./testFixtures.ts";
import { projectCombinedIncidentSync } from "./calendarProjection.ts";

test("projects one private timed meeting from the earliest active review", () => {
  const later = {
    ...incidentFixture,
    id: "incident-2",
    reference: "SENSITIVE-REFERENCE",
    title: "Sensitive incident title",
    nextReviewAt: "2026-08-20T00:15:00Z",
  };
  const projected = projectCombinedIncidentSync(
    [later, incidentFixture],
    "Australia/Sydney",
  );

  assert.deepEqual(projected, {
    external_id: "incident-control:combined-sync",
    title: "CO Incident Sync",
    start: "2026-08-15T10:00:00+10:00",
    end: "2026-08-15T10:30:00+10:00",
    is_all_day: false,
    location: null,
    notes:
      "Private command meeting · 2 active incidents\nN1 and XO to provide evidence-backed updates.\nOpen: /incidents",
  });
  assert.doesNotMatch(JSON.stringify(projected), /Sensitive|INC-2026/);
});

test("does not project a meeting when no incident is active", () => {
  assert.equal(
    projectCombinedIncidentSync(
      [{ ...incidentFixture, status: "closed" }],
      "Australia/Sydney",
    ),
    null,
  );
});
