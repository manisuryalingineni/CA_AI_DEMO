import {
  getReportById,
  getReportsDashboardSummary,
} from "../repositories/reportRepository";

import type {
  ReportData,
  ReportId,
  ReportsDashboardSummary,
} from "../types/report";

export async function loadReport(
  reportId: ReportId,
): Promise<ReportData> {
  return getReportById(
    reportId,
  );
}

export async function loadReportsSummary():
  Promise<ReportsDashboardSummary> {
  return getReportsDashboardSummary();
}