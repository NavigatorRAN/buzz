export type RiskDomain =
  | "mission"
  | "personnel"
  | "capability"
  | "reputation"
  | "environment";
export type RiskScopeType =
  | "ship"
  | "operation"
  | "project"
  | "activity"
  | "task";
export type RiskLikelihood = 1 | 2 | 3 | 4 | 5;
export type RiskConsequence = "A" | "B" | "C" | "D" | "E";
export type RiskLevel = "veryLow" | "low" | "medium" | "high" | "veryHigh";
export type RiskControlStatus =
  | "planned"
  | "inProgress"
  | "implemented"
  | "ineffective";
export type ResidualAssessmentState = "projected" | "validated";
export type RiskStatus =
  | "open"
  | "treating"
  | "controlled"
  | "accepted"
  | "elevated"
  | "closed";
export type RiskAcceptanceState =
  | "notAccepted"
  | "accepted"
  | "elevationRequired"
  | "elevated";
export type PsychosocialReviewState =
  | "notIndicated"
  | "consideration"
  | "material";
export type PsychosocialHazard =
  | "jobDemands"
  | "lowJobControl"
  | "poorSupport"
  | "lackOfRoleClarity"
  | "poorOrganisationalChangeManagement"
  | "inadequateRewardAndRecognition"
  | "poorOrganisationalJustice"
  | "traumaticEventsOrMaterial"
  | "remoteOrIsolatedWork"
  | "poorPhysicalEnvironment"
  | "harmfulBehaviours";
export type PsychosocialExposure = Readonly<{
  frequency: "isolated" | "repeated" | "ongoing";
  duration: "brief" | "extended" | "prolonged";
  severity: "low" | "moderate" | "high";
}>;
export type PsychosocialReview = Readonly<{
  state: PsychosocialReviewState;
  hazards: readonly PsychosocialHazard[];
  exposure: PsychosocialExposure | null;
  basis: string | null;
  linkedRiskId: string | null;
  reviewedAt: string | null;
}>;

export type RiskAssessment = Readonly<{
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
}>;

export type RiskControl = Readonly<{
  id: string;
  description: string;
  owner: string;
  status: RiskControlStatus;
  linkedTaskId: string | null;
  dueDate: string | null;
  effectiveness: string | null;
}>;

export type RiskRecordV1 = Readonly<{
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  consequenceDescription: string;
  domain: RiskDomain;
  operationalTags: readonly string[];
  owner: string;
  scope: Readonly<{ type: RiskScopeType; id: string | null; label: string }>;
  inherentAssessment: RiskAssessment;
  controls: readonly RiskControl[];
  residualAssessment: Readonly<
    RiskAssessment & { basis: string; state: ResidualAssessmentState }
  >;
  status: RiskStatus;
  reviewDate: string;
  acceptance: Readonly<{
    state: RiskAcceptanceState;
    authority: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
    direction: string | null;
  }>;
  psychosocialReview: PsychosocialReview;
  sourceEvidence: string | null;
  sourceConstraintId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type RiskAuthorityProfileV1 = Readonly<{
  schemaVersion: 1;
  id: string;
  title: string;
  localAcceptanceCeiling: RiskLevel;
  authorities: Readonly<Record<RiskLevel, string>>;
  reviewCadenceDays: Readonly<Record<RiskLevel, number>>;
  source: string;
  updatedAt: string;
}>;

const domains = new Set<RiskDomain>([
  "mission",
  "personnel",
  "capability",
  "reputation",
  "environment",
]);
const scopes = new Set<RiskScopeType>([
  "ship",
  "operation",
  "project",
  "activity",
  "task",
]);
const likelihoods = new Set<RiskLikelihood>([1, 2, 3, 4, 5]);
const consequences = new Set<RiskConsequence>(["A", "B", "C", "D", "E"]);
const levels = new Set<RiskLevel>([
  "veryLow",
  "low",
  "medium",
  "high",
  "veryHigh",
]);
const controlStatuses = new Set<RiskControlStatus>([
  "planned",
  "inProgress",
  "implemented",
  "ineffective",
]);
const residualStates = new Set<ResidualAssessmentState>([
  "projected",
  "validated",
]);
const statuses = new Set<RiskStatus>([
  "open",
  "treating",
  "controlled",
  "accepted",
  "elevated",
  "closed",
]);
const acceptanceStates = new Set<RiskAcceptanceState>([
  "notAccepted",
  "accepted",
  "elevationRequired",
  "elevated",
]);
const psychosocialReviewStates = new Set<PsychosocialReviewState>([
  "notIndicated",
  "consideration",
  "material",
]);
const psychosocialHazards = new Set<PsychosocialHazard>([
  "jobDemands",
  "lowJobControl",
  "poorSupport",
  "lackOfRoleClarity",
  "poorOrganisationalChangeManagement",
  "inadequateRewardAndRecognition",
  "poorOrganisationalJustice",
  "traumaticEventsOrMaterial",
  "remoteOrIsolatedWork",
  "poorPhysicalEnvironment",
  "harmfulBehaviours",
]);
const exposureFrequencies = new Set<PsychosocialExposure["frequency"]>([
  "isolated",
  "repeated",
  "ongoing",
]);
const exposureDurations = new Set<PsychosocialExposure["duration"]>([
  "brief",
  "extended",
  "prolonged",
]);
const exposureSeverities = new Set<PsychosocialExposure["severity"]>([
  "low",
  "moderate",
  "high",
]);
const levelKeys = ["veryLow", "low", "medium", "high", "veryHigh"] as const;

function fail(message: string): never {
  throw new Error(`Invalid risk contract: ${message}`);
}
function object(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("object required");
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key))
  )
    fail("unknown or missing field");
  return record;
}
function one(value: unknown): 1 {
  return value === 1 ? 1 : fail("schemaVersion must be 1");
}
function text(value: unknown, name: string, max = 8192) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${name} must be bounded nonempty text`);
  return value;
}
function nullableText(value: unknown, name: string) {
  return value === null ? null : text(value, name);
}
function enumValue<T extends string | number>(
  value: unknown,
  values: ReadonlySet<T>,
  name: string,
): T {
  if (!values.has(value as T)) fail(`invalid ${name}`);
  return value as T;
}
function date(value: unknown, name: string) {
  const parsed = text(value, name, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(parsed) ||
    Number.isNaN(Date.parse(`${parsed}T00:00:00Z`))
  )
    fail(`${name} must be YYYY-MM-DD`);
  return parsed;
}
function nullableDate(value: unknown, name: string) {
  return value === null ? null : date(value, name);
}
function timestamp(value: unknown, name: string) {
  const parsed = text(value, name, 64);
  if (Number.isNaN(Date.parse(parsed)) || !/[zZ]|[+-]\d\d:\d\d$/.test(parsed))
    fail(`${name} must be RFC3339`);
  return parsed;
}
function nullableTimestamp(value: unknown, name: string) {
  return value === null ? null : timestamp(value, name);
}
function strings(value: unknown, name: string, maxItems = 64) {
  if (!Array.isArray(value) || value.length > maxItems)
    fail(`${name} must be bounded text array`);
  return Object.freeze(value.map((item) => text(item, name, 512)));
}
function assessment(value: unknown, residual = false) {
  const keys = residual
    ? ["likelihood", "consequence", "basis", "state"]
    : ["likelihood", "consequence"];
  const o = object(value, keys);
  const base = {
    likelihood: enumValue(o.likelihood, likelihoods, "likelihood"),
    consequence: enumValue(o.consequence, consequences, "consequence"),
  };
  return Object.freeze(
    residual
      ? {
          ...base,
          basis: text(o.basis, "residual basis"),
          state: enumValue(o.state, residualStates, "residual state"),
        }
      : base,
  );
}
function parseControl(value: unknown): RiskControl {
  const o = object(value, [
    "id",
    "description",
    "owner",
    "status",
    "linkedTaskId",
    "dueDate",
    "effectiveness",
  ]);
  return Object.freeze({
    id: text(o.id, "control id", 256),
    description: text(o.description, "control description"),
    owner: text(o.owner, "control owner", 512),
    status: enumValue(o.status, controlStatuses, "control status"),
    linkedTaskId: nullableText(o.linkedTaskId, "linkedTaskId"),
    dueDate: nullableDate(o.dueDate, "control dueDate"),
    effectiveness: nullableText(o.effectiveness, "control effectiveness"),
  });
}

function parsePsychosocialReview(value: unknown): PsychosocialReview {
  const o = object(value, [
    "state",
    "hazards",
    "exposure",
    "basis",
    "linkedRiskId",
    "reviewedAt",
  ]);
  const state = enumValue(
    o.state,
    psychosocialReviewStates,
    "psychosocial review state",
  );
  if (!Array.isArray(o.hazards) || o.hazards.length > 11)
    fail("psychosocial hazards must be a bounded array");
  const hazards = Object.freeze(
    o.hazards.map((hazard) =>
      enumValue(hazard, psychosocialHazards, "psychosocial hazard"),
    ),
  );
  if (new Set(hazards).size !== hazards.length)
    fail("psychosocial hazards must be unique");

  const exposure =
    o.exposure === null
      ? null
      : (() => {
          const e = object(o.exposure, ["frequency", "duration", "severity"]);
          return Object.freeze({
            frequency: enumValue(
              e.frequency,
              exposureFrequencies,
              "psychosocial exposure frequency",
            ),
            duration: enumValue(
              e.duration,
              exposureDurations,
              "psychosocial exposure duration",
            ),
            severity: enumValue(
              e.severity,
              exposureSeverities,
              "psychosocial exposure severity",
            ),
          });
        })();
  const basis = nullableText(o.basis, "psychosocial review basis");
  const linkedRiskId = nullableText(
    o.linkedRiskId,
    "psychosocial linked risk id",
  );
  const reviewedAt = nullableTimestamp(o.reviewedAt, "psychosocial reviewedAt");

  if (state === "notIndicated") {
    if (hazards.length || exposure || linkedRiskId)
      fail(
        "not indicated psychosocial review cannot carry hazards, exposure, or linked risk",
      );
  } else if (!hazards.length || !exposure || !basis || !reviewedAt) {
    fail(
      "psychosocial consideration or material review requires hazards, exposure, basis, and reviewedAt",
    );
  }
  if (linkedRiskId && state !== "material")
    fail("psychosocial linked risk is only valid for material review");

  return Object.freeze({
    state,
    hazards,
    exposure,
    basis,
    linkedRiskId,
    reviewedAt,
  });
}

export function parseRiskRecord(value: unknown): RiskRecordV1 {
  const o = object(value, [
    "schemaVersion",
    "id",
    "title",
    "description",
    "consequenceDescription",
    "domain",
    "operationalTags",
    "owner",
    "scope",
    "inherentAssessment",
    "controls",
    "residualAssessment",
    "status",
    "reviewDate",
    "acceptance",
    "psychosocialReview",
    "sourceEvidence",
    "sourceConstraintId",
    "createdAt",
    "updatedAt",
  ]);
  const scope = object(o.scope, ["type", "id", "label"]);
  const scopeType = enumValue(scope.type, scopes, "scope type");
  const scopeId = nullableText(scope.id, "scope id");
  if (
    (scopeType === "ship" && scopeId !== null) ||
    (scopeType !== "ship" && scopeId === null)
  )
    fail("scope id must match scope type");
  if (!Array.isArray(o.controls) || o.controls.length > 64)
    fail("controls must be bounded array");
  const controls = Object.freeze(o.controls.map(parseControl));
  if (new Set(controls.map((control) => control.id)).size !== controls.length)
    fail("control ids must be unique");
  const residual = assessment(
    o.residualAssessment,
    true,
  ) as RiskRecordV1["residualAssessment"];
  if (residual.state === "validated") {
    if (
      !controls.length ||
      controls.some((control) => control.status !== "implemented")
    )
      fail("validated residual risk requires implemented controls");
    if (controls.some((control) => !control.effectiveness?.trim()))
      fail("validated residual risk requires control effectiveness");
  }
  const status = enumValue(o.status, statuses, "risk status");
  if (["controlled", "accepted"].includes(status) && controls.length === 0)
    fail(`${status} risk requires controls`);
  const acceptance = object(o.acceptance, [
    "state",
    "authority",
    "decidedBy",
    "decidedAt",
    "direction",
  ]);
  const acceptanceState = enumValue(
    acceptance.state,
    acceptanceStates,
    "acceptance state",
  );
  const parsedAcceptance = Object.freeze({
    state: acceptanceState,
    authority: nullableText(acceptance.authority, "acceptance authority"),
    decidedBy: nullableText(acceptance.decidedBy, "decidedBy"),
    decidedAt: nullableTimestamp(acceptance.decidedAt, "decidedAt"),
    direction: nullableText(acceptance.direction, "direction"),
  });
  if (["accepted", "elevated"].includes(acceptanceState)) {
    if (
      !parsedAcceptance.authority ||
      !parsedAcceptance.decidedBy ||
      !parsedAcceptance.decidedAt ||
      !parsedAcceptance.direction
    )
      fail("accepted or elevated risk requires a complete human decision");
  }
  if (
    (status === "accepted" && acceptanceState !== "accepted") ||
    (status === "elevated" && acceptanceState !== "elevated")
  )
    fail("risk status and decision state must agree");
  if (status === "closed" && !parsedAcceptance.direction)
    fail("closed risk requires command direction");
  return Object.freeze({
    schemaVersion: one(o.schemaVersion),
    id: text(o.id, "id", 256),
    title: text(o.title, "title", 512),
    description: text(o.description, "description"),
    consequenceDescription: text(
      o.consequenceDescription,
      "consequenceDescription",
    ),
    domain: enumValue(o.domain, domains, "risk domain"),
    operationalTags: strings(o.operationalTags, "operationalTags"),
    owner: text(o.owner, "owner", 512),
    scope: Object.freeze({
      type: scopeType,
      id: scopeId,
      label: text(scope.label, "scope label", 512),
    }),
    inherentAssessment: assessment(o.inherentAssessment) as RiskAssessment,
    controls,
    residualAssessment: residual,
    status,
    reviewDate: date(o.reviewDate, "reviewDate"),
    acceptance: parsedAcceptance,
    psychosocialReview: parsePsychosocialReview(o.psychosocialReview),
    sourceEvidence: nullableText(o.sourceEvidence, "sourceEvidence"),
    sourceConstraintId: nullableText(
      o.sourceConstraintId,
      "sourceConstraintId",
    ),
    createdAt: timestamp(o.createdAt, "createdAt"),
    updatedAt: timestamp(o.updatedAt, "updatedAt"),
  });
}

function parseLevelRecord(value: unknown, name: string, numberValues: boolean) {
  const o = object(value, levelKeys);
  return Object.freeze(
    Object.fromEntries(
      levelKeys.map((level) => {
        if (numberValues) {
          if (
            !Number.isInteger(o[level]) ||
            Number(o[level]) < 1 ||
            Number(o[level]) > 3650
          )
            fail(`${name}.${level} must be a positive bounded integer`);
          return [level, Number(o[level])];
        }
        return [level, text(o[level], `${name}.${level}`, 1024)];
      }),
    ),
  ) as Record<RiskLevel, never>;
}

export function parseRiskAuthorityProfile(
  value: unknown,
): RiskAuthorityProfileV1 {
  const o = object(value, [
    "schemaVersion",
    "id",
    "title",
    "localAcceptanceCeiling",
    "authorities",
    "reviewCadenceDays",
    "source",
    "updatedAt",
  ]);
  return Object.freeze({
    schemaVersion: one(o.schemaVersion),
    id: text(o.id, "id", 256),
    title: text(o.title, "title", 512),
    localAcceptanceCeiling: enumValue(
      o.localAcceptanceCeiling,
      levels,
      "local acceptance ceiling",
    ),
    authorities: parseLevelRecord(
      o.authorities,
      "authorities",
      false,
    ) as Record<RiskLevel, string>,
    reviewCadenceDays: parseLevelRecord(
      o.reviewCadenceDays,
      "reviewCadenceDays",
      true,
    ) as Record<RiskLevel, number>,
    source: text(o.source, "source", 2048),
    updatedAt: timestamp(o.updatedAt, "updatedAt"),
  });
}
