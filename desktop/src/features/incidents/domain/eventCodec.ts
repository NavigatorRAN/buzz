import { signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";
import { KIND_INCIDENT_CONTROL_RECORD } from "@/shared/constants/kinds";
import {
  parseIncidentControlRecord,
  type IncidentControlRecordV1,
} from "./contracts.ts";

const nowAfter = (prior?: number) =>
  Math.max(Math.floor(Date.now() / 1000), (prior ?? 0) + 1);

let signer = signRelayEvent;

export function setIncidentEventSignerForTests(
  replacement: typeof signRelayEvent | undefined,
) {
  signer = replacement ?? signRelayEvent;
}

function tag(event: RelayEvent, name: string) {
  return event.tags.find((item) => item[0] === name)?.[1];
}

/** Build the signed owner-authored snapshot for one incident. */
export async function buildIncidentControlEvent(
  input: IncidentControlRecordV1,
  priorCreatedAt?: number,
) {
  const incident = parseIncidentControlRecord(input);
  return signer({
    kind: KIND_INCIDENT_CONTROL_RECORD,
    content: JSON.stringify(incident),
    createdAt: nowAfter(priorCreatedAt),
    tags: [
      ["d", incident.id],
      ["playbook", incident.playbookVersion],
      ["status", incident.status],
    ],
  });
}

/** Decode a relay event only when signed addressing tags agree with content. */
export function parseRelayIncidentControlRecord(event: RelayEvent) {
  if (
    event.kind !== KIND_INCIDENT_CONTROL_RECORD ||
    !tag(event, "d") ||
    !tag(event, "playbook") ||
    !tag(event, "status")
  ) {
    return null;
  }
  try {
    const incident = parseIncidentControlRecord(JSON.parse(event.content));
    return incident.id === tag(event, "d") &&
      incident.playbookVersion === tag(event, "playbook") &&
      incident.status === tag(event, "status")
      ? incident
      : null;
  } catch {
    return null;
  }
}
