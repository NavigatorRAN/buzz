import { CalendarClock, ChevronRight, ShieldAlert } from "lucide-react";
import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import {
  deriveCombinedIncidentSync,
  deriveIncidentFollowUps,
} from "@/features/incidents/domain/evaluation";
import { displayDate } from "@/features/incidents/ui/incidentPresentation";
import { useIncidentsQuery } from "@/features/incidents/hooks";
import { useIdentityQuery } from "@/shared/api/hooks";

export function IncidentBriefFollowUps() {
  const identity = useIdentityQuery();
  const incidents = useIncidentsQuery(identity.data?.pubkey);
  const navigation = useAppNavigation();
  const records = incidents.data ?? [];
  const active = records.filter((incident) => incident.status === "active");
  const followUps = deriveIncidentFollowUps(records);
  const sync = deriveCombinedIncidentSync(records);

  if (!incidents.isLoading && active.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5"
      data-testid="command-brief-incident-follow-ups"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Incident Control
            </p>
            <h2 className="mt-1 text-base font-semibold">
              CO incident follow-ups
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live control flags, separate from the signed Daily Command Brief.
              No staff message has been sent automatically.
            </p>
          </div>
        </div>
        <button
          className="rounded border border-amber-300/30 px-3 py-2 text-sm text-amber-200"
          onClick={() => void navigation.goIncidents()}
          type="button"
        >
          Open Incident Control <ChevronRight className="ml-1 inline h-4 w-4" />
        </button>
      </div>
      {incidents.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading incident flags…
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-white/10 bg-black/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next combined sync
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-amber-300" />
              {sync ? displayDate(`${sync.date}T00:00:00`) : "Not required"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sync
                ? `N1 and XO update meeting covering all ${sync.activeIncidentCount} active incident${sync.activeIncidentCount === 1 ? "" : "s"}.`
                : "No active incident review is scheduled."}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Updates to chase
              </p>
              <span className="rounded-full bg-amber-300/10 px-2 py-1 text-xs text-amber-200">
                {followUps.length}
              </span>
            </div>
            {followUps.length ? (
              <div className="mt-2 grid gap-2">
                {followUps.slice(0, 4).map((item) => (
                  <button
                    className="flex items-start justify-between gap-3 rounded border border-white/10 p-2 text-left hover:bg-white/5"
                    key={item.id}
                    onClick={() => void navigation.goIncident(item.incidentId)}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.incidentReference} · Ask {item.responsibleRole}
                      </span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
                {followUps.length > 4 ? (
                  <p className="text-xs text-muted-foreground">
                    +{followUps.length - 4} more in Incident Control
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No missing, overdue, or insufficient updates are flagged.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
