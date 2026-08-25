import { relayClient } from "@/shared/api/relayClient";
import type { RelayEvent } from "@/shared/api/types";
import { KIND_INCIDENT_CONTROL_RECORD } from "@/shared/constants/kinds";
import {
  parseIncidentControlRecord,
  type IncidentControlRecordV1,
} from "../domain/contracts.ts";
import {
  buildIncidentControlEvent,
  parseRelayIncidentControlRecord,
} from "../domain/eventCodec.ts";

type IncidentRelay = Pick<typeof relayClient, "fetchEvents" | "publishEvent">;

function incidentId(event: RelayEvent) {
  return event.tags.find((tag) => tag[0] === "d")?.[1];
}

function newestValid(events: readonly RelayEvent[]) {
  const result = new Map<
    string,
    { event: RelayEvent; incident: IncidentControlRecordV1 }
  >();
  for (const event of events) {
    const id = incidentId(event);
    const incident = parseRelayIncidentControlRecord(event);
    if (!id || !incident) continue;
    const prior = result.get(id);
    if (!prior || event.created_at > prior.event.created_at) {
      result.set(id, { event, incident });
    }
  }
  return [...result.values()];
}

/** Fetch the latest valid owner-authored record for each incident. */
export async function fetchIncidents(
  ownerPubkey: string,
  relay: Pick<IncidentRelay, "fetchEvents"> = relayClient,
) {
  const events = await relay.fetchEvents({
    kinds: [KIND_INCIDENT_CONTROL_RECORD],
    authors: [ownerPubkey],
    limit: 2000,
  });
  return Object.freeze(
    newestValid(events)
      .map(({ incident }) => incident)
      .sort(
        (left, right) =>
          right.openedAt.localeCompare(left.openedAt) ||
          left.reference.localeCompare(right.reference),
      ),
  );
}

/** Publish a monotonic replacement without allowing a same-second rollback. */
export async function publishIncident(
  ownerPubkey: string,
  input: IncidentControlRecordV1,
  relay: IncidentRelay = relayClient,
) {
  const incident = parseIncidentControlRecord(input);
  const events = await relay.fetchEvents({
    kinds: [KIND_INCIDENT_CONTROL_RECORD],
    authors: [ownerPubkey],
    limit: 2000,
  });
  const prior = newestValid(events).find(
    ({ incident: candidate }) => candidate.id === incident.id,
  )?.event;
  const event = await buildIncidentControlEvent(incident, prior?.created_at);
  return relay.publishEvent(
    event,
    "Timed out persisting incident control data.",
    "Failed to persist incident control data.",
  );
}
