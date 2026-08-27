import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RISK_AUTHORITY_PROFILE,
  requiredAuthorityFor,
  requiresElevation,
  riskIndexFor,
  riskLevelFor,
} from "./riskMatrix.ts";

const expected = {
  5: ["low", "medium", "high", "veryHigh", "veryHigh"],
  4: ["low", "medium", "high", "high", "veryHigh"],
  3: ["veryLow", "low", "medium", "high", "high"],
  2: ["veryLow", "veryLow", "low", "medium", "medium"],
  1: ["veryLow", "veryLow", "veryLow", "low", "low"],
};

test("the doctrine lookup returns every one of the 25 literal matrix cells", () => {
  const consequences = ["A", "B", "C", "D", "E"];
  for (const likelihood of [5, 4, 3, 2, 1]) {
    for (const [index, consequence] of consequences.entries()) {
      assert.equal(
        riskLevelFor(likelihood, consequence),
        expected[likelihood][index],
        `${consequence}${likelihood}`,
      );
      assert.equal(
        riskIndexFor(likelihood, consequence),
        `${consequence}${likelihood}`,
      );
    }
  }
});

test("authority and elevation use the residual level and configured ceiling", () => {
  assert.match(
    requiredAuthorityFor("medium", DEFAULT_RISK_AUTHORITY_PROFILE),
    /Commanding Officer/,
  );
  assert.equal(
    requiresElevation("medium", DEFAULT_RISK_AUTHORITY_PROFILE),
    false,
  );
  assert.equal(requiresElevation("high", DEFAULT_RISK_AUTHORITY_PROFILE), true);
  assert.equal(
    requiresElevation("veryHigh", DEFAULT_RISK_AUTHORITY_PROFILE),
    true,
  );
});
