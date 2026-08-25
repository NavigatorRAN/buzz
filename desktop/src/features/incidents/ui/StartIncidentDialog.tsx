import * as React from "react";
import { toast } from "sonner";
import {
  INTERIM_INCIDENT_PLAYBOOK_VERSION,
  parseIncidentControlRecord,
  type IncidentControlRecordV1,
} from "../domain/contracts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { toLocalDateTimeInput } from "./incidentPresentation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (incident: IncidentControlRecordV1) => Promise<void>;
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StartIncidentDialog({ open, onOpenChange, onCreate }: Props) {
  const initialOccurredAt = React.useMemo(
    () => toLocalDateTimeInput(new Date()),
    [],
  );
  const [reference, setReference] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(initialOccurredAt);
  const [safetyState, setSafetyState] = React.useState<
    "actionsUnderway" | "confirmed"
  >("actionsUnderway");
  const [immediateRisk, setImmediateRisk] = React.useState("");
  const [welfare, setWelfare] = React.useState("");
  const [controls, setControls] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [facts, setFacts] = React.useState("");
  const [unknowns, setUnknowns] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const valid =
    reference.trim() &&
    title.trim() &&
    summary.trim() &&
    occurredAt &&
    immediateRisk.trim() &&
    welfare.trim() &&
    controls.trim() &&
    evidence.trim() &&
    facts.trim();

  async function submit() {
    setSubmitting(true);
    try {
      const openedAt = new Date().toISOString();
      const incident = parseIncidentControlRecord({
        schemaVersion: 1,
        classification: "OFFICIAL",
        id: crypto.randomUUID(),
        reference: reference.trim(),
        title: title.trim(),
        summary: summary.trim(),
        status: "active",
        stage: "manage",
        playbookVersion: INTERIM_INCIDENT_PLAYBOOK_VERSION,
        occurredAt: new Date(occurredAt).toISOString(),
        openedAt,
        updatedAt: openedAt,
        safety: {
          state: safetyState,
          immediateRisk: immediateRisk.trim(),
          medicalOrWelfareSupport: welfare.trim(),
          workplaceControls: controls.trim(),
          evidencePreservation: evidence.trim(),
        },
        facts: lines(facts),
        allegations: [],
        assumptions: [],
        unknowns: lines(unknowns),
        actions: [],
        notifications: {
          commandNotifiedAt: null,
          specialists: [],
          note: "Notification requirements are to be assessed separately from formal reporting.",
        },
        reporting: {
          formalReportStatus: "notStarted",
          note: "Formal reporting requirements are to be confirmed.",
        },
        lastReviewedAt: openedAt,
        nextReviewAt: new Date(
          Date.parse(openedAt) + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        lastDecmsUpdatedAt: null,
        decmsReference: null,
        reviews: [],
        closure: {
          actionsComplete: false,
          outcomesRecorded: false,
          partiesAdvised: false,
          supportConcluded: false,
          handoverComplete: false,
          lessonsIdentified: false,
          repeatPatternChecked: false,
          evidence: null,
        },
      });
      await onCreate(incident);
      toast.success("Incident plan started");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start incident plan",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start CO incident plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Begin after immediate safety action. The CO owns this plan; it does
          not transfer responsibility to DECMS or the supporting staff.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Incident reference
            <input
              className="rounded border bg-background px-3 py-2"
              onChange={(event) => setReference(event.target.value)}
              placeholder="INC-2026-001"
              value={reference}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Occurred at
            <input
              className="rounded border bg-background px-3 py-2"
              onChange={(event) => setOccurredAt(event.target.value)}
              type="datetime-local"
              value={occurredAt}
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            Incident title
            <input
              className="rounded border bg-background px-3 py-2"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            Initial situation summary
            <textarea
              className="min-h-20 rounded border bg-background px-3 py-2"
              onChange={(event) => setSummary(event.target.value)}
              value={summary}
            />
          </label>
        </div>
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Immediate safety</h3>
              <p className="text-xs text-muted-foreground">
                Record what has actually been done.
              </p>
            </div>
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              onChange={(event) =>
                setSafetyState(event.target.value as typeof safetyState)
              }
              value={safetyState}
            >
              <option value="actionsUnderway">Actions underway</option>
              <option value="confirmed">Safety confirmed</option>
            </select>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field
              label="Immediate risk and action"
              value={immediateRisk}
              onChange={setImmediateRisk}
            />
            <Field
              label="Medical or welfare support"
              value={welfare}
              onChange={setWelfare}
            />
            <Field
              label="Workplace controls"
              value={controls}
              onChange={setControls}
            />
            <Field
              label="Evidence preservation"
              value={evidence}
              onChange={setEvidence}
            />
          </div>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Verified facts, one per line
            <textarea
              className="min-h-24 rounded border bg-background px-3 py-2"
              onChange={(event) => setFacts(event.target.value)}
              value={facts}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Unknowns, one per line
            <textarea
              className="min-h-24 rounded border bg-background px-3 py-2"
              onChange={(event) => setUnknowns(event.target.value)}
              value={unknowns}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="rounded border px-3 py-2 text-sm"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={!valid || submitting}
            onClick={() => void submit()}
            type="button"
          >
            {submitting ? "Starting…" : "Start incident plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <textarea
        className="min-h-20 rounded border bg-background px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
