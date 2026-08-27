import { signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";
import {
  KIND_RISK_AUTHORITY_PROFILE,
  KIND_RISK_RECORD,
} from "@/shared/constants/kinds";
import {
  parseRiskAuthorityProfile,
  parseRiskRecord,
  type RiskAuthorityProfileV1,
  type RiskRecordV1,
} from "./contracts";

const nowAfter = (prior?: number) =>
  Math.max(Math.floor(Date.now() / 1000), (prior ?? 0) + 1);
let signer = signRelayEvent;

export function setRiskEventSignerForTests(
  replacement: typeof signRelayEvent | undefined,
) {
  signer = replacement ?? signRelayEvent;
}

const tag = (event: RelayEvent, name: string) =>
  event.tags.find((item) => item[0] === name)?.[1];

export async function buildRiskRecordEvent(
  input: RiskRecordV1,
  priorCreatedAt?: number,
) {
  const risk = parseRiskRecord(input);
  const tags = [
    ["d", risk.id],
    ["status", risk.status],
    ["review", risk.reviewDate],
  ];
  if (risk.scope.type !== "ship" && risk.scope.id) {
    tags.push([risk.scope.type, risk.scope.id]);
  }
  if (risk.sourceConstraintId) {
    tags.push(["constraint", risk.sourceConstraintId]);
  }
  return signer({
    kind: KIND_RISK_RECORD,
    content: JSON.stringify(risk),
    createdAt: nowAfter(priorCreatedAt),
    tags,
  });
}

export async function buildRiskAuthorityProfileEvent(
  input: RiskAuthorityProfileV1,
  priorCreatedAt?: number,
) {
  const profile = parseRiskAuthorityProfile(input);
  return signer({
    kind: KIND_RISK_AUTHORITY_PROFILE,
    content: JSON.stringify(profile),
    createdAt: nowAfter(priorCreatedAt),
    tags: [["d", profile.id]],
  });
}

export function parseRelayRiskRecord(event: RelayEvent) {
  if (event.kind !== KIND_RISK_RECORD || !tag(event, "d")) return null;
  try {
    const risk = parseRiskRecord(JSON.parse(event.content));
    const scopeTag = risk.scope.type === "ship" ? undefined : risk.scope.type;
    return risk.id === tag(event, "d") &&
      risk.status === tag(event, "status") &&
      risk.reviewDate === tag(event, "review") &&
      (!scopeTag || risk.scope.id === tag(event, scopeTag)) &&
      (risk.sourceConstraintId ?? undefined) === tag(event, "constraint")
      ? risk
      : null;
  } catch {
    return null;
  }
}

export function parseRelayRiskAuthorityProfile(event: RelayEvent) {
  if (event.kind !== KIND_RISK_AUTHORITY_PROFILE || !tag(event, "d")) {
    return null;
  }
  try {
    const profile = parseRiskAuthorityProfile(JSON.parse(event.content));
    return profile.id === tag(event, "d") ? profile : null;
  } catch {
    return null;
  }
}
