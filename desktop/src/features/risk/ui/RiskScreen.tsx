import * as React from "react";
import {
  AlertTriangle,
  FileDown,
  Filter,
  Plus,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { useIdentityQuery } from "@/shared/api/hooks";
import { exportRiskRegister } from "@/shared/api/tauriRisk";
import { useBattleRhythmQuery } from "@/features/battle-rhythm/hooks";
import { usePlansQuery } from "@/features/plans/hooks";
import { useRiskMutations, useRiskRegisterQuery } from "../hooks";
import type { RiskDomain, RiskRecordV1, RiskStatus } from "../domain/contracts";
import {
  DEFAULT_RISK_AUTHORITY_PROFILE,
  requiresElevation,
  riskLevelFor,
} from "../domain/riskMatrix";
import {
  createRiskFromConstraint,
  summarizeRisks,
} from "../domain/riskPresentation";
import {
  createRiskFromPsychosocialSuggestion,
  psychosocialHazardLabels,
  suggestPsychosocialReviews,
} from "../domain/psychosocialReview";
import { AuthorityProfileDialog } from "./AuthorityProfileDialog";
import { RiskBadge, RiskMatrix } from "./RiskMatrix";
import { RiskEditorDialog } from "./RiskEditorDialog";

const activeStatuses = new Set<RiskStatus>([
  "open",
  "treating",
  "controlled",
  "accepted",
  "elevated",
]);

export function RiskScreen({
  initialConstraintId,
}: {
  initialConstraintId?: string;
}) {
  const identity = useIdentityQuery();
  const register = useRiskRegisterQuery(identity.data?.pubkey);
  const plans = usePlansQuery(identity.data?.pubkey);
  const [screenNow] = React.useState(() => new Date().toISOString());
  const battleRhythmRange = React.useMemo(
    () => ({
      start: new Date(Date.parse(screenNow) - 86_400_000).toISOString(),
      end: new Date(Date.parse(screenNow) + 8 * 86_400_000).toISOString(),
    }),
    [screenNow],
  );
  const battleRhythm = useBattleRhythmQuery(
    identity.data?.pubkey,
    battleRhythmRange,
  );
  const mutations = useRiskMutations(identity.data?.pubkey ?? "");
  const risks = register.data?.risks ?? [];
  const profile =
    register.data?.authorityProfile ?? DEFAULT_RISK_AUTHORITY_PROFILE;
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RiskRecordV1 | undefined>();
  const [search, setSearch] = React.useState("");
  const [domain, setDomain] = React.useState<RiskDomain | "all">("all");
  const [status, setStatus] = React.useState<RiskStatus | "active" | "all">(
    "active",
  );
  const [psychosocialOnly, setPsychosocialOnly] = React.useState(false);
  const [matrixCell, setMatrixCell] = React.useState<{
    likelihood: 1 | 2 | 3 | 4 | 5;
    consequence: "A" | "B" | "C" | "D" | "E";
  } | null>(null);
  const consumedConstraint = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (
      !initialConstraintId ||
      consumedConstraint.current === initialConstraintId ||
      !plans.data
    )
      return;
    consumedConstraint.current = initialConstraintId;
    const existing = risks.find(
      (risk) => risk.sourceConstraintId === initialConstraintId,
    );
    if (existing) {
      setEditing(existing);
      setEditorOpen(true);
      return;
    }
    const constraint = plans.data.constraints.find(
      (item) => item.id === initialConstraintId,
    );
    if (!constraint) return;
    const project = plans.data.projects.find(
      (item) => item.id === constraint.projectId,
    );
    setEditing(
      createRiskFromConstraint(
        constraint,
        project?.title ?? "Operational plan",
        new Date().toISOString(),
      ),
    );
    setEditorOpen(true);
  }, [initialConstraintId, plans.data, risks]);
  const today = new Date().toISOString().slice(0, 10);
  const summary = summarizeRisks(risks, profile, today);
  const psychosocialSuggestions = React.useMemo(
    () =>
      suggestPsychosocialReviews(
        battleRhythm.data?.revisions ?? [],
        battleRhythm.data?.sources ?? [],
        screenNow,
      ).slice(0, 3),
    [battleRhythm.data?.revisions, battleRhythm.data?.sources, screenNow],
  );
  const visible = risks.filter((risk) => {
    const text =
      `${risk.title} ${risk.description} ${risk.owner} ${risk.scope.label}`.toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (domain !== "all" && risk.domain !== domain) return false;
    if (status === "active" && !activeStatuses.has(risk.status)) return false;
    if (status !== "all" && status !== "active" && risk.status !== status)
      return false;
    if (psychosocialOnly && risk.psychosocialReview.state === "notIndicated")
      return false;
    if (
      matrixCell &&
      (risk.residualAssessment.likelihood !== matrixCell.likelihood ||
        risk.residualAssessment.consequence !== matrixCell.consequence)
    )
      return false;
    return true;
  });
  const openNew = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };
  const exportRows = risks.map((risk) => {
    const inherentLevel = riskLevelFor(
      risk.inherentAssessment.likelihood,
      risk.inherentAssessment.consequence,
    );
    const residualLevel = riskLevelFor(
      risk.residualAssessment.likelihood,
      risk.residualAssessment.consequence,
    );
    return {
      title: risk.title,
      domain: risk.domain,
      owner: risk.owner,
      scope: risk.scope.label,
      inherent: `${risk.inherentAssessment.consequence}${risk.inherentAssessment.likelihood} ${inherentLevel}`,
      residual: `${risk.residualAssessment.consequence}${risk.residualAssessment.likelihood} ${residualLevel}`,
      controls: `${risk.controls.filter((control) => control.status === "implemented").length}/${risk.controls.length} implemented`,
      status: risk.status,
      reviewDate: risk.reviewDate,
      acceptance: risk.acceptance.state,
    };
  });
  return (
    <main
      className="min-h-0 flex-1 overflow-auto p-6"
      data-testid="risk-screen"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Command planning
            </p>
            <h1 className="text-2xl font-semibold">Risk</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Operational risk register using the ADF likelihood/consequence
              matrix, linked controls, review dates, and command authority.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={() => setProfileOpen(true)}
              type="button"
            >
              <Settings2 className="mr-1 inline h-4 w-4" />
              Authority
            </button>
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={() => void exportRiskRegister("xlsx", exportRows)}
              type="button"
            >
              <FileDown className="mr-1 inline h-4 w-4" />
              Excel
            </button>
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={() => void exportRiskRegister("pdf", exportRows)}
              type="button"
            >
              <FileDown className="mr-1 inline h-4 w-4" />
              PDF
            </button>
            <button
              className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={openNew}
              type="button"
            >
              <Plus className="mr-1 inline h-4 w-4" />
              New risk
            </button>
          </div>
        </header>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Active risks" value={summary.active} />
          <Summary
            label="Elevation required"
            value={summary.elevationRequired}
            alert={summary.elevationRequired > 0}
          />
          <Summary
            label="Review overdue"
            value={summary.overdue}
            alert={summary.overdue > 0}
          />
          <Summary
            label="Projected controls"
            value={summary.projectedControls}
          />
        </div>
        {psychosocialSuggestions.length ? (
          <section
            className="mt-6 rounded-xl border border-primary/30 bg-card p-4"
            data-testid="psychosocial-programme-review"
          >
            <div>
              <h2 className="text-base font-semibold">
                Programme change review
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Short-notice programme changes may warrant a psychosocial
                review. Nothing is recorded until you save a risk.
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {psychosocialSuggestions.map((suggestion) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded border bg-background/50 p-3"
                  key={suggestion.id}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {suggestion.eventTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {suggestion.sourceName} · {suggestion.changeKind} · due{" "}
                      {suggestion.eventStart.slice(0, 10)}
                    </p>
                  </div>
                  <button
                    className="rounded border px-3 py-2 text-xs"
                    onClick={() => {
                      setEditing(
                        createRiskFromPsychosocialSuggestion(
                          suggestion,
                          new Date().toISOString(),
                        ),
                      );
                      setEditorOpen(true);
                    }}
                    type="button"
                  >
                    Review in risk editor
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section className="mt-6 rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Risk matrix</h2>
              <p className="text-xs text-muted-foreground">
                Residual risk shown in the register. Select a cell to filter.
              </p>
            </div>
            {matrixCell ? (
              <button
                className="text-xs text-primary"
                onClick={() => setMatrixCell(null)}
                type="button"
              >
                Clear matrix filter
              </button>
            ) : null}
          </div>
          <RiskMatrix
            selected={matrixCell}
            onSelect={(likelihood, consequence) =>
              setMatrixCell((prior) =>
                prior?.likelihood === likelihood &&
                prior.consequence === consequence
                  ? null
                  : { likelihood, consequence },
              )
            }
          />
        </section>
        <section className="mt-6 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              className="min-w-[14rem] flex-1 rounded border bg-background px-3 py-2 text-sm"
              placeholder="Search title, owner or scope"
              spellCheck
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value as RiskDomain | "all")
              }
            >
              <option value="all">All domains</option>
              {[
                "mission",
                "personnel",
                "capability",
                "reputation",
                "environment",
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RiskStatus | "active" | "all")
              }
            >
              <option value="active">Active</option>
              <option value="all">All statuses</option>
              {[
                "open",
                "treating",
                "controlled",
                "accepted",
                "elevated",
                "closed",
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={psychosocialOnly}
                onChange={(event) => setPsychosocialOnly(event.target.checked)}
              />
              Psychosocial attention
            </label>
          </div>
          {register.isLoading || plans.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading risk register…
            </p>
          ) : visible.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[65rem] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Risk</th>
                    <th className="p-3">Owner / scope</th>
                    <th className="p-3">Inherent</th>
                    <th className="p-3">Residual</th>
                    <th className="p-3">Controls</th>
                    <th className="p-3">Review</th>
                    <th className="p-3">Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((risk) => {
                    const residual = riskLevelFor(
                      risk.residualAssessment.likelihood,
                      risk.residualAssessment.consequence,
                    );
                    const elevation =
                      !["accepted", "elevated"].includes(
                        risk.acceptance.state,
                      ) && requiresElevation(residual, profile);
                    return (
                      <tr
                        className="cursor-pointer border-t hover:bg-muted/30"
                        key={risk.id}
                        onClick={() => {
                          setEditing(risk);
                          setEditorOpen(true);
                        }}
                      >
                        <td className="p-3">
                          <strong>{risk.title}</strong>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {risk.description}
                          </p>
                          <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-2xs uppercase">
                            {risk.status}
                          </span>
                          {risk.psychosocialReview.state !== "notIndicated" ? (
                            <span className="ml-1 mt-1 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-2xs text-primary">
                              Psychosocial:{" "}
                              {risk.psychosocialReview.state === "material"
                                ? "material"
                                : "review"}
                            </span>
                          ) : null}
                          {risk.psychosocialReview.state !== "notIndicated" ? (
                            <p className="mt-1 line-clamp-1 text-2xs text-muted-foreground">
                              {risk.psychosocialReview.hazards
                                .map(
                                  (hazard) => psychosocialHazardLabels[hazard],
                                )
                                .join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <div>{risk.owner}</div>
                          <div className="text-xs text-muted-foreground">
                            {risk.scope.label}
                          </div>
                        </td>
                        <td className="p-3">
                          <RiskBadge {...risk.inherentAssessment} />
                        </td>
                        <td className="p-3">
                          <RiskBadge
                            likelihood={risk.residualAssessment.likelihood}
                            consequence={risk.residualAssessment.consequence}
                          />
                          <p className="mt-1 text-2xs text-muted-foreground">
                            {risk.residualAssessment.state}
                          </p>
                        </td>
                        <td className="p-3">
                          {
                            risk.controls.filter(
                              (control) => control.status === "implemented",
                            ).length
                          }
                          /{risk.controls.length} implemented
                        </td>
                        <td
                          className={
                            risk.reviewDate < today
                              ? "p-3 font-semibold text-destructive"
                              : "p-3"
                          }
                        >
                          {risk.reviewDate}
                        </td>
                        <td className="p-3">
                          {elevation ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Elevate
                            </span>
                          ) : (
                            <span className="text-xs">Within ceiling</span>
                          )}
                          <p className="mt-1 max-w-[14rem] text-2xs text-muted-foreground">
                            {profile.authorities[residual]}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-3 text-base font-medium">No matching risks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a risk or promote a risk candidate from Plans.
              </p>
            </div>
          )}
        </section>
      </div>
      <RiskEditorDialog
        initial={editing}
        open={editorOpen}
        projects={plans.data?.projects ?? []}
        tasks={plans.data?.tasks ?? []}
        onOpenChange={setEditorOpen}
        onSave={(risk) =>
          mutations.risk.mutateAsync(risk).then(() => undefined)
        }
      />
      <AuthorityProfileDialog
        initial={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSave={(value) =>
          mutations.profile.mutateAsync(value).then(() => undefined)
        }
      />
    </main>
  );
}

function Summary({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-card p-4 ${alert ? "border-destructive/50" : ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <strong
        className={
          alert ? "mt-2 block text-3xl text-destructive" : "mt-2 block text-3xl"
        }
      >
        {value}
      </strong>
    </article>
  );
}
