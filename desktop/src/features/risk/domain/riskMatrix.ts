import type {
  RiskAuthorityProfileV1,
  RiskConsequence,
  RiskLevel,
  RiskLikelihood,
} from "./contracts";

export const RISK_LEVELS = [
  "veryLow",
  "low",
  "medium",
  "high",
  "veryHigh",
] as const satisfies readonly RiskLevel[];

export const RISK_LIKELIHOODS = [
  5, 4, 3, 2, 1,
] as const satisfies readonly RiskLikelihood[];
export const RISK_CONSEQUENCES = [
  "A",
  "B",
  "C",
  "D",
  "E",
] as const satisfies readonly RiskConsequence[];

const MATRIX: Readonly<Record<RiskLikelihood, readonly RiskLevel[]>> = {
  5: ["low", "medium", "high", "veryHigh", "veryHigh"],
  4: ["low", "medium", "high", "high", "veryHigh"],
  3: ["veryLow", "low", "medium", "high", "high"],
  2: ["veryLow", "veryLow", "low", "medium", "medium"],
  1: ["veryLow", "veryLow", "veryLow", "low", "low"],
};

const consequenceIndex: Readonly<Record<RiskConsequence, number>> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

export const DEFAULT_RISK_AUTHORITY_PROFILE: RiskAuthorityProfileV1 =
  Object.freeze({
    schemaVersion: 1,
    id: "adfp-default",
    title: "ADF operational risk authority",
    localAcceptanceCeiling: "medium",
    authorities: Object.freeze({
      veryLow: "Team Leader APS4-6 / Corporal-O3",
      low: "O3-O4 / Deputy Director / EL1",
      medium:
        "Commanding Officer / independent Officer Commanding / Director EL2 / O4-O6",
      high: "Functional or Formation Commander / CJTF / 1-2 Star / SES Band 1-2",
      veryHigh: "Secretary / CDF / Chief of Service / CJOPS / CJC / Group Head",
    }),
    reviewCadenceDays: Object.freeze({
      veryLow: 90,
      low: 30,
      medium: 7,
      high: 1,
      veryHigh: 1,
    }),
    source: "ADFP 5.0.1 Annex 1C Table 1C.5",
    updatedAt: "2026-08-19T00:00:00Z",
  });

export function riskIndexFor(
  likelihood: RiskLikelihood,
  consequence: RiskConsequence,
) {
  return `${consequence}${likelihood}`;
}

export function riskLevelFor(
  likelihood: RiskLikelihood,
  consequence: RiskConsequence,
): RiskLevel {
  return MATRIX[likelihood][consequenceIndex[consequence]];
}

export function requiredAuthorityFor(
  level: RiskLevel,
  profile: RiskAuthorityProfileV1,
) {
  return profile.authorities[level];
}

export function requiresElevation(
  level: RiskLevel,
  profile: RiskAuthorityProfileV1,
) {
  return (
    RISK_LEVELS.indexOf(level) >
    RISK_LEVELS.indexOf(profile.localAcceptanceCeiling)
  );
}
