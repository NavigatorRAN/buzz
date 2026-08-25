import { invokeTauri } from "./tauri";

export type RiskExportRow = {
  title: string;
  domain: string;
  owner: string;
  scope: string;
  inherent: string;
  residual: string;
  controls: string;
  status: string;
  reviewDate: string;
  acceptance: string;
  psychosocial: string;
};

export function exportRiskRegister(
  format: "xlsx" | "pdf",
  rows: readonly RiskExportRow[],
) {
  return invokeTauri<boolean>("export_risk_register", { format, rows });
}
