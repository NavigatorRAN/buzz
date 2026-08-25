import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIncidentControlEvent,
  parseRelayIncidentControlRecord,
  setIncidentEventSignerForTests,
} from "./eventCodec.ts";
import { incidentFixture } from "./testFixtures.ts";

setIncidentEventSignerForTests(async (input) => ({
  id: "signed",
  pubkey: "owner",
  created_at: input.createdAt ?? 1,
  kind: input.kind,
  tags: input.tags,
  content: input.content,
  sig: "sig",
}));

test("incident event uses the dedicated kind, stable tags, and monotonic time", async () => {
  const event = await buildIncidentControlEvent(incidentFixture, 100);
  assert.equal(event.kind, 30639);
  assert.ok(event.created_at > 100);
  assert.deepEqual(event.tags, [
    ["d", "incident-1"],
    ["playbook", "interim-incident-guidance-2026-08-25"],
    ["status", "active"],
  ]);
  assert.equal(parseRelayIncidentControlRecord(event)?.id, "incident-1");
});

test("decoder rejects cross-tag substitution and malformed content", async () => {
  const event = await buildIncidentControlEvent(incidentFixture);
  assert.equal(
    parseRelayIncidentControlRecord({
      ...event,
      tags: event.tags.map((tag) =>
        tag[0] === "status" ? ["status", "closed"] : tag,
      ),
    }),
    null,
  );
  assert.equal(
    parseRelayIncidentControlRecord({ ...event, content: "{}" }),
    null,
  );
});
