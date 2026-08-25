import { localDateTimeToRfc3339 } from "@/features/battle-rhythm/domain/dateRange";
import type { IncidentControlRecordV1 } from "./contracts";
import { deriveCombinedIncidentSync } from "./evaluation";

export type IncidentSyncCalendarProjection = Readonly<{
  external_id: "incident-control:combined-sync";
  title: "CO Incident Sync";
  start: string;
  end: string;
  is_all_day: false;
  location: null;
  notes: string;
}>;

/** Project one privacy-minimised timed meeting for every active incident. */
export function projectCombinedIncidentSync(
  incidents: readonly IncidentControlRecordV1[],
  timeZone: string,
): IncidentSyncCalendarProjection | null {
  const sync = deriveCombinedIncidentSync(incidents);
  if (!sync) return null;
  const suffix = sync.activeIncidentCount === 1 ? "incident" : "incidents";
  return Object.freeze({
    external_id: "incident-control:combined-sync",
    title: "CO Incident Sync",
    start: localDateTimeToRfc3339(`${sync.date}T10:00`, timeZone),
    end: localDateTimeToRfc3339(`${sync.date}T10:30`, timeZone),
    is_all_day: false,
    location: null,
    notes: [
      `Private command meeting · ${sync.activeIncidentCount} active ${suffix}`,
      "N1 and XO to provide evidence-backed updates.",
      "Open: /incidents",
    ].join("\n"),
  });
}
