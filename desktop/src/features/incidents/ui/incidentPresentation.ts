import type {
  IncidentActionStatus,
  IncidentControlRecordV1,
  IncidentStage,
} from "../domain/contracts";

export const STAGE_LABELS: Record<IncidentStage, string> = {
  manage: "Manage",
  establish: "Establish",
  notify: "Notify",
  report: "Report",
  manageUpdate: "Manage & Update",
  closeLearn: "Close & Learn",
};

export const ACTION_STATUS_LABELS: Record<IncidentActionStatus, string> = {
  notStarted: "Not started",
  inProgress: "In progress",
  blocked: "Blocked",
  complete: "Complete",
  cancelled: "Cancelled",
};

export function displayDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function openActionCount(incident: IncidentControlRecordV1) {
  return incident.actions.filter(
    (action) => action.status !== "complete" && action.status !== "cancelled",
  ).length;
}

export function toLocalDateTimeInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
