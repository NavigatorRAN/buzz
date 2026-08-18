import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  PlanningProject,
  PlanningTask,
} from "@/features/plans/domain/contracts";
import {
  parseRiskRecord,
  type RiskControl,
  type RiskRecordV1,
} from "../domain/contracts";
import { RiskBadge } from "./RiskMatrix";

function textDate(days = 7) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function newRisk(now = new Date().toISOString()): RiskRecordV1 {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: "",
    description: "",
    consequenceDescription: "",
    domain: "mission",
    operationalTags: [],
    owner: "Operations Officer",
    scope: { type: "ship", id: null, label: "HMAS Supply" },
    inherentAssessment: { likelihood: 3, consequence: "C" },
    controls: [],
    residualAssessment: {
      likelihood: 3,
      consequence: "C",
      basis: "Projected until controls are implemented and reviewed.",
      state: "projected",
    },
    status: "open",
    reviewDate: textDate(),
    acceptance: {
      state: "notAccepted",
      authority: null,
      decidedBy: null,
      decidedAt: null,
      direction: null,
    },
    sourceEvidence: null,
    sourceConstraintId: null,
    createdAt: now,
    updatedAt: now,
  };
}

const inputClass = "mt-1 w-full rounded border bg-background px-3 py-2 text-sm";
const labelClass = "text-xs font-medium text-muted-foreground";

export function RiskEditorDialog({
  initial,
  open,
  projects,
  tasks,
  onOpenChange,
  onSave,
}: {
  initial?: RiskRecordV1;
  open: boolean;
  projects: readonly PlanningProject[];
  tasks: readonly PlanningTask[];
  onOpenChange: (open: boolean) => void;
  onSave: (risk: RiskRecordV1) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState<RiskRecordV1>(initial ?? newRisk());
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) setDraft(initial ?? newRisk());
  }, [initial, open]);
  const update = (patch: Partial<RiskRecordV1>) =>
    setDraft((prior) => ({ ...prior, ...patch }));
  const updateControl = (id: string, patch: Partial<RiskControl>) =>
    update({
      controls: draft.controls.map((control) =>
        control.id === id ? { ...control, ...patch } : control,
      ),
    });
  const addControl = () =>
    update({
      controls: [
        ...draft.controls,
        {
          id: crypto.randomUUID(),
          description: "",
          owner: draft.owner,
          status: "planned",
          linkedTaskId: null,
          dueDate: null,
          effectiveness: null,
        },
      ],
    });
  async function save() {
    try {
      setError(null);
      await onSave(
        parseRiskRecord({ ...draft, updatedAt: new Date().toISOString() }),
      );
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit risk" : "New risk"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>
            Risk title
            <input
              className={inputClass}
              spellCheck
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Risk description
            <textarea
              className={inputClass}
              spellCheck
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Consequence if realised
            <textarea
              className={inputClass}
              spellCheck
              value={draft.consequenceDescription}
              onChange={(event) =>
                update({ consequenceDescription: event.target.value })
              }
            />
          </label>
          <label className={labelClass}>
            Domain
            <select
              className={inputClass}
              value={draft.domain}
              onChange={(event) =>
                update({ domain: event.target.value as RiskRecordV1["domain"] })
              }
            >
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
          </label>
          <label className={labelClass}>
            Owner
            <input
              className={inputClass}
              spellCheck
              value={draft.owner}
              onChange={(event) => update({ owner: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Scope type
            <select
              className={inputClass}
              value={draft.scope.type}
              onChange={(event) => {
                const type = event.target
                  .value as RiskRecordV1["scope"]["type"];
                update({
                  scope:
                    type === "ship"
                      ? { type, id: null, label: "HMAS Supply" }
                      : { type, id: "", label: "" },
                });
              }}
            >
              <option value="ship">Ship</option>
              <option value="operation">Operation</option>
              <option value="project">Project</option>
              <option value="activity">Activity</option>
              <option value="task">Task</option>
            </select>
          </label>
          {draft.scope.type === "project" ? (
            <label className={labelClass}>
              Project
              <select
                className={inputClass}
                value={draft.scope.id ?? ""}
                onChange={(event) => {
                  const project = projects.find(
                    (item) => item.id === event.target.value,
                  );
                  update({
                    scope: {
                      type: "project",
                      id: project?.id ?? "",
                      label: project?.title ?? "",
                    },
                  });
                }}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {draft.scope.type === "task" ? (
            <label className={labelClass}>
              Task
              <select
                className={inputClass}
                value={draft.scope.id ?? ""}
                onChange={(event) => {
                  const task = tasks.find(
                    (item) => item.id === event.target.value,
                  );
                  update({
                    scope: {
                      type: "task",
                      id: task?.id ?? "",
                      label: task ? `${task.wbs} ${task.title}` : "",
                    },
                  });
                }}
              >
                <option value="">Select a task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.wbs} {task.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {draft.scope.type === "operation" ||
          draft.scope.type === "activity" ? (
            <>
              <label className={labelClass}>
                Scope identifier
                <input
                  className={inputClass}
                  spellCheck
                  value={draft.scope.id ?? ""}
                  onChange={(event) =>
                    update({
                      scope: { ...draft.scope, id: event.target.value },
                    })
                  }
                />
              </label>
              <label className={labelClass}>
                Scope label
                <input
                  className={inputClass}
                  spellCheck
                  value={draft.scope.label}
                  onChange={(event) =>
                    update({
                      scope: { ...draft.scope, label: event.target.value },
                    })
                  }
                />
              </label>
            </>
          ) : null}
          <label className={labelClass}>
            Review date
            <input
              className={inputClass}
              type="date"
              value={draft.reviewDate}
              onChange={(event) => update({ reviewDate: event.target.value })}
            />
          </label>
          <Assessment
            label="Inherent risk"
            value={draft.inherentAssessment}
            onChange={(value) => update({ inherentAssessment: value })}
          />
          <Assessment
            label="Residual risk"
            value={draft.residualAssessment}
            onChange={(value) =>
              update({
                residualAssessment: { ...draft.residualAssessment, ...value },
              })
            }
          />
          <label className={`${labelClass} md:col-span-2`}>
            Residual basis
            <textarea
              className={inputClass}
              spellCheck
              value={draft.residualAssessment.basis}
              onChange={(event) =>
                update({
                  residualAssessment: {
                    ...draft.residualAssessment,
                    basis: event.target.value,
                  },
                })
              }
            />
          </label>
        </div>
        <section className="mt-5 rounded border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Controls</h3>
            <button
              className="rounded border px-2 py-1 text-xs"
              onClick={addControl}
              type="button"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Add control
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {draft.controls.map((control) => (
              <div
                className="grid gap-2 rounded bg-muted/30 p-3 md:grid-cols-4"
                key={control.id}
              >
                <input
                  className={`${inputClass} md:col-span-2`}
                  placeholder="Control"
                  spellCheck
                  value={control.description}
                  onChange={(event) =>
                    updateControl(control.id, {
                      description: event.target.value,
                    })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Owner"
                  spellCheck
                  value={control.owner}
                  onChange={(event) =>
                    updateControl(control.id, { owner: event.target.value })
                  }
                />
                <select
                  className={inputClass}
                  value={control.status}
                  onChange={(event) =>
                    updateControl(control.id, {
                      status: event.target.value as RiskControl["status"],
                    })
                  }
                >
                  {["planned", "inProgress", "implemented", "ineffective"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
                <select
                  className={`${inputClass} md:col-span-2`}
                  value={control.linkedTaskId ?? ""}
                  onChange={(event) =>
                    updateControl(control.id, {
                      linkedTaskId: event.target.value || null,
                    })
                  }
                >
                  <option value="">No linked task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.wbs} {task.title}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  type="date"
                  value={control.dueDate ?? ""}
                  onChange={(event) =>
                    updateControl(control.id, {
                      dueDate: event.target.value || null,
                    })
                  }
                />
                <button
                  className="justify-self-end text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    update({
                      controls: draft.controls.filter(
                        (item) => item.id !== control.id,
                      ),
                    })
                  }
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <input
                  className={`${inputClass} md:col-span-4`}
                  placeholder="Effectiveness evidence (required before validating residual risk)"
                  spellCheck
                  value={control.effectiveness ?? ""}
                  onChange={(event) =>
                    updateControl(control.id, {
                      effectiveness: event.target.value || null,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className={labelClass}>
            Status
            <select
              className={inputClass}
              value={draft.status}
              onChange={(event) =>
                update({ status: event.target.value as RiskRecordV1["status"] })
              }
            >
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
          </label>
          <label className={labelClass}>
            Residual state
            <select
              className={inputClass}
              value={draft.residualAssessment.state}
              onChange={(event) =>
                update({
                  residualAssessment: {
                    ...draft.residualAssessment,
                    state: event.target
                      .value as RiskRecordV1["residualAssessment"]["state"],
                  },
                })
              }
            >
              <option value="projected">Projected</option>
              <option value="validated">Validated</option>
            </select>
          </label>
          <label className={labelClass}>
            Acceptance state
            <select
              className={inputClass}
              value={draft.acceptance.state}
              onChange={(event) =>
                update({
                  acceptance: {
                    ...draft.acceptance,
                    state: event.target
                      .value as RiskRecordV1["acceptance"]["state"],
                  },
                })
              }
            >
              {["notAccepted", "accepted", "elevationRequired", "elevated"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className={labelClass}>
            Authority
            <input
              className={inputClass}
              spellCheck
              value={draft.acceptance.authority ?? ""}
              onChange={(event) =>
                update({
                  acceptance: {
                    ...draft.acceptance,
                    authority: event.target.value || null,
                  },
                })
              }
            />
          </label>
          <label className={labelClass}>
            Decided by
            <input
              className={inputClass}
              spellCheck
              value={draft.acceptance.decidedBy ?? ""}
              onChange={(event) =>
                update({
                  acceptance: {
                    ...draft.acceptance,
                    decidedBy: event.target.value || null,
                  },
                })
              }
            />
          </label>
          <label className={`${labelClass} md:col-span-3`}>
            Command direction
            <textarea
              className={inputClass}
              spellCheck
              value={draft.acceptance.direction ?? ""}
              onChange={(event) =>
                update({
                  acceptance: {
                    ...draft.acceptance,
                    direction: event.target.value || null,
                    decidedAt: event.target.value
                      ? (draft.acceptance.decidedAt ?? new Date().toISOString())
                      : null,
                  },
                })
              }
            />
          </label>
          <label className={`${labelClass} md:col-span-3`}>
            Source evidence
            <textarea
              className={inputClass}
              spellCheck
              value={draft.sourceEvidence ?? ""}
              onChange={(event) =>
                update({ sourceEvidence: event.target.value || null })
              }
            />
          </label>
        </div>
        {error ? (
          <p className="mt-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
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
            Save risk
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Assessment({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { likelihood: number; consequence: string };
  onChange: (value: {
    likelihood: 1 | 2 | 3 | 4 | 5;
    consequence: "A" | "B" | "C" | "D" | "E";
  }) => void;
}) {
  return (
    <div className="rounded border p-3">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <RiskBadge
          likelihood={value.likelihood as 1 | 2 | 3 | 4 | 5}
          consequence={value.consequence as "A" | "B" | "C" | "D" | "E"}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          className={inputClass}
          value={value.likelihood}
          onChange={(event) =>
            onChange({
              likelihood: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
              consequence: value.consequence as "A" | "B" | "C" | "D" | "E",
            })
          }
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <option key={item} value={item}>
              Likelihood {item}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={value.consequence}
          onChange={(event) =>
            onChange({
              likelihood: value.likelihood as 1 | 2 | 3 | 4 | 5,
              consequence: event.target.value as "A" | "B" | "C" | "D" | "E",
            })
          }
        >
          {["A", "B", "C", "D", "E"].map((item) => (
            <option key={item} value={item}>
              Consequence {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
