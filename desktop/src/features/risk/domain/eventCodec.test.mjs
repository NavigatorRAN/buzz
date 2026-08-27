import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRiskAuthorityProfileEvent,
  buildRiskRecordEvent,
  parseRelayRiskAuthorityProfile,
  parseRelayRiskRecord,
  setRiskEventSignerForTests,
} from "./eventCodec.ts";
import { authorityProfile, riskRecord } from "./testFixtures.ts";

setRiskEventSignerForTests(async (input) => ({
  id: "signed",
  pubkey: "owner",
  created_at: input.createdAt ?? 1,
  kind: input.kind,
  tags: input.tags,
  content: input.content,
  sig: "sig",
}));

test("risk records are signed with identity and query tags", async () => {
  const event = await buildRiskRecordEvent(riskRecord, 40);
  assert.equal(event.kind, 30639);
  assert.ok(event.created_at > 40);
  assert.deepEqual(event.tags, [
    ["d", "risk-davit"],
    ["status", "treating"],
    ["review", "2026-08-25"],
    ["project", "deployment-1"],
    ["constraint", "constraint-1"],
  ]);
  assert.deepEqual(parseRelayRiskRecord(event), riskRecord);
});

test("authority profiles round trip as signed replaceable events", async () => {
  const event = await buildRiskAuthorityProfileEvent(authorityProfile);
  assert.equal(event.kind, 30640);
  assert.deepEqual(event.tags, [["d", "adfp-default"]]);
  assert.deepEqual(parseRelayRiskAuthorityProfile(event), authorityProfile);
});

test("parsers reject tag and content mismatches", async () => {
  const event = await buildRiskRecordEvent(riskRecord);
  assert.equal(
    parseRelayRiskRecord({
      ...event,
      tags: event.tags.map((tag) =>
        tag[0] === "review" ? ["review", "2027-01-01"] : tag,
      ),
    }),
    null,
  );
});
