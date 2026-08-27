import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  parseRiskAuthorityProfile,
  type RiskAuthorityProfileV1,
  type RiskLevel,
} from "../domain/contracts";
import { RISK_LEVELS } from "../domain/riskMatrix";
import { riskLevelLabel } from "./RiskMatrix";

export function AuthorityProfileDialog({
  initial,
  open,
  onOpenChange,
  onSave,
}: {
  initial: RiskAuthorityProfileV1;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: RiskAuthorityProfileV1) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) setDraft(initial);
  }, [initial, open]);
  const updateAuthority = (level: RiskLevel, value: string) =>
    setDraft((prior) => ({
      ...prior,
      authorities: { ...prior.authorities, [level]: value },
    }));
  const updateCadence = (level: RiskLevel, value: number) =>
    setDraft((prior) => ({
      ...prior,
      reviewCadenceDays: { ...prior.reviewCadenceDays, [level]: value },
    }));
  async function save() {
    try {
      setError(null);
      await onSave(
        parseRiskAuthorityProfile({
          ...draft,
          updatedAt: new Date().toISOString(),
        }),
      );
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Risk authority profile</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Set the local acceptance ceiling and the authority to whom higher
          risks must be elevated. The ADF doctrine values are editable for the
          command context.
        </p>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Local acceptance ceiling
          <select
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
            value={draft.localAcceptanceCeiling}
            onChange={(event) =>
              setDraft((prior) => ({
                ...prior,
                localAcceptanceCeiling: event.target.value as RiskLevel,
              }))
            }
          >
            {RISK_LEVELS.map((level) => (
              <option key={level} value={level}>
                {riskLevelLabel[level]}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid gap-3">
          {RISK_LEVELS.map((level) => (
            <div
              className="grid gap-2 rounded border p-3 md:grid-cols-[7rem_1fr_7rem]"
              key={level}
            >
              <strong className="self-center text-sm">
                {riskLevelLabel[level]}
              </strong>
              <input
                className="rounded border bg-background px-3 py-2 text-sm"
                spellCheck
                value={draft.authorities[level]}
                onChange={(event) => updateAuthority(level, event.target.value)}
              />
              <label className="text-2xs text-muted-foreground">
                Review days
                <input
                  className="mt-1 w-full rounded border bg-background px-2 py-2 text-sm"
                  min={1}
                  type="number"
                  value={draft.reviewCadenceDays[level]}
                  onChange={(event) =>
                    updateCadence(level, Number(event.target.value))
                  }
                />
              </label>
            </div>
          ))}
        </div>
        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => void save()}
            type="button"
          >
            Save profile
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
