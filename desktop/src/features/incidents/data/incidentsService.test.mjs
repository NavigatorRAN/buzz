import assert from "node:assert/strict";
import test from "node:test";

import { fetchIncidents, publishIncident } from "./incidentsService.ts";
import {
  buildIncidentControlEvent,
  setIncidentEventSignerForTests,
} from "../domain/eventCodec.ts";
import { incidentFixture } from "../domain/testFixtures.ts";

setIncidentEventSignerForTests(async (input) => ({
  id: "signed",
  pubkey: "owner",
  created_at: input.createdAt ?? 1,
  kind: input.kind,
  tags: input.tags,
  content: input.content,
  sig: "sig",
}));

test("fetch uses an explicit owner and kind and keeps the newest valid record", async () => {
  const old = {
    ...(await buildIncidentControlEvent(incidentFixture)),
    created_at: 10,
  };
  const newest = {
    ...(await buildIncidentControlEvent({
      ...incidentFixture,
      title: "Updated occurrence title",
      updatedAt: "2026-08-02T00:00:00Z",
    })),
    created_at: 11,
  };
  const malformed = { ...newest, content: "{}", created_at: 12 };
  const calls = [];
  const result = await fetchIncidents("owner", {
    fetchEvents: async (filter) => {
      calls.push(filter);
      return [old, malformed, newest];
    },
  });
  assert.deepEqual(calls, [
    { kinds: [30639], authors: ["owner"], limit: 2000 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Updated occurrence title");
});

test("publication advances the current relay head", async () => {
  const prior = {
    ...(await buildIncidentControlEvent(incidentFixture)),
    created_at: 44,
  };
  let published;
  await publishIncident("owner", incidentFixture, {
    fetchEvents: async () => [prior],
    publishEvent: async (event) => {
      published = event;
      return event;
    },
  });
  assert.ok(published.created_at > 44);
  assert.equal(published.kind, 30639);
});
