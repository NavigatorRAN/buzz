export const INTERIM_INCIDENT_PLAYBOOK_VERSION =
  "interim-incident-guidance-2026-08-25" as const;

export const INCIDENT_STAGES = Object.freeze([
  "manage",
  "establish",
  "notify",
  "report",
  "manageUpdate",
  "closeLearn",
] as const);

export type IncidentStage = (typeof INCIDENT_STAGES)[number];
export type IncidentStatus = "active" | "closed";
export type IncidentSafetyState = "actionsUnderway" | "confirmed";
export type IncidentActionStatus =
  | "notStarted"
  | "inProgress"
  | "blocked"
  | "complete"
  | "cancelled";
export type IncidentOwnerRole = "CO" | "XO" | "N1" | "Specialist";
export type IncidentFormalReportStatus =
  | "notStarted"
  | "inProgress"
  | "complete"
  | "notRequired";

export type IncidentSafetyV1 = Readonly<{
  state: IncidentSafetyState;
  immediateRisk: string;
  medicalOrWelfareSupport: string;
  workplaceControls: string;
  evidencePreservation: string;
}>;

export type IncidentActionV1 = Readonly<{
  id: string;
  title: string;
  ownerRole: IncidentOwnerRole;
  status: IncidentActionStatus;
  dueAt: string;
  evidence: string | null;
  blocker: string | null;
  updatedAt: string;
}>;

export type IncidentNotificationsV1 = Readonly<{
  commandNotifiedAt: string | null;
  specialists: readonly string[];
  note: string;
}>;

export type IncidentReportingV1 = Readonly<{
  formalReportStatus: IncidentFormalReportStatus;
  note: string;
}>;

export type IncidentReviewV1 = Readonly<{
  id: string;
  reviewedAt: string;
  summary: string;
  decmsUpdated: boolean;
  decmsReference: string | null;
}>;

export type IncidentClosureV1 = Readonly<{
  actionsComplete: boolean;
  outcomesRecorded: boolean;
  partiesAdvised: boolean;
  supportConcluded: boolean;
  handoverComplete: boolean;
  lessonsIdentified: boolean;
  repeatPatternChecked: boolean;
  evidence: string | null;
}>;

export type IncidentControlRecordV1 = Readonly<{
  schemaVersion: 1;
  classification: "OFFICIAL";
  id: string;
  reference: string;
  title: string;
  summary: string;
  status: IncidentStatus;
  stage: IncidentStage;
  playbookVersion: typeof INTERIM_INCIDENT_PLAYBOOK_VERSION;
  occurredAt: string;
  openedAt: string;
  updatedAt: string;
  safety: IncidentSafetyV1;
  facts: readonly string[];
  allegations: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  actions: readonly IncidentActionV1[];
  notifications: IncidentNotificationsV1;
  reporting: IncidentReportingV1;
  lastReviewedAt: string;
  nextReviewAt: string;
  lastDecmsUpdatedAt: string | null;
  decmsReference: string | null;
  reviews: readonly IncidentReviewV1[];
  closure: IncidentClosureV1;
}>;

const ROOT_KEYS = [
  "schemaVersion",
  "classification",
  "id",
  "reference",
  "title",
  "summary",
  "status",
  "stage",
  "playbookVersion",
  "occurredAt",
  "openedAt",
  "updatedAt",
  "safety",
  "facts",
  "allegations",
  "assumptions",
  "unknowns",
  "actions",
  "notifications",
  "reporting",
  "lastReviewedAt",
  "nextReviewAt",
  "lastDecmsUpdatedAt",
  "decmsReference",
  "reviews",
  "closure",
] as const;

function fail(message: string): never {
  throw new Error(`Invalid incident control record: ${message}`);
}

function hasControlCharacter(value: string) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 31 || code === 127)) return true;
  }
  return false;
}

function object(value: unknown, keys: readonly string[], name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key))
  ) {
    fail(`${name} has an unknown or missing field`);
  }
  return record;
}

function text(value: unknown, name: string, maximum = 4096) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value !== value.trim() ||
    new TextEncoder().encode(value).byteLength > maximum ||
    hasControlCharacter(value)
  ) {
    fail(`${name} must be bounded nonempty text`);
  }
  return value;
}

function nullableText(value: unknown, name: string, maximum = 4096) {
  return value === null ? null : text(value, name, maximum);
}

function timestamp(value: unknown, name: string) {
  const result = text(value, name, 64);
  if (
    Number.isNaN(Date.parse(result)) ||
    !/(?:[zZ]|[+-]\d\d:\d\d)$/.test(result)
  ) {
    fail(`${name} must be RFC3339`);
  }
  return result;
}

function nullableTimestamp(value: unknown, name: string) {
  return value === null ? null : timestamp(value, name);
}

function boolean(value: unknown, name: string) {
  return typeof value === "boolean" ? value : fail(`${name} must be boolean`);
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fail(`${name} is invalid`);
}

function textArray(value: unknown, name: string) {
  if (!Array.isArray(value) || value.length > 64) {
    fail(`${name} must be a bounded array`);
  }
  return Object.freeze(
    value.map((item, index) => text(item, `${name}[${index}]`, 2048)),
  );
}

function parseSafety(value: unknown): IncidentSafetyV1 {
  const o = object(
    value,
    [
      "state",
      "immediateRisk",
      "medicalOrWelfareSupport",
      "workplaceControls",
      "evidencePreservation",
    ],
    "safety",
  );
  return Object.freeze({
    state: oneOf(
      o.state,
      ["actionsUnderway", "confirmed"] as const,
      "safety.state",
    ),
    immediateRisk: text(o.immediateRisk, "safety.immediateRisk"),
    medicalOrWelfareSupport: text(
      o.medicalOrWelfareSupport,
      "safety.medicalOrWelfareSupport",
    ),
    workplaceControls: text(o.workplaceControls, "safety.workplaceControls"),
    evidencePreservation: text(
      o.evidencePreservation,
      "safety.evidencePreservation",
    ),
  });
}

function parseAction(value: unknown, index: number): IncidentActionV1 {
  const name = `actions[${index}]`;
  const o = object(
    value,
    [
      "id",
      "title",
      "ownerRole",
      "status",
      "dueAt",
      "evidence",
      "blocker",
      "updatedAt",
    ],
    name,
  );
  const status = oneOf(
    o.status,
    ["notStarted", "inProgress", "blocked", "complete", "cancelled"] as const,
    `${name}.status`,
  );
  const evidence = nullableText(o.evidence, `${name}.evidence`);
  const blocker = nullableText(o.blocker, `${name}.blocker`);
  if (status === "complete" && evidence === null) {
    fail("complete action requires evidence");
  }
  if (status === "blocked" && blocker === null) {
    fail("blocked action requires blocker");
  }
  return Object.freeze({
    id: text(o.id, `${name}.id`, 256),
    title: text(o.title, `${name}.title`, 512),
    ownerRole: oneOf(
      o.ownerRole,
      ["CO", "XO", "N1", "Specialist"] as const,
      `${name}.ownerRole`,
    ),
    status,
    dueAt: timestamp(o.dueAt, `${name}.dueAt`),
    evidence,
    blocker,
    updatedAt: timestamp(o.updatedAt, `${name}.updatedAt`),
  });
}

function parseNotifications(value: unknown): IncidentNotificationsV1 {
  const o = object(
    value,
    ["commandNotifiedAt", "specialists", "note"],
    "notifications",
  );
  return Object.freeze({
    commandNotifiedAt: nullableTimestamp(
      o.commandNotifiedAt,
      "notifications.commandNotifiedAt",
    ),
    specialists: textArray(o.specialists, "notifications.specialists"),
    note: text(o.note, "notifications.note"),
  });
}

function parseReporting(value: unknown): IncidentReportingV1 {
  const o = object(value, ["formalReportStatus", "note"], "reporting");
  return Object.freeze({
    formalReportStatus: oneOf(
      o.formalReportStatus,
      ["notStarted", "inProgress", "complete", "notRequired"] as const,
      "reporting.formalReportStatus",
    ),
    note: text(o.note, "reporting.note"),
  });
}

function parseReview(value: unknown, index: number): IncidentReviewV1 {
  const name = `reviews[${index}]`;
  const o = object(
    value,
    ["id", "reviewedAt", "summary", "decmsUpdated", "decmsReference"],
    name,
  );
  const decmsUpdated = boolean(o.decmsUpdated, `${name}.decmsUpdated`);
  const decmsReference = nullableText(
    o.decmsReference,
    `${name}.decmsReference`,
    512,
  );
  if (decmsUpdated && decmsReference === null) {
    fail("DECMS update requires a reference");
  }
  if (!decmsUpdated && decmsReference !== null) {
    fail("DECMS reference requires a confirmed update");
  }
  return Object.freeze({
    id: text(o.id, `${name}.id`, 256),
    reviewedAt: timestamp(o.reviewedAt, `${name}.reviewedAt`),
    summary: text(o.summary, `${name}.summary`),
    decmsUpdated,
    decmsReference,
  });
}

function parseClosure(value: unknown): IncidentClosureV1 {
  const o = object(
    value,
    [
      "actionsComplete",
      "outcomesRecorded",
      "partiesAdvised",
      "supportConcluded",
      "handoverComplete",
      "lessonsIdentified",
      "repeatPatternChecked",
      "evidence",
    ],
    "closure",
  );
  return Object.freeze({
    actionsComplete: boolean(o.actionsComplete, "closure.actionsComplete"),
    outcomesRecorded: boolean(o.outcomesRecorded, "closure.outcomesRecorded"),
    partiesAdvised: boolean(o.partiesAdvised, "closure.partiesAdvised"),
    supportConcluded: boolean(o.supportConcluded, "closure.supportConcluded"),
    handoverComplete: boolean(o.handoverComplete, "closure.handoverComplete"),
    lessonsIdentified: boolean(
      o.lessonsIdentified,
      "closure.lessonsIdentified",
    ),
    repeatPatternChecked: boolean(
      o.repeatPatternChecked,
      "closure.repeatPatternChecked",
    ),
    evidence: nullableText(o.evidence, "closure.evidence"),
  });
}

function closureComplete(closure: IncidentClosureV1) {
  return (
    closure.actionsComplete &&
    closure.outcomesRecorded &&
    closure.partiesAdvised &&
    closure.supportConcluded &&
    closure.handoverComplete &&
    closure.lessonsIdentified &&
    closure.repeatPatternChecked &&
    closure.evidence !== null
  );
}

/** Parse and freeze the closed version-1 incident record contract. */
export function parseIncidentControlRecord(
  value: unknown,
): IncidentControlRecordV1 {
  const o = object(value, ROOT_KEYS, "incident");
  if (o.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (o.classification !== "OFFICIAL") {
    fail("classification must be OFFICIAL");
  }
  if (o.playbookVersion !== INTERIM_INCIDENT_PLAYBOOK_VERSION) {
    fail("playbookVersion is unsupported");
  }
  if (!Array.isArray(o.actions) || o.actions.length > 256) {
    fail("actions must be a bounded array");
  }
  if (!Array.isArray(o.reviews) || o.reviews.length > 256) {
    fail("reviews must be a bounded array");
  }
  const actions = Object.freeze(o.actions.map(parseAction));
  if (new Set(actions.map((action) => action.id)).size !== actions.length) {
    fail("action ids must be unique");
  }
  const reviews = Object.freeze(o.reviews.map(parseReview));
  if (new Set(reviews.map((review) => review.id)).size !== reviews.length) {
    fail("review ids must be unique");
  }
  if (
    reviews.some(
      (review, index) =>
        index > 0 && review.reviewedAt < reviews[index - 1].reviewedAt,
    )
  ) {
    fail("reviews must be ordered");
  }
  const closure = parseClosure(o.closure);
  const status = oneOf(o.status, ["active", "closed"] as const, "status");
  if (status === "closed" && !closureComplete(closure)) {
    fail("closed incident requires every closure gate and closure evidence");
  }
  const result = Object.freeze({
    schemaVersion: 1 as const,
    classification: "OFFICIAL" as const,
    id: text(o.id, "id", 256),
    reference: text(o.reference, "reference", 256),
    title: text(o.title, "title", 512),
    summary: text(o.summary, "summary"),
    status,
    stage: oneOf(o.stage, INCIDENT_STAGES, "stage"),
    playbookVersion: INTERIM_INCIDENT_PLAYBOOK_VERSION,
    occurredAt: timestamp(o.occurredAt, "occurredAt"),
    openedAt: timestamp(o.openedAt, "openedAt"),
    updatedAt: timestamp(o.updatedAt, "updatedAt"),
    safety: parseSafety(o.safety),
    facts: textArray(o.facts, "facts"),
    allegations: textArray(o.allegations, "allegations"),
    assumptions: textArray(o.assumptions, "assumptions"),
    unknowns: textArray(o.unknowns, "unknowns"),
    actions,
    notifications: parseNotifications(o.notifications),
    reporting: parseReporting(o.reporting),
    lastReviewedAt: timestamp(o.lastReviewedAt, "lastReviewedAt"),
    nextReviewAt: timestamp(o.nextReviewAt, "nextReviewAt"),
    lastDecmsUpdatedAt: nullableTimestamp(
      o.lastDecmsUpdatedAt,
      "lastDecmsUpdatedAt",
    ),
    decmsReference: nullableText(o.decmsReference, "decmsReference", 512),
    reviews,
    closure,
  });
  const latestReview = reviews.at(-1);
  if (latestReview && latestReview.reviewedAt !== result.lastReviewedAt) {
    fail("lastReviewedAt must match the latest review");
  }
  if (result.lastDecmsUpdatedAt === null && result.decmsReference !== null) {
    fail("DECMS reference requires a confirmed update timestamp");
  }
  if (result.nextReviewAt <= result.lastReviewedAt) {
    fail("nextReviewAt must follow lastReviewedAt");
  }
  return result;
}
