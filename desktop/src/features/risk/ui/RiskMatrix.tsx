import type {
  RiskConsequence,
  RiskLevel,
  RiskLikelihood,
} from "../domain/contracts";
import {
  RISK_CONSEQUENCES,
  RISK_LIKELIHOODS,
  riskIndexFor,
  riskLevelFor,
} from "../domain/riskMatrix";

const tone: Record<RiskLevel, string> = {
  veryLow:
    "bg-emerald-700/25 text-emerald-950 border-emerald-600/40 dark:text-emerald-100",
  low: "bg-green-600/25 text-green-950 border-green-500/40 dark:text-green-100",
  medium:
    "bg-amber-500/25 text-amber-950 border-amber-500/40 dark:text-amber-100",
  high: "bg-orange-600/30 text-orange-950 border-orange-500/50 dark:text-orange-100",
  veryHigh: "bg-red-600/35 text-red-950 border-red-500/60 dark:text-red-100",
};

export const riskLevelLabel: Record<RiskLevel, string> = {
  veryLow: "Very Low",
  low: "Low",
  medium: "Medium",
  high: "High",
  veryHigh: "Very High",
};

export function RiskBadge({
  consequence,
  likelihood,
}: {
  consequence: RiskConsequence;
  likelihood: RiskLikelihood;
}) {
  const level = riskLevelFor(likelihood, consequence);
  return (
    <span
      className={`rounded border px-2 py-1 text-xs font-semibold ${tone[level]}`}
    >
      {riskIndexFor(likelihood, consequence)} · {riskLevelLabel[level]}
    </span>
  );
}

export function RiskMatrix({
  selected,
  onSelect,
}: {
  selected?: {
    likelihood: RiskLikelihood;
    consequence: RiskConsequence;
  } | null;
  onSelect?: (likelihood: RiskLikelihood, consequence: RiskConsequence) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[34rem] grid-cols-[5rem_repeat(5,minmax(5rem,1fr))] gap-1 text-center text-xs">
        <div className="flex items-end justify-end p-2 text-muted-foreground">
          Likelihood
        </div>
        {RISK_CONSEQUENCES.map((consequence) => (
          <div className="p-2 font-medium" key={consequence}>
            {consequence}
          </div>
        ))}
        {RISK_LIKELIHOODS.map((likelihood) => (
          <div className="contents" key={likelihood}>
            <div className="flex items-center justify-end p-2 font-medium">
              {likelihood}
            </div>
            {RISK_CONSEQUENCES.map((consequence) => {
              const level = riskLevelFor(likelihood, consequence);
              const active =
                selected?.likelihood === likelihood &&
                selected.consequence === consequence;
              return (
                <button
                  aria-pressed={active}
                  className={`rounded border p-2 transition hover:ring-2 hover:ring-primary ${tone[level]} ${active ? "ring-2 ring-primary" : ""}`}
                  key={consequence}
                  onClick={() => onSelect?.(likelihood, consequence)}
                  type="button"
                >
                  <span className="block font-semibold">
                    {riskIndexFor(likelihood, consequence)}
                  </span>
                  <span className="block text-2xs uppercase">
                    {riskLevelLabel[level]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-2xs text-muted-foreground">
        Consequence A–E runs left to right; likelihood 5–1 runs top to bottom.
        Select a cell to filter the register.
      </p>
    </div>
  );
}
