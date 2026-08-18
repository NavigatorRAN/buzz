import { relayClient } from "@/shared/api/relayClient";
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
} from "../domain/contracts";
import {
  buildRiskAuthorityProfileEvent,
  buildRiskRecordEvent,
  parseRelayRiskAuthorityProfile,
  parseRelayRiskRecord,
} from "../domain/eventCodec";

type Relay = Pick<typeof relayClient, "fetchEvents" | "publishEvent">;

function newest(events: readonly RelayEvent[]) {
  const result = new Map<string, RelayEvent>();
  for (const event of events) {
    const id = event.tags.find((item) => item[0] === "d")?.[1];
    if (!id) continue;
    const prior = result.get(id);
    if (!prior || event.created_at > prior.created_at) result.set(id, event);
  }
  return [...result.values()];
}

async function priorHead(
  ownerPubkey: string,
  kind: number,
  id: string,
  relay: Relay,
) {
  const events = await relay.fetchEvents({
    kinds: [kind],
    authors: [ownerPubkey],
    limit: kind === KIND_RISK_RECORD ? 5000 : 50,
  });
  return newest(events).find((event) =>
    event.tags.some((item) => item[0] === "d" && item[1] === id),
  );
}

async function publish(relay: Relay, event: RelayEvent) {
  return relay.publishEvent(
    event,
    "Timed out persisting risk data.",
    "Failed to persist risk data.",
  );
}

export async function fetchRiskRegister(
  ownerPubkey: string,
  relay: Pick<Relay, "fetchEvents"> = relayClient,
) {
  const [riskEvents, profileEvents] = await Promise.all([
    relay.fetchEvents({
      kinds: [KIND_RISK_RECORD],
      authors: [ownerPubkey],
      limit: 5000,
    }),
    relay.fetchEvents({
      kinds: [KIND_RISK_AUTHORITY_PROFILE],
      authors: [ownerPubkey],
      limit: 50,
    }),
  ]);
  const risks = newest(riskEvents)
    .map(parseRelayRiskRecord)
    .filter((risk): risk is RiskRecordV1 => risk !== null);
  const profiles = newest(profileEvents)
    .sort((a, b) => b.created_at - a.created_at)
    .map(parseRelayRiskAuthorityProfile)
    .filter((profile): profile is RiskAuthorityProfileV1 => profile !== null);
  return Object.freeze({
    risks: Object.freeze(risks),
    authorityProfile: profiles[0] ?? null,
  });
}

export async function publishRiskRecord(
  ownerPubkey: string,
  input: RiskRecordV1,
  relay: Relay = relayClient,
) {
  const risk = parseRiskRecord(input);
  const prior = await priorHead(ownerPubkey, KIND_RISK_RECORD, risk.id, relay);
  return publish(relay, await buildRiskRecordEvent(risk, prior?.created_at));
}

export async function publishRiskAuthorityProfile(
  ownerPubkey: string,
  input: RiskAuthorityProfileV1,
  relay: Relay = relayClient,
) {
  const profile = parseRiskAuthorityProfile(input);
  const prior = await priorHead(
    ownerPubkey,
    KIND_RISK_AUTHORITY_PROFILE,
    profile.id,
    relay,
  );
  return publish(
    relay,
    await buildRiskAuthorityProfileEvent(profile, prior?.created_at),
  );
}
