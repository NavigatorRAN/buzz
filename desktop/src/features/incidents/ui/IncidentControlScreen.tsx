import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import { useIdentityQuery } from "@/shared/api/hooks";
import { useIncidentMutations, useIncidentsQuery } from "../hooks";
import {
  deriveCombinedIncidentSync,
  deriveIncidentFollowUps,
  type IncidentFollowUpPriority,
} from "../domain/evaluation";
import type { IncidentControlRecordV1 } from "../domain/contracts";
import { CombinedSyncDialog } from "./CombinedSyncDialog";
import { StartIncidentDialog } from "./StartIncidentDialog";
import {
  displayDate,
  displayDateTime,
  openActionCount,
  STAGE_LABELS,
} from "./incidentPresentation";

const priorityClass: Record<IncidentFollowUpPriority, string> = {
  critical: "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300",
  high: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  medium: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300",
};

export function IncidentControlScreen() {
  const identity = useIdentityQuery();
  const incidents = useIncidentsQuery(identity.data?.pubkey);
  const mutations = useIncidentMutations(identity.data?.pubkey ?? "");
  const navigation = useAppNavigation();
  const [startOpen, setStartOpen] = React.useState(false);
  const [syncOpen, setSyncOpen] = React.useState(false);
  const records = incidents.data ?? [];
  const active = records.filter((incident) => incident.status === "active");
  const followUps = deriveIncidentFollowUps(records);
  const sync = deriveCombinedIncidentSync(records);

  async function create(incident: IncidentControlRecordV1) {
    await mutations.incident.mutateAsync(incident);
    await navigation.goIncident(incident.id);
  }

  return (
    <main
      className="min-h-0 flex-1 overflow-auto p-6"
      data-testid="incident-control-screen"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              CO-owned control
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <ShieldAlert className="h-6 w-6 text-primary" /> Incident Control
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Make the situation safe, start the live plan, and flag only the
              updates you need from XO, N1, and specialists.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {active.length ? (
              <button
                className="rounded border bg-background px-3 py-2 text-sm"
                onClick={() => setSyncOpen(true)}
                type="button"
              >
                <Users className="mr-1 inline h-4 w-4" /> Record combined sync
              </button>
            ) : null}
            <button
              className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
              data-testid="start-incident"
              onClick={() => setStartOpen(true)}
              type="button"
            >
              <Plus className="mr-1 inline h-4 w-4" /> Start incident
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <SummaryCard
            icon={ShieldAlert}
            label="Active incidents"
            value={String(active.length)}
            detail="CO retains ownership"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Follow-ups flagged"
            value={String(followUps.length)}
            detail={followUps.length ? "Action required" : "No missing updates"}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Combined sync"
            value={sync ? displayDate(`${sync.date}T00:00:00`) : "Not required"}
            detail={
              sync
                ? `${sync.activeIncidentCount} active incident${sync.activeIncidentCount === 1 ? "" : "s"}`
                : "Created when an incident starts"
            }
          />
        </section>

        {sync ? (
          <section
            className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
            data-testid="combined-sync-card"
          >
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">
                  Next combined CO incident sync
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {displayDate(`${sync.date}T00:00:00`)} — driven by the
                  earliest review date and covering all{" "}
                  {sync.activeIncidentCount} active incident
                  {sync.activeIncidentCount === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
            <button
              className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => setSyncOpen(true)}
              type="button"
            >
              Record meeting outcome
            </button>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Active incident plans
                </h2>
                <p className="text-xs text-muted-foreground">
                  Six-stage interim playbook; ready to version against the ADF
                  playbook later.
                </p>
              </div>
            </div>
            {incidents.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Loading incident control…
              </p>
            ) : active.length ? (
              <div className="mt-3 grid gap-3">
                {active.map((incident) => (
                  <IncidentCard
                    incident={incident}
                    key={incident.id}
                    onOpen={() => void navigation.goIncident(incident.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState onStart={() => setStartOpen(true)} />
            )}
          </section>

          <section>
            <div>
              <h2 className="text-base font-semibold">CO follow-up queue</h2>
              <p className="text-xs text-muted-foreground">
                Flags only. Command Adviser will not message staff
                automatically.
              </p>
            </div>
            {followUps.length ? (
              <div
                className="mt-3 grid gap-2"
                data-testid="incident-follow-ups"
              >
                {followUps.map((item) => (
                  <button
                    className={`rounded-lg border p-3 text-left ${priorityClass[item.priority]}`}
                    key={item.id}
                    onClick={() => void navigation.goIncident(item.incidentId)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          {item.incidentReference} · {item.responsibleRole}
                        </p>
                        <p className="mt-1 text-sm font-medium">{item.title}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </div>
                    <p className="mt-1 text-xs opacity-80">{item.reason}</p>
                    {item.dueAt ? (
                      <p className="mt-2 text-xs font-medium">
                        Due {displayDateTime(item.dueAt)}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed p-5 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-2 text-sm font-medium">
                  No follow-ups flagged
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is not a statement that an incident is closed.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
      <StartIncidentDialog
        onCreate={create}
        onOpenChange={setStartOpen}
        open={startOpen}
      />
      <CombinedSyncDialog
        incidents={records}
        onOpenChange={setSyncOpen}
        onPublish={(incident) =>
          mutations.incident.mutateAsync(incident).then(() => undefined)
        }
        open={syncOpen}
      />
    </main>
  );
}

function SummaryCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </article>
  );
}

function IncidentCard({
  incident,
  onOpen,
}: {
  incident: IncidentControlRecordV1;
  onOpen: () => void;
}) {
  const stageIndex = Object.keys(STAGE_LABELS).indexOf(incident.stage);
  return (
    <button
      className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50"
      data-testid={`incident-card-${incident.id}`}
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {incident.reference}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold">
            {incident.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {incident.summary}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
      <div
        className="mt-4 grid grid-cols-6 gap-1"
        aria-label={`Stage ${STAGE_LABELS[incident.stage]}`}
        aria-valuemax={6}
        aria-valuemin={1}
        aria-valuenow={stageIndex + 1}
        role="progressbar"
      >
        {Object.keys(STAGE_LABELS).map((stage, index) => (
          <span
            className={`h-1.5 rounded-full ${index <= stageIndex ? "bg-primary" : "bg-muted"}`}
            key={stage}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span
          className={
            incident.safety.state === "confirmed"
              ? "text-emerald-600"
              : "text-amber-600"
          }
        >
          {incident.safety.state === "confirmed"
            ? "Safety confirmed"
            : "Safety actions underway"}
        </span>
        <span>{STAGE_LABELS[incident.stage]}</span>
        <span>{openActionCount(incident)} open actions</span>
        <span>Review {displayDate(incident.nextReviewAt)}</span>
      </div>
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed p-8 text-center">
      <ClipboardCheck className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-3 text-base font-medium">No active incident plans</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        When an incident occurs, first make the situation safe. Then start the
        CO-owned plan here.
      </p>
      <button
        className="mt-4 rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
        onClick={onStart}
        type="button"
      >
        <Plus className="mr-1 inline h-4 w-4" /> Start first incident
      </button>
    </div>
  );
}
