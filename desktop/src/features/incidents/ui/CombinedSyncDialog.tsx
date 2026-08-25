import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { IncidentControlRecordV1 } from "../domain/contracts";
import {
  applyCombinedIncidentReview,
  type IncidentReviewOutcome,
} from "../domain/evaluation";

type DraftOutcome = {
  summary: string;
  decmsUpdated: boolean;
  decmsReference: string;
};

type Props = {
  incidents: readonly IncidentControlRecordV1[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (incident: IncidentControlRecordV1) => Promise<void>;
};

export function CombinedSyncDialog({
  incidents,
  open,
  onOpenChange,
  onPublish,
}: Props) {
  const active = React.useMemo(
    () => incidents.filter((incident) => incident.status === "active"),
    [incidents],
  );
  const [drafts, setDrafts] = React.useState<Record<string, DraftOutcome>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(
        active.map((incident) => [
          incident.id,
          { summary: "", decmsUpdated: false, decmsReference: "" },
        ]),
      ),
    );
  }, [active, open]);

  function update(incidentId: string, changes: Partial<DraftOutcome>) {
    setDrafts((current) => {
      const previous = current[incidentId] ?? {
        summary: "",
        decmsUpdated: false,
        decmsReference: "",
      };
      return {
        ...current,
        [incidentId]: { ...previous, ...changes },
      };
    });
  }

  const valid = active.every((incident) => {
    const draft = drafts[incident.id];
    return (
      draft?.summary.trim() &&
      (!draft.decmsUpdated || draft.decmsReference.trim())
    );
  });

  async function recordSync() {
    setSubmitting(true);
    try {
      const reviewedAt = new Date().toISOString();
      const outcomes: IncidentReviewOutcome[] = active.map((incident) => ({
        incidentId: incident.id,
        summary: drafts[incident.id]?.summary.trim() ?? "",
        decmsUpdated: drafts[incident.id]?.decmsUpdated ?? false,
        decmsReference: drafts[incident.id]?.decmsUpdated
          ? drafts[incident.id]?.decmsReference.trim() || null
          : null,
      }));
      const updated = applyCombinedIncidentReview(
        incidents,
        outcomes,
        reviewedAt,
      ).filter(
        (incident) =>
          active.some((item) => item.id === incident.id) &&
          incident.updatedAt === reviewedAt,
      );
      const results = await Promise.allSettled(updated.map(onPublish));
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        throw new Error(
          `${failed.length} of ${updated.length} incident updates failed. Re-open the sync to confirm the current records before retrying.`,
        );
      }
      toast.success(
        `Combined sync recorded for ${updated.length} active incident${updated.length === 1 ? "" : "s"}`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not record combined sync",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record combined CO incident sync</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          One meeting reviews every active incident. Recording it resets each
          incident’s internal 14-day review clock. DECMS confirmation remains
          separate and requires a reference.
        </p>
        <div className="grid gap-4">
          {active.map((incident) => {
            const draft = drafts[incident.id] ?? {
              summary: "",
              decmsUpdated: false,
              decmsReference: "",
            };
            return (
              <section
                className="rounded-lg border bg-card p-4"
                key={incident.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {incident.reference}
                    </p>
                    <h3 className="text-base font-semibold">
                      {incident.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                    Active
                  </span>
                </div>
                <label className="mt-3 grid gap-1 text-sm">
                  CO review outcome
                  <textarea
                    className="min-h-20 rounded border bg-background px-3 py-2"
                    onChange={(event) =>
                      update(incident.id, { summary: event.target.value })
                    }
                    placeholder="Decision, current position, and follow-up direction"
                    value={draft.summary}
                  />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    checked={draft.decmsUpdated}
                    onChange={(event) =>
                      update(incident.id, {
                        decmsUpdated: event.target.checked,
                        decmsReference: event.target.checked
                          ? draft.decmsReference
                          : "",
                      })
                    }
                    type="checkbox"
                  />
                  N1 confirms DECMS was updated
                </label>
                {draft.decmsUpdated ? (
                  <label className="mt-2 grid gap-1 text-sm">
                    DECMS reference
                    <input
                      className="rounded border bg-background px-3 py-2"
                      onChange={(event) =>
                        update(incident.id, {
                          decmsReference: event.target.value,
                        })
                      }
                      value={draft.decmsReference}
                    />
                  </label>
                ) : null}
              </section>
            );
          })}
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
            disabled={!valid || submitting || active.length === 0}
            onClick={() => void recordSync()}
            type="button"
          >
            {submitting ? "Recording…" : "Record combined sync"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
