export type ReportId =
  | "sales-register"
  | "purchase-register"
  | "stock-report"
  | "receivables"
  | "payables"
  | "payment-register"
  | "cash-flow"
  | "bank-reconciliation"
  | "gst-working"
  | "gst-readiness"
  | "profit-loss"
  | "day-book"
  | "payroll-summary"
  | "business-income-tax"
  | "document-index"
  | "counter-product-branch";

export type ReportValueFormat =
  | "text"
  | "money"
  | "number"
  | "date";

export type ReportField = {
  key: string;

  label: string;

  format?: ReportValueFormat;
};

export type ReportRow = {
  id: string;

  values: Record<
    string,
    string | number | null
  >;
};

export type ReportData = {
  id: ReportId;

  title: string;

  subtitle: string;

  fields: ReportField[];

  rows: ReportRow[];

  summaryLabel?: string;

  summaryValue?: number;

  emptyMessage?: string;
};

export type ReportsDashboardSummary = {
  netSales: number;

  netPurchases: number;

  bookResult: number;

  stockValue: number;
};