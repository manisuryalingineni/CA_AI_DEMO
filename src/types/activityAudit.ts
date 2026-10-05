export type ActivityModule =
  | "AUTH"
  | "DASHBOARD"
  | "CUSTOMER"
  | "VENDOR"
  | "PRODUCT"
  | "SALES"
  | "PURCHASES"
  | "PAYMENTS"
  | "REPORTS"
  | "GST"
  | "BANK"
  | "SETTINGS"
  | "APPROVALS"
  | "PDF"
  | "INVENTORY"
  | "PAYROLL"
  | "OTHER";

export type ActivityAction =
  | "SCREEN_VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "SAVE"
  | "DELETE"
  | "PDF_GENERATED"
  | "REPORT_OPENED"
  | "PAYMENT_SAVED"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_MATCH"
  | "GST_PREPARATION"
  | "SETTINGS_UPDATED"
  | "OTHER";

export type ActivityAudit = {
  id: string;

  businessId: string;

  module: ActivityModule;

  action: ActivityAction;

  title: string;

  details?: string;

  actorName: string;

  actorRole: string;

  entityType?: string;

  entityId?: string;

  metadata?: Record<string, string | number | boolean | null>;

  createdAt: string;
};

export type CreateActivityAuditInput = {
  businessId?: string;

  module: ActivityModule;

  action: ActivityAction;

  title: string;

  details?: string;

  actorName?: string;

  actorRole?: string;

  entityType?: string;

  entityId?: string;

  metadata?: Record<string, string | number | boolean | null>;
};
