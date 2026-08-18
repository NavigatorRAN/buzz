import type { RiskAuthorityProfileV1, RiskRecordV1 } from "./contracts";

export const riskRecord: RiskRecordV1 = {
  schemaVersion: 1,
  id: "risk-davit",
  title: "Seaboat davit unavailable",
  description: "The port seaboat davit cannot launch the assigned boat.",
  consequenceDescription:
    "The mission may lose its assigned seaboat capability.",
  domain: "capability",
  operationalTags: ["MEO", "seaboat"],
  owner: "Marine Engineering Officer",
  scope: {
    type: "project",
    id: "deployment-1",
    label: "Regional deployment",
  },
  inherentAssessment: { likelihood: 4, consequence: "D" },
  controls: [
    {
      id: "repair",
      description: "Repair and function-test the davit.",
      owner: "MEO",
      status: "inProgress",
      linkedTaskId: "repair-davit",
      dueDate: "2026-08-24",
      effectiveness: null,
    },
  ],
  residualAssessment: {
    likelihood: 2,
    consequence: "D",
    basis: "Projected after repair and operational test.",
    state: "projected",
  },
  status: "treating",
  reviewDate: "2026-08-25",
  acceptance: {
    state: "notAccepted",
    authority: null,
    decidedBy: null,
    decidedAt: null,
    direction: null,
  },
  sourceEvidence: "Defect list 42",
  sourceConstraintId: "constraint-1",
  createdAt: "2026-08-19T00:00:00Z",
  updatedAt: "2026-08-19T00:00:00Z",
};

export const authorityProfile: RiskAuthorityProfileV1 = {
  schemaVersion: 1,
  id: "adfp-default",
  title: "ADF operational risk authority",
  localAcceptanceCeiling: "medium",
  authorities: {
    veryLow: "Team Leader APS4-6 / Corporal-O3",
    low: "O3-O4 / Deputy Director / EL1",
    medium:
      "Commanding Officer / independent Officer Commanding / Director EL2 / O4-O6",
    high: "Functional or Formation Commander / CJTF / 1-2 Star / SES Band 1-2",
    veryHigh: "Secretary / CDF / Chief of Service / CJOPS / CJC / Group Head",
  },
  reviewCadenceDays: {
    veryLow: 90,
    low: 30,
    medium: 7,
    high: 1,
    veryHigh: 1,
  },
  source: "ADFP 5.0.1 Annex 1C Table 1C.5",
  updatedAt: "2026-08-19T00:00:00Z",
};
