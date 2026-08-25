import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  IncidentActionStatus,
  IncidentActionV1,
  IncidentOwnerRole,
} from "../domain/contracts";
import { toLocalDateTimeInput } from "./incidentPresentation";

type Props = {
  action?: IncidentActionV1;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (action: IncidentActionV1) => Promise<void>;
};

export function IncidentActionDialog({
  action,
  open,
  onOpenChange,
  onSave,
}: Props) {
  const [title, setTitle] = React.useState("");
  const [ownerRole, setOwnerRole] = React.useState<IncidentOwnerRole>("XO");
  const [status, setStatus] =
    React.useState<IncidentActionStatus>("notStarted");
  const [dueAt, setDueAt] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [blocker, setBlocker] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(action?.title ?? "");
    setOwnerRole(action?.ownerRole ?? "XO");
    setStatus(action?.status ?? "notStarted");
    setDueAt(
      action
        ? toLocalDateTimeInput(new Date(action.dueAt))
        : toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    );
    setEvidence(action?.evidence ?? "");
    setBlocker(action?.blocker ?? "");
  }, [action, open]);

  const valid =
    title.trim() &&
    dueAt &&
    (status !== "complete" || evidence.trim()) &&
    (status !== "blocked" || blocker.trim());

  async function save() {
    setSaving(true);
    try {
      await onSave({
        id: action?.id ?? crypto.randomUUID(),
        title: title.trim(),
        ownerRole,
        status,
        dueAt: new Date(dueAt).toISOString(),
        evidence: status === "complete" ? evidence.trim() : null,
        blocker: status === "blocked" ? blocker.trim() : null,
        updatedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action ? "Update follow-up action" : "Add follow-up action"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Action
            <input
              className="rounded border bg-background px-3 py-2"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Responsible role
              <select
                className="rounded border bg-background px-3 py-2"
                onChange={(event) =>
                  setOwnerRole(event.target.value as IncidentOwnerRole)
                }
                value={ownerRole}
              >
                <option>CO</option>
                <option>XO</option>
                <option>N1</option>
                <option>Specialist</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Status
              <select
                className="rounded border bg-background px-3 py-2"
                onChange={(event) =>
                  setStatus(event.target.value as IncidentActionStatus)
                }
                value={status}
              >
                <option value="notStarted">Not started</option>
                <option value="inProgress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Due at
            <input
              className="rounded border bg-background px-3 py-2"
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              value={dueAt}
            />
          </label>
          {status === "blocked" ? (
            <label className="grid gap-1 text-sm">
              Blocker
              <textarea
                className="min-h-20 rounded border bg-background px-3 py-2"
                onChange={(event) => setBlocker(event.target.value)}
                value={blocker}
              />
            </label>
          ) : null}
          {status === "complete" ? (
            <label className="grid gap-1 text-sm">
              Completion evidence
              <textarea
                className="min-h-20 rounded border bg-background px-3 py-2"
                onChange={(event) => setEvidence(event.target.value)}
                value={evidence}
              />
            </label>
          ) : null}
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
            disabled={!valid || saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "Saving…" : "Save action"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
