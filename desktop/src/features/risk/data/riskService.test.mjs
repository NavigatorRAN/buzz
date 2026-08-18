import assert from "node:assert/strict";
import test from "node:test";

import { fetchRiskRegister, publishRiskRecord } from "./riskService.ts";
import {
  buildRiskAuthorityProfileEvent,
  buildRiskRecordEvent,
  setRiskEventSignerForTests,
} from "../domain/eventCodec.ts";
import { authorityProfile, riskRecord } from "../domain/testFixtures.ts";

setRiskEventSignerForTests(async (input) => ({
  id: "signed",
  pubkey: "owner",
  created_at: input.createdAt ?? 1,
  kind: input.kind,
  tags: input.tags,
  content: input.content,
  sig: "sig",
}));

test("fetch scopes every query to the owner and returns newest valid records", async () => {
  const calls = [];
  const oldRisk = {
    ...(await buildRiskRecordEvent(riskRecord)),
    created_at: 10,
  };
  const newRisk = {
    ...(await buildRiskRecordEvent({
      ...riskRecord,
      title: "Updated davit risk",
    })),
    created_at: 20,
  };
  const profile = await buildRiskAuthorityProfileEvent(authorityProfile);
  const responses = [[oldRisk, newRisk], [profile]];
  const result = await fetchRiskRegister("owner", {
    fetchEvents: async (filter) => {
      calls.push(filter);
      return responses.shift() ?? [];
    },
  });
  assert.deepEqual(calls, [
    { kinds: [30639], authors: ["owner"], limit: 5000 },
    { kinds: [30640], authors: ["owner"], limit: 50 },
  ]);
  assert.equal(result.risks.length, 1);
  assert.equal(result.risks[0].title, "Updated davit risk");
  assert.equal(result.authorityProfile.id, "adfp-default");
});

test("publication advances the replaceable event head", async () => {
  const prior = { ...(await buildRiskRecordEvent(riskRecord)), created_at: 44 };
  let published;
  await publishRiskRecord("owner", riskRecord, {
    fetchEvents: async () => [prior],
    publishEvent: async (event) => {
      published = event;
      return event;
    },
  });
  assert.ok(published.created_at > 44);
});
