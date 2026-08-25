import * as React from "react";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  Plus,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import { useIdentityQuery } from "@/shared/api/hooks";
import {
  INCIDENT_STAGES,
  parseIncidentControlRecord,
  type IncidentActionV1,
  type IncidentControlRecordV1,
  type IncidentFormalReportStatus,
} from "../domain/contracts";
import { deriveIncidentFollowUps } from "../domain/evaluation";
import { useIncidentMutations, useIncidentsQuery } from "../hooks";
import { IncidentActionDialog } from "./IncidentActionDialog";
import {
  ACTION_STATUS_LABELS,
  displayDateTime,
  STAGE_LABELS,
} from "./incidentPresentation";

export function IncidentDetailScreen({ incidentId }: { incidentId: string }) {
  const identity = useIdentityQuery();
  const incidents = useIncidentsQuery(identity.data?.pubkey);
  const mutations = useIncidentMutations(identity.data?.pubkey ?? "");
  const navigation = useAppNavigation();
  const incident = incidents.data?.find((item) => item.id === incidentId);
  const [actionOpen, setActionOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] =
    React.useState<IncidentActionV1>();

  async function publish(next: IncidentControlRecordV1, message: string) {
    try {
      await mutations.incident.mutateAsync(next);
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update incident",
      );
      throw error;
    }
  }

  if (incidents.isLoading) {
    return (
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <p className="text-sm text-muted-foreground">Loading incident plan…</p>
      </main>
    );
  }
  if (!incident) {
    return (
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <button
          className="text-sm text-primary"
          onClick={() => void navigation.goIncidents()}
          type="button"
        >
          <ArrowLeft className="mr-1 inline h-4 w-4" /> Incident Control
        </button>
        <p className="mt-6 text-sm text-muted-foreground">
          Incident record not found.
        </p>
      </main>
    );
  }
  const currentIncident = incident;

  const followUps = deriveIncidentFollowUps([incident]);
  const stageIndex = INCIDENT_STAGES.indexOf(incident.stage);

  async function update(
    changes: Partial<IncidentControlRecordV1>,
    message: string,
  ) {
    const next = parseIncidentControlRecord({
      ...currentIncident,
      ...changes,
      updatedAt: new Date().toISOString(),
    });
    await publish(next, message);
  }

  async function saveAction(action: IncidentActionV1) {
    const exists = currentIncident.actions.some(
      (item) => item.id === action.id,
    );
    await update(
      {
        actions: exists
          ? currentIncident.actions.map((item) =>
              item.id === action.id ? action : item,
            )
          : [...currentIncident.actions, action],
      },
      exists ? "Follow-up action updated" : "Follow-up action added",
    );
  }

  return (
    <main
      className="min-h-0 flex-1 overflow-auto p-6"
      data-testid="incident-detail-screen"
    >
      <div className="mx-auto max-w-6xl">
        <button
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => void navigation.goIncidents()}
          type="button"
        >
          <ArrowLeft className="mr-1 inline h-4 w-4" /> Incident Control
        </button>
        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {incident.reference}
              </p>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                OFFICIAL
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs ${incident.status === "active" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
              >
                {incident.status}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{incident.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {incident.summary}
            </p>
          </div>
          <button
            className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => {
              setSelectedAction(undefined);
              setActionOpen(true);
            }}
            type="button"
          >
            <Plus className="mr-1 inline h-4 w-4" /> Add follow-up
          </button>
        </header>

        <section className="mt-6 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Incident playbook</h2>
              <p className="text-xs text-muted-foreground">
                Interim guidance v1 · select a completed stage as the current
                position
              </p>
            </div>
            <span className="text-xs font-medium text-primary">
              {STAGE_LABELS[incident.stage]}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {INCIDENT_STAGES.map((stage, index) => (
              <button
                className={`rounded-lg border p-3 text-left transition ${index <= stageIndex ? "border-primary/40 bg-primary/5" : "bg-background text-muted-foreground"}`}
                key={stage}
                onClick={() =>
                  void update(
                    { stage },
                    `Stage updated to ${STAGE_LABELS[stage]}`,
                  )
                }
                type="button"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">
                  {index < stageIndex ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="mt-2 block text-xs font-medium">
                  {STAGE_LABELS[stage]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section
            className={`rounded-xl border p-4 ${incident.safety.state === "confirmed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {incident.safety.state === "confirmed" ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <h2 className="text-sm font-semibold">Immediate safety</h2>
                  <p className="text-xs text-muted-foreground">
                    {incident.safety.state === "confirmed"
                      ? "Confirmed in the incident record"
                      : "Actions remain underway"}
                  </p>
                </div>
              </div>
              {incident.safety.state !== "confirmed" ? (
                <button
                  className="rounded border bg-background px-2 py-1 text-xs"
                  onClick={() =>
                    void update(
                      { safety: { ...incident.safety, state: "confirmed" } },
                      "Immediate safety confirmed",
                    )
                  }
                  type="button"
                >
                  Confirm safe
                </button>
              ) : null}
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Fact
                label="Immediate risk"
                value={incident.safety.immediateRisk}
              />
              <Fact
                label="Medical and welfare"
                value={incident.safety.medicalOrWelfareSupport}
              />
              <Fact
                label="Workplace controls"
                value={incident.safety.workplaceControls}
              />
              <Fact
                label="Evidence preserved"
                value={incident.safety.evidencePreservation}
              />
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">CO review and DECMS</h2>
                <p className="text-xs text-muted-foreground">
                  14-day internal cadence; 28-day hard safeguard
                </p>
              </div>
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Fact
                label="Last CO review"
                value={displayDateTime(incident.lastReviewedAt)}
              />
              <Fact
                label="Next combined sync"
                value={displayDateTime(incident.nextReviewAt)}
              />
              <Fact
                label="Last DECMS update"
                value={
                  incident.lastDecmsUpdatedAt
                    ? displayDateTime(incident.lastDecmsUpdatedAt)
                    : "Not yet confirmed"
                }
              />
              <Fact
                label="DECMS reference"
                value={incident.decmsReference ?? "Not recorded"}
              />
            </dl>
          </section>
        </div>

        {followUps.length ? (
          <section className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-semibold">Follow-ups for the CO</h2>
                <p className="text-xs text-muted-foreground">
                  Ask the responsible role for the missing update; no message
                  has been sent.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {followUps.map((item) => (
                <div
                  className="rounded border bg-background/70 p-3"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium">
                      {item.responsibleRole}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Assigned follow-ups</h2>
              <p className="text-xs text-muted-foreground">
                Evidence is required before an action can be marked complete.
              </p>
            </div>
            <button
              className="rounded border px-2 py-1 text-xs"
              onClick={() => {
                setSelectedAction(undefined);
                setActionOpen(true);
              }}
              type="button"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Add
            </button>
          </div>
          {incident.actions.length ? (
            <div className="mt-3 divide-y rounded-lg border">
              {incident.actions.map((action) => (
                <button
                  className="flex w-full items-start justify-between gap-4 p-3 text-left hover:bg-muted/40"
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action);
                    setActionOpen(true);
                  }}
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {action.ownerRole} · Due {displayDateTime(action.dueAt)}
                    </p>
                    {action.blocker ? (
                      <p className="mt-1 text-xs text-red-600">
                        Blocked: {action.blocker}
                      </p>
                    ) : null}
                    {action.evidence ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        Evidence: {action.evidence}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs">
                    {ACTION_STATUS_LABELS[action.status]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed p-5 text-center">
              <CircleDashed className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No follow-up actions assigned yet.
              </p>
            </div>
          )}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <InformationPanel incident={incident} />
          <ReportingPanel incident={incident} onUpdate={update} />
        </div>

        <section className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Review history</h2>
              <p className="text-xs text-muted-foreground">
                Append-only CO sync outcomes
              </p>
            </div>
          </div>
          {incident.reviews.length ? (
            <div className="mt-3 space-y-3">
              {[...incident.reviews].reverse().map((review) => (
                <article
                  className="border-l-2 border-primary/30 pl-3"
                  key={review.id}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {displayDateTime(review.reviewedAt)}
                    {review.decmsUpdated
                      ? ` · DECMS ${review.decmsReference}`
                      : " · DECMS not updated"}
                  </p>
                  <p className="mt-1 text-sm">{review.summary}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No combined sync has been recorded yet.
            </p>
          )}
        </section>
      </div>
      <IncidentActionDialog
        action={selectedAction}
        onOpenChange={setActionOpen}
        onSave={saveAction}
        open={actionOpen}
      />
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function List({ items }: { items: readonly string[] }) {
  const occurrences = new Map<string, number>();
  const keyedItems = items.map((item) => {
    const occurrence = (occurrences.get(item) ?? 0) + 1;
    occurrences.set(item, occurrence);
    return { item, key: `${item}:${occurrence}` };
  });
  return items.length ? (
    <ul className="mt-2 space-y-1 text-sm">
      {keyedItems.map(({ item, key }) => (
        <li className="flex gap-2" key={key}>
          <span className="text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-2 text-sm text-muted-foreground">None recorded</p>
  );
}

function InformationPanel({ incident }: { incident: IncidentControlRecordV1 }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Information discipline</h2>
      <p className="text-xs text-muted-foreground">
        Facts, allegations, assumptions, and unknowns remain distinct.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Verified facts
          </h3>
          <List items={incident.facts} />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Allegations
          </h3>
          <List items={incident.allegations} />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Assumptions
          </h3>
          <List items={incident.assumptions} />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Unknowns
          </h3>
          <List items={incident.unknowns} />
        </div>
      </div>
    </section>
  );
}

function ReportingPanel({
  incident,
  onUpdate,
}: {
  incident: IncidentControlRecordV1;
  onUpdate: (
    changes: Partial<IncidentControlRecordV1>,
    message: string,
  ) => Promise<void>;
}) {
  const nextReport: IncidentFormalReportStatus =
    incident.reporting.formalReportStatus === "notStarted"
      ? "inProgress"
      : "complete";
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileCheck2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Notify and report</h2>
          <p className="text-xs text-muted-foreground">
            Notification is not reporting; reporting does not transfer
            responsibility.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Command notification</p>
              <p className="text-xs text-muted-foreground">
                {incident.notifications.commandNotifiedAt
                  ? displayDateTime(incident.notifications.commandNotifiedAt)
                  : "Not confirmed"}
              </p>
            </div>
            {!incident.notifications.commandNotifiedAt ? (
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() =>
                  void onUpdate(
                    {
                      notifications: {
                        ...incident.notifications,
                        commandNotifiedAt: new Date().toISOString(),
                      },
                    },
                    "Command notification recorded",
                  )
                }
                type="button"
              >
                <Bell className="mr-1 inline h-3.5 w-3.5" /> Record
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {incident.notifications.note}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Formal report</p>
              <p className="text-xs text-muted-foreground">
                {incident.reporting.formalReportStatus}
              </p>
            </div>
            {incident.reporting.formalReportStatus !== "complete" &&
            incident.reporting.formalReportStatus !== "notRequired" ? (
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() =>
                  void onUpdate(
                    {
                      reporting: {
                        ...incident.reporting,
                        formalReportStatus: nextReport,
                      },
                    },
                    nextReport === "complete"
                      ? "Formal report marked complete"
                      : "Formal report marked in progress",
                  )
                }
                type="button"
              >
                Set {nextReport === "complete" ? "complete" : "in progress"}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {incident.reporting.note}
          </p>
        </div>
      </div>
    </section>
  );
}
