import type { SQLiteDatabase } from "expo-sqlite";
import { getDatabase, withPurchaseTransaction } from "../database/database";

/* Existing public types and function names remain available. */
export type PurchaseStatus = "UNPAID" | "PARTIAL" | "PAID";
export type SupplyType = "WITHIN_STATE" | "OTHER_STATE";
export type DocumentType =
  | "REQUEST"
  | "RFQ"
  | "PO"
  | "GRN"
  | "PURCHASE"
  | "RETURN";
export type MatchStatus =
  | "NOT_CHECKED"
  | "NOT_LINKED"
  | "MATCH_REVIEW"
  | "MATCHED";

export interface PurchaseRow {
  id: string;
  business_id: string;
  purchase_number: string;
  vendor_id: string | null;
  invoice_number: string | null;
  purchase_date: string;
  due_date: string | null;
  supply_type: SupplyType;
  counter_branch: string | null;
  salesperson: string | null;
  delivery_method: string | null;
  subtotal: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: PurchaseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  return_amount?: number;
  refunded_amount?: number;
  vendor_credit?: number;
  match_status?: MatchStatus;
  source_type?: DocumentType | null;
  source_id?: string | null;
}
export type PurchaseListRow = PurchaseRow & { vendor_name: string | null };
export interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  hsn: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  created_at: string;
  position?: number;
  source_item_id?: string | null;
}
export interface PurchaseRfqRow {
  id: string;
  business_id: string;
  rfq_number: string;
  vendor_id: string | null;
  rfq_date: string;
  valid_until: string | null;
  supply_type: SupplyType;
  counter_branch: string | null;
  salesperson: string | null;
  delivery_method: string | null;
  subtotal: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_type?: DocumentType | null;
  source_id?: string | null;
}
export type PurchaseRfqListRow = PurchaseRfqRow & {
  vendor_name: string | null;
};
export interface PurchaseRfqItemRow {
  id: string;
  rfq_id: string;
  product_id: string;
  product_name: string;
  hsn: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  created_at: string;
  position?: number;
  source_item_id?: string | null;
}

/* Uniform model over existing bills/RFQs and the four new document tables. */
export interface PartySnapshot {
  name: string;
  gstin: string;
  address?: string;
  state?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  business_type?: string;
}
export interface WorkflowDocument {
  id: string;
  business_id: string;
  document_type: DocumentType;
  document_number: string;
  vendor_id: string | null;
  vendor_name: string;
  document_date: string;
  due_date: string | null;
  invoice_number: string | null;
  supply_type: SupplyType;
  counter_branch: string | null;
  salesperson: string | null;
  delivery_method: string | null;
  notes: string | null;
  subtotal: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  return_amount: number;
  refunded_amount: number;
  vendor_credit: number;
  payment_status: PurchaseStatus | null;
  match_status: MatchStatus;
  source_type: DocumentType | null;
  source_id: string | null;
  source_number: string | null;
  next_id: string | null;
  next_type: DocumentType | null;
  next_number: string | null;
  line_count: number;
  created_at: string;
  updated_at: string;
  business: PartySnapshot;
  vendor: PartySnapshot;
  snapshot_is_current: boolean;
}
export interface WorkflowLine {
  id: string;
  document_id: string;
  product_id: string;
  product_name: string;
  hsn: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  source_item_id: string | null;
  position: number;
  created_at: string;
  returned_quantity: number;
}
export interface PurchasePayment {
  id: string;
  business_id: string;
  purchase_id: string;
  direction: "PAYMENT" | "REFUND";
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}
export interface WorkflowDetail {
  document: WorkflowDocument;
  items: WorkflowLine[];
  payments: PurchasePayment[];
}
export interface DocumentLineInput {
  id?: string;
  productId: string;
  productName: string;
  hsn?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  discount?: number;
  sourceItemId?: string;
}
export interface SaveDocumentInput {
  id: string;
  documentType: DocumentType;
  vendorId: string;
  documentDate: string;
  /** Used only by older repository callers that already assigned a number. */
  documentNumber?: string;
  dueDate?: string;
  supplyType: SupplyType;
  invoiceNumber?: string;
  counterBranch?: string;
  salesperson?: string;
  deliveryMethod?: string;
  notes?: string;
  paidAmount?: number;
  refundAmount?: number;
  sourceType?: DocumentType;
  sourceId?: string;
  items: DocumentLineInput[];
}
export interface CalculatedLine extends DocumentLineInput {
  discount: number;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}
export interface DocumentTotals {
  items: CalculatedLine[];
  subtotal: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discount: number;
  totalAmount: number;
}
export type PurchaseDashboardTotals = {
  purchase_total: number;
  payable_total: number;
  purchase_count: number;
  gross_purchase_total?: number;
  returns_total?: number;
  paid_total?: number;
  vendor_credit_total?: number;
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  REQUEST: "Purchase request",
  RFQ: "Request for quotation",
  PO: "Purchase order",
  GRN: "Goods receipt note",
  PURCHASE: "Purchase bill",
  RETURN: "Purchase return",
};
export const NEXT_DOCUMENT: Partial<Record<DocumentType, DocumentType>> = {
  REQUEST: "RFQ",
  RFQ: "PO",
  PO: "GRN",
  GRN: "PURCHASE",
};
const TABLES: Record<
  DocumentType,
  {
    table: string;
    items: string;
    foreignKey: string;
    number: string;
    date: string;
    due: string;
    prefix: string;
  }
> = {
  REQUEST: {
    table: "purchase_requests",
    items: "purchase_request_items",
    foreignKey: "document_id",
    number: "document_number",
    date: "document_date",
    due: "due_date",
    prefix: "REQ",
  },
  RFQ: {
    table: "purchase_rfqs",
    items: "purchase_rfq_items",
    foreignKey: "rfq_id",
    number: "rfq_number",
    date: "rfq_date",
    due: "valid_until",
    prefix: "RFQ",
  },
  PO: {
    table: "purchase_orders",
    items: "purchase_order_items",
    foreignKey: "document_id",
    number: "document_number",
    date: "document_date",
    due: "due_date",
    prefix: "PO",
  },
  GRN: {
    table: "purchase_grns",
    items: "purchase_grn_items",
    foreignKey: "document_id",
    number: "document_number",
    date: "document_date",
    due: "due_date",
    prefix: "GRN",
  },
  PURCHASE: {
    table: "purchases",
    items: "purchase_items",
    foreignKey: "purchase_id",
    number: "purchase_number",
    date: "purchase_date",
    due: "due_date",
    prefix: "PB",
  },
  RETURN: {
    table: "purchase_returns",
    items: "purchase_return_items",
    foreignKey: "document_id",
    number: "document_number",
    date: "document_date",
    due: "due_date",
    prefix: "PR",
  },
};
function config(type: DocumentType) {
  if (!Object.prototype.hasOwnProperty.call(TABLES, type))
    throw new Error("Unknown purchase document type.");
  return TABLES[type];
}
export function makePurchaseKey(prefix = "document"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}
export function roundMoney(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12)
    throw new Error("Amount is outside the supported range.");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function requireNumber(value: number, label: string, maximum = 1e9): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(`${label} must be a valid non-negative number.`);
  }
  return value;
}
function quantityValue(value: number, label: string): number {
  const quantity = requireNumber(value, label);
  const rounded = Math.round(quantity * 1e6) / 1e6;
  if (quantity < 0.000001 || Math.abs(quantity - rounded) > 0.000000001) {
    throw new Error(
      `${label} must be positive with no more than six decimal places.`,
    );
  }
  return rounded;
}
export function validDocumentDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function calculatePurchaseLines(
  items: DocumentLineInput[],
  supply: SupplyType,
): DocumentTotals {
  if (supply !== "WITHIN_STATE" && supply !== "OTHER_STATE")
    throw new Error("Select a valid supply type.");
  const lines = items.map((item, index): CalculatedLine => {
    const title = `Line ${index + 1}`;
    const quantity = quantityValue(item.quantity, `${title} quantity`);
    if (quantity <= 0)
      throw new Error(`${title}: quantity must be greater than zero.`);
    const price = requireNumber(item.unitPrice, `${title} rate`);
    const rate = requireNumber(item.gstRate, `${title} GST rate`, 100);
    const gross = roundMoney(quantity * price);
    const discount = roundMoney(
      requireNumber(item.discount ?? 0, `${title} discount`),
    );
    if (discount > gross)
      throw new Error(`${title}: discount cannot exceed its value.`);
    const taxable = roundMoney(gross - discount);
    const gst = roundMoney((taxable * rate) / 100);
    const cgst = supply === "WITHIN_STATE" ? roundMoney(gst / 2) : 0;
    return {
      ...item,
      quantity,
      discount,
      taxableAmount: taxable,
      gstAmount: gst,
      cgstAmount: cgst,
      sgstAmount: supply === "WITHIN_STATE" ? roundMoney(gst - cgst) : 0,
      igstAmount: supply === "OTHER_STATE" ? gst : 0,
      totalAmount: roundMoney(taxable + gst),
    };
  });
  return sumLines(lines);
}
function sumLines(items: CalculatedLine[]): DocumentTotals {
  const sum = (
    key: keyof Pick<
      CalculatedLine,
      | "taxableAmount"
      | "gstAmount"
      | "cgstAmount"
      | "sgstAmount"
      | "igstAmount"
      | "discount"
      | "totalAmount"
    >,
  ) => roundMoney(items.reduce((total, item) => total + item[key], 0));
  return {
    items,
    subtotal: sum("taxableAmount"),
    gstAmount: sum("gstAmount"),
    cgstAmount: sum("cgstAmount"),
    sgstAmount: sum("sgstAmount"),
    igstAmount: sum("igstAmount"),
    discount: sum("discount"),
    totalAmount: sum("totalAmount"),
  };
}
/** Return amounts use original bill values, not today's product prices.
 * Cumulative rounding ensures partial returns add back to the original value.
 */
export function calculatePurchaseReturn(
  source: WorkflowLine[],
  requested: DocumentLineInput[],
  supply: SupplyType,
): DocumentTotals {
  const seen = new Set<string>();
  const rows = requested.map((input): CalculatedLine => {
    const original = source.find((line) => line.id === input.sourceItemId);
    if (!original || seen.has(original.id))
      throw new Error("Select each original bill line only once.");
    seen.add(original.id);
    if (
      !Number.isFinite(original.total_amount) ||
      !Number.isFinite(original.gst_amount) ||
      original.total_amount < 0 ||
      original.gst_amount < 0 ||
      original.gst_amount > original.total_amount
    ) {
      throw new Error(
        "The original bill line has inconsistent amounts. Review it before creating a return.",
      );
    }
    const qty = quantityValue(input.quantity, "Return quantity");
    const returned = original.returned_quantity || 0;
    const remaining = Math.max(
      0,
      Math.round((original.quantity - returned) * 1e6) / 1e6,
    );
    if (qty <= 0 || qty > remaining)
      throw new Error(
        `${original.product_name}: return quantity exceeds the remaining ${remaining}.`,
      );
    const part = (amount: number) =>
      roundMoney(
        roundMoney(
          (amount * Math.min(original.quantity, returned + qty)) /
            original.quantity,
        ) - roundMoney((amount * returned) / original.quantity),
      );
    const taxable = part(
      roundMoney(original.total_amount - original.gst_amount),
    );
    // Prorate each original tax component separately. Splitting each partial
    // return's rounded GST in half can otherwise over-reverse CGST by a paisa.
    const originalCgst = roundMoney(original.gst_amount / 2);
    const cgst = supply === "WITHIN_STATE" ? part(originalCgst) : 0;
    const sgst =
      supply === "WITHIN_STATE"
        ? part(roundMoney(original.gst_amount - originalCgst))
        : 0;
    const igst = supply === "OTHER_STATE" ? part(original.gst_amount) : 0;
    const gst = roundMoney(cgst + sgst + igst);
    return {
      productId: original.product_id,
      productName: original.product_name,
      hsn: original.hsn ?? undefined,
      unit: original.unit ?? undefined,
      sourceItemId: original.id,
      quantity: qty,
      unitPrice: original.unit_price,
      gstRate: original.gst_rate,
      discount: part(original.discount),
      taxableAmount: taxable,
      gstAmount: gst,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalAmount: roundMoney(taxable + gst),
    };
  });
  return sumLines(rows);
}

type RawRow = Record<string, string | number | null>;
function text(value: unknown): string {
  return value == null ? "" : String(value);
}
function numeric(value: unknown): number {
  return Number(value ?? 0);
}
function nullable(value: unknown): string | null {
  return text(value).trim() || null;
}
function snapshot(value: unknown, fallback: PartySnapshot): PartySnapshot {
  if (typeof value !== "string" || !value) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string"
    ) {
      const obj = parsed as Record<string, unknown>;
      return {
        name: text(obj.name),
        gstin: text(obj.gstin),
        address: text(obj.address),
        state: text(obj.state),
        mobile: text(obj.mobile),
        email: text(obj.email),
        pan: text(obj.pan),
        business_type: text(obj.business_type),
      };
    }
  } catch {
    /* Old records use current available party information. */
  }
  return fallback;
}
function normalizeDocument(row: RawRow, type: DocumentType): WorkflowDocument {
  const c = config(type);
  const vendor = snapshot(row.vendor_snapshot, {
    name: text(row.current_vendor_name) || "Vendor unavailable",
    gstin: text(row.current_vendor_gstin),
    address: text(row.current_vendor_address),
    state: text(row.current_vendor_state),
    mobile: text(row.current_vendor_mobile),
  });
  const business = snapshot(row.business_snapshot, {
    name: text(row.current_business_name) || "Business",
    gstin: text(row.current_business_gstin),
    business_type: text(row.current_business_type),
  });
  return {
    id: text(row.id),
    business_id: text(row.business_id),
    document_type: type,
    document_number:
      text(row[c.number]) || `${c.prefix}-${text(row.id).slice(-8)}`,
    vendor_id: nullable(row.vendor_id),
    vendor_name: vendor.name,
    document_date: text(row[c.date]),
    due_date: nullable(row[c.due]),
    invoice_number: nullable(row.invoice_number),
    supply_type:
      row.supply_type === "OTHER_STATE" ? "OTHER_STATE" : "WITHIN_STATE",
    counter_branch: nullable(row.counter_branch),
    salesperson: nullable(row.salesperson),
    delivery_method: nullable(row.delivery_method),
    notes: nullable(row.notes),
    subtotal: numeric(row.subtotal),
    gst_amount: numeric(row.gst_amount),
    cgst_amount: numeric(row.cgst_amount),
    sgst_amount: numeric(row.sgst_amount),
    igst_amount: numeric(row.igst_amount),
    discount: numeric(row.discount),
    total_amount: numeric(row.total_amount),
    paid_amount: numeric(row.paid_amount),
    due_amount: numeric(row.due_amount),
    return_amount: numeric(row.return_amount),
    refunded_amount: numeric(row.refunded_amount),
    vendor_credit: numeric(row.vendor_credit),
    payment_status:
      type === "PURCHASE" ? (row.payment_status as PurchaseStatus) : null,
    match_status: (row.match_status as MatchStatus) || "NOT_CHECKED",
    source_type: row.source_type as DocumentType | null,
    source_id: nullable(row.source_id),
    source_number: null,
    next_id: null,
    next_type: null,
    next_number: null,
    line_count: numeric(row.line_count),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    vendor,
    business,
    snapshot_is_current: !row.vendor_snapshot || !row.business_snapshot,
  };
}
function documentSelect(type: DocumentType) {
  const c = config(type);
  return `SELECT d.*, v.name AS current_vendor_name, v.gstin AS current_vendor_gstin,
    v.address AS current_vendor_address, v.state AS current_vendor_state, v.mobile AS current_vendor_mobile,
    b.name AS current_business_name, b.gstin AS current_business_gstin, b.business_type AS current_business_type,
    (SELECT COUNT(*) FROM ${c.items} i WHERE i.${c.foreignKey}=d.id) AS line_count
    FROM ${c.table} d LEFT JOIN vendors v ON v.id=d.vendor_id AND v.business_id=d.business_id
    LEFT JOIN businesses b ON b.id=d.business_id`;
}
async function readDocument(
  db: SQLiteDatabase,
  businessId: string,
  type: DocumentType,
  id: string,
) {
  const row = await db.getFirstAsync<RawRow>(
    `${documentSelect(type)} WHERE d.id=? AND d.business_id=?`,
    id,
    businessId,
  );
  return row ? normalizeDocument(row, type) : null;
}
async function readLines(
  db: SQLiteDatabase,
  businessId: string,
  type: DocumentType,
  id: string,
): Promise<WorkflowLine[]> {
  const c = config(type);
  const rows = await db.getAllAsync<RawRow>(
    `SELECT i.*,
    COALESCE(NULLIF(i.product_name,''),p.name,'Product unavailable') AS resolved_name,
    COALESCE(i.hsn,p.hsn) AS resolved_hsn, COALESCE(i.unit,p.unit) AS resolved_unit
    FROM ${c.items} i JOIN ${c.table} d ON d.id=i.${c.foreignKey}
    LEFT JOIN products p ON p.id=i.product_id AND p.business_id=d.business_id
    WHERE d.id=? AND d.business_id=? ORDER BY i.position, i.created_at, i.rowid`,
    id,
    businessId,
  );
  const returned =
    type === "PURCHASE"
      ? await db.getAllAsync<{ source_item_id: string; quantity: number }>(
          `
    SELECT i.source_item_id,SUM(i.quantity) AS quantity FROM purchase_return_items i
    JOIN purchase_returns r ON r.id=i.document_id
    WHERE r.business_id=? AND r.source_type='PURCHASE' AND r.source_id=? GROUP BY i.source_item_id`,
          businessId,
          id,
        )
      : [];
  const quantities = new Map(
    returned.map((r) => [r.source_item_id, r.quantity]),
  );
  return rows.map((row) => ({
    id: text(row.id),
    document_id: id,
    product_id: text(row.product_id),
    product_name: text(row.resolved_name),
    hsn: nullable(row.resolved_hsn),
    unit: nullable(row.resolved_unit),
    quantity: numeric(row.quantity),
    unit_price: numeric(row.unit_price),
    gst_rate: numeric(row.gst_rate),
    gst_amount: numeric(row.gst_amount),
    discount: numeric(row.discount),
    total_amount: numeric(row.total_amount),
    source_item_id: nullable(row.source_item_id),
    position: numeric(row.position),
    created_at: text(row.created_at),
    returned_quantity: quantities.get(text(row.id)) || 0,
  }));
}
async function detailIn(
  db: SQLiteDatabase,
  businessId: string,
  type: DocumentType,
  id: string,
): Promise<WorkflowDetail | null> {
  const document = await readDocument(db, businessId, type, id);
  if (!document) return null;
  if (document.source_type && document.source_id) {
    document.source_number =
      (
        await readDocument(
          db,
          businessId,
          document.source_type,
          document.source_id,
        )
      )?.document_number ?? null;
  }
  const child = await db.getFirstAsync<{
    target_type: DocumentType;
    target_id: string;
  }>(
    `
    SELECT target_type,target_id FROM purchase_document_links
    WHERE business_id=? AND source_type=? AND source_id=? AND target_type<>'RETURN'`,
    businessId,
    type,
    id,
  );
  if (child) {
    document.next_id = child.target_id;
    document.next_type = child.target_type;
    document.next_number =
      (await readDocument(db, businessId, child.target_type, child.target_id))
        ?.document_number ?? null;
  }
  const items = await readLines(db, businessId, type, id);
  const payments =
    type === "PURCHASE"
      ? await db.getAllAsync<PurchasePayment>(
          "SELECT * FROM purchase_payments WHERE business_id=? AND purchase_id=? ORDER BY created_at,id",
          businessId,
          id,
        )
      : [];
  return { document, items, payments };
}
export async function getWorkflowDocument(
  businessId: string,
  type: DocumentType,
  id: string,
): Promise<WorkflowDetail | null> {
  return detailIn(await getDatabase(), businessId, type, id);
}
export async function getPurchaseWorkflow(
  businessId: string,
): Promise<WorkflowDocument[]> {
  const db = await getDatabase();
  const result: WorkflowDocument[] = [];
  for (const type of Object.keys(TABLES) as DocumentType[]) {
    const rows = await db.getAllAsync<RawRow>(
      `${documentSelect(type)} WHERE d.business_id=?`,
      businessId,
    );
    result.push(...rows.map((row) => normalizeDocument(row, type)));
  }
  const map = new Map(
    result.map((row) => [`${row.document_type}:${row.id}`, row]),
  );
  const links = await db.getAllAsync<{
    source_type: DocumentType;
    source_id: string;
    target_type: DocumentType;
    target_id: string;
  }>("SELECT * FROM purchase_document_links WHERE business_id=?", businessId);
  for (const link of links) {
    const parent = map.get(`${link.source_type}:${link.source_id}`);
    const child = map.get(`${link.target_type}:${link.target_id}`);
    if (parent && child) {
      child.source_number = parent.document_number;
      if (link.target_type !== "RETURN") {
        parent.next_id = child.id;
        parent.next_type = child.document_type;
        parent.next_number = child.document_number;
      }
    }
  }
  return result.sort(
    (a, b) =>
      b.document_date.localeCompare(a.document_date) ||
      b.created_at.localeCompare(a.created_at) ||
      b.id.localeCompare(a.id),
  );
}
async function nextNumber(
  db: SQLiteDatabase,
  businessId: string,
  type: DocumentType,
): Promise<string> {
  const c = config(type);
  let counter = await db.getFirstAsync<{ last_number: number }>(
    "SELECT last_number FROM purchase_document_sequences WHERE business_id=? AND document_type=?",
    businessId,
    type,
  );
  if (!counter) {
    const numbers = await db.getAllAsync<{ number: string }>(
      `SELECT ${c.number} AS number FROM ${c.table} WHERE business_id=?`,
      businessId,
    );
    let maximum = 1000;
    for (const row of numbers) {
      const suffix = row.number.startsWith(`${c.prefix}-`)
        ? row.number.slice(c.prefix.length + 1)
        : "";
      if (/^\d{1,9}$/.test(suffix)) maximum = Math.max(maximum, Number(suffix));
    }
    await db.runAsync(
      "INSERT INTO purchase_document_sequences (business_id,document_type,last_number) VALUES (?,?,?)",
      businessId,
      type,
      maximum,
    );
    counter = { last_number: maximum };
  }
  let number = counter.last_number + 1;
  while (
    await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM ${c.table} WHERE business_id=? AND ${c.number}=?`,
      businessId,
      `${c.prefix}-${number}`,
    )
  )
    number += 1;
  await db.runAsync(
    "UPDATE purchase_document_sequences SET last_number=? WHERE business_id=? AND document_type=?",
    number,
    businessId,
    type,
  );
  return `${c.prefix}-${number}`;
}
async function insertRow(
  db: SQLiteDatabase,
  table: string,
  values: Record<string, string | number | null>,
) {
  // All identifiers originate from this module's static table/column configuration.
  const keys = Object.keys(values);
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    Object.values(values),
  );
}
async function moveStock(
  db: SQLiteDatabase,
  businessId: string,
  productId: string,
  quantity: number,
  type: string,
  referenceId: string,
  movementId: string,
) {
  const product = await db.getFirstAsync<{
    stock_quantity: number;
    name: string;
  }>(
    "SELECT stock_quantity,name FROM products WHERE id=? AND business_id=?",
    productId,
    businessId,
  );
  if (!product)
    throw new Error("A product no longer belongs to this business.");
  const after = Math.round((product.stock_quantity + quantity) * 1e6) / 1e6;
  if (quantity < 0 && after < -0.000001)
    throw new Error(
      `${product.name}: insufficient current stock for this operation.`,
    );
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE products SET stock_quantity=?,updated_at=? WHERE id=? AND business_id=?",
    after,
    now,
    productId,
    businessId,
  );
  await insertRow(db, "inventory_movements", {
    id: movementId,
    business_id: businessId,
    product_id: productId,
    movement_type: quantity >= 0 ? "IN" : "OUT",
    reference_type: type,
    reference_id: referenceId,
    quantity,
    stock_before: product.stock_quantity,
    stock_after: after,
    created_at: now,
  });
}
async function recalculateBalance(
  db: SQLiteDatabase,
  businessId: string,
  id: string,
) {
  const bill = await db.getFirstAsync<PurchaseRow>(
    "SELECT * FROM purchases WHERE id=? AND business_id=?",
    id,
    businessId,
  );
  if (!bill) throw new Error("Purchase bill not found.");
  const net = roundMoney(bill.total_amount - (bill.return_amount || 0));
  const netPaid = roundMoney(bill.paid_amount - (bill.refunded_amount || 0));
  const due = Math.max(0, roundMoney(net - netPaid));
  const credit = Math.max(0, roundMoney(netPaid - net));
  const status: PurchaseStatus =
    due === 0 ? "PAID" : netPaid > 0 ? "PARTIAL" : "UNPAID";
  await db.runAsync(
    "UPDATE purchases SET due_amount=?,vendor_credit=?,payment_status=?,updated_at=? WHERE id=? AND business_id=?",
    due,
    credit,
    status,
    new Date().toISOString(),
    id,
    businessId,
  );
}
function sameLines(left: WorkflowLine[], right: CalculatedLine[]): boolean {
  const collect = (
    items: {
      productId: string;
      unitPrice: number;
      gstRate: number;
      quantity: number;
      discount: number;
      unit?: string;
    }[],
  ) => {
    const result = new Map<string, { quantity: number; discount: number }>();
    items.forEach((i) => {
      const key = JSON.stringify([
        i.productId,
        roundMoney(i.unitPrice),
        i.gstRate,
        i.unit || "",
      ]);
      const old = result.get(key) ?? { quantity: 0, discount: 0 };
      result.set(key, {
        quantity: old.quantity + i.quantity,
        discount: roundMoney(old.discount + i.discount),
      });
    });
    return result;
  };
  const a = collect(
    left.map((i) => ({
      productId: i.product_id,
      unitPrice: i.unit_price,
      gstRate: i.gst_rate,
      quantity: i.quantity,
      discount: i.discount,
      unit: i.unit ?? "",
    })),
  );
  const b = collect(right);
  return (
    a.size === b.size &&
    [...a].every(([key, value]) => {
      const other = b.get(key);
      return (
        other &&
        Math.abs(value.quantity - other.quantity) < 0.000001 &&
        Math.abs(value.discount - other.discount) < 0.005
      );
    })
  );
}

/** Single atomic save: document, lines, lineage, stock and payable effects. */
export async function createWorkflowDocument(
  businessId: string,
  input: SaveDocumentInput,
): Promise<WorkflowDetail> {
  const c = config(input.documentType);
  if (!input.id.trim() || !input.vendorId.trim())
    throw new Error("Document ID and vendor are required.");
  if (
    !validDocumentDate(input.documentDate) ||
    (input.dueDate && !validDocumentDate(input.dueDate))
  )
    throw new Error("Use a valid YYYY-MM-DD date.");
  if (input.dueDate && input.dueDate < input.documentDate)
    throw new Error("Due date cannot be before document date.");
  if (!Array.isArray(input.items) || !input.items.length)
    throw new Error("Add at least one item.");
  if (input.items.length > 500)
    throw new Error("A document can contain up to 500 lines.");
  if (Boolean(input.sourceType) !== Boolean(input.sourceId))
    throw new Error("Source type and source ID must be supplied together.");
  return withPurchaseTransaction(async (db) => {
    const alreadySaved = await detailIn(
      db,
      businessId,
      input.documentType,
      input.id,
    );
    // Reusing the same id is an idempotent retry, not a new document or an edit.
    if (alreadySaved) return alreadySaved;
    const business = await db.getFirstAsync<RawRow>(
      "SELECT * FROM businesses WHERE id=?",
      businessId,
    );
    const vendor = await db.getFirstAsync<RawRow>(
      "SELECT * FROM vendors WHERE id=? AND business_id=?",
      input.vendorId,
      businessId,
    );
    if (!business || !vendor)
      throw new Error("Select a vendor belonging to the current business.");
    let source: WorkflowDetail | null = null;
    if (input.sourceType && input.sourceId) {
      source = await detailIn(db, businessId, input.sourceType, input.sourceId);
      if (!source)
        throw new Error(
          "Source document is missing or belongs to another business.",
        );
      const validTarget =
        input.documentType === "RETURN"
          ? input.sourceType === "PURCHASE"
          : NEXT_DOCUMENT[input.sourceType] === input.documentType;
      if (!validTarget)
        throw new Error("This document conversion is not supported.");
      if (source.document.vendor_id !== input.vendorId)
        throw new Error("The converted document must use the source vendor.");
      if (input.documentDate < source.document.document_date)
        throw new Error(
          "A converted document cannot be dated before its source.",
        );
      if (input.documentType !== "RETURN" && source.document.next_id)
        throw new Error(
          `Already converted to ${source.document.next_number || source.document.next_type}. Open that document instead.`,
        );
    } else if (input.documentType === "RETURN") {
      throw new Error(
        "A purchase return must be linked to an original purchase bill.",
      );
    }
    for (const item of input.items) {
      if (!item.productId.trim() || !item.productName.trim())
        throw new Error("Every line must have a product and name.");
      const exists = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM products WHERE id=? AND business_id=?",
        item.productId,
        businessId,
      );
      if (!exists)
        throw new Error(
          `${item.productName}: product not found in this business.`,
        );
      if (
        item.sourceItemId &&
        !source?.items.some(
          (i) => i.id === item.sourceItemId && i.product_id === item.productId,
        )
      )
        throw new Error("A source line does not match its selected product.");
    }
    if (
      input.documentType === "RETURN" &&
      source?.document.supply_type !== input.supplyType
    )
      throw new Error("Returns must use the original bill supply type.");
    const totals =
      input.documentType === "RETURN" && source
        ? calculatePurchaseReturn(source.items, input.items, input.supplyType)
        : calculatePurchaseLines(input.items, input.supplyType);
    if (
      (input.documentType === "PURCHASE" || input.documentType === "RETURN") &&
      totals.totalAmount <= 0
    )
      throw new Error("Bill / return total must be greater than zero.");
    const paid = roundMoney(
      requireNumber(input.paidAmount ?? 0, "Paid amount"),
    );
    const refund = roundMoney(
      requireNumber(input.refundAmount ?? 0, "Refund amount"),
    );
    if (input.documentType !== "PURCHASE" && paid !== 0)
      throw new Error("Payments can only be recorded against purchase bills.");
    if (input.documentType !== "RETURN" && refund !== 0)
      throw new Error("Refund is only applicable to a return.");
    if (paid > totals.totalAmount)
      throw new Error("Paid amount cannot exceed the bill total.");
    if (input.documentType === "RETURN" && source) {
      if (
        totals.totalAmount >
        roundMoney(source.document.total_amount - source.document.return_amount)
      ) {
        throw new Error(
          "Return value exceeds the original bill balance. Review the legacy header and line totals.",
        );
      }
      const maxRefund = Math.max(
        0,
        roundMoney(
          source.document.paid_amount -
            source.document.refunded_amount -
            (source.document.total_amount -
              source.document.return_amount -
              totals.totalAmount),
        ),
      );
      if (refund > Math.min(maxRefund, totals.totalAmount))
        throw new Error(
          `Refund cannot exceed ${Math.min(maxRefund, totals.totalAmount).toFixed(2)}. Unpaid returns reduce To Pay first.`,
        );
    }
    const now = new Date().toISOString();
    const number =
      input.documentNumber?.trim() ||
      (await nextNumber(db, businessId, input.documentType));
    if (
      await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM ${c.table} WHERE business_id=? AND ${c.number}=?`,
        businessId,
        number,
      )
    ) {
      throw new Error(
        "This document number is already used in the current business.",
      );
    }
    let match: MatchStatus = "NOT_LINKED";
    if (
      input.documentType === "PURCHASE" &&
      source?.document.document_type === "GRN" &&
      source.document.source_type === "PO" &&
      source.document.source_id
    ) {
      const po = await detailIn(
        db,
        businessId,
        "PO",
        source.document.source_id,
      );
      match =
        po &&
        po.document.vendor_id === input.vendorId &&
        po.document.supply_type === input.supplyType &&
        source.document.supply_type === input.supplyType &&
        sameLines(source.items, totals.items) &&
        sameLines(po.items, totals.items) &&
        Math.abs(source.document.total_amount - totals.totalAmount) < 0.011 &&
        Math.abs(po.document.total_amount - totals.totalAmount) < 0.011
          ? "MATCHED"
          : "MATCH_REVIEW";
    }
    const vendorSnapshot: PartySnapshot = {
      name: text(vendor.name),
      gstin: text(vendor.gstin),
      address: text(vendor.address),
      state: text(vendor.state),
      mobile: text(vendor.mobile),
    };
    const businessSnapshot: PartySnapshot = {
      name: text(business.name),
      gstin: text(business.gstin),
      business_type: text(business.business_type),
    };
    const header: Record<string, string | number | null> = {
      id: input.id,
      business_id: businessId,
      [c.number]: number,
      vendor_id: input.vendorId,
      [c.date]: input.documentDate,
      [c.due]: nullable(input.dueDate),
      supply_type: input.supplyType,
      counter_branch: nullable(input.counterBranch),
      salesperson: nullable(input.salesperson),
      delivery_method: nullable(input.deliveryMethod),
      subtotal: totals.subtotal,
      gst_amount: totals.gstAmount,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      discount: totals.discount,
      total_amount: totals.totalAmount,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      vendor_snapshot: JSON.stringify(
        source?.document.vendor ?? vendorSnapshot,
      ),
      business_snapshot: JSON.stringify(
        source?.document.business ?? businessSnapshot,
      ),
      notes: nullable(input.notes),
      created_at: now,
      updated_at: now,
    };
    if (input.documentType !== "RFQ")
      header.invoice_number = nullable(input.invoiceNumber);
    if (input.documentType === "PURCHASE")
      Object.assign(header, {
        paid_amount: paid,
        due_amount: roundMoney(totals.totalAmount - paid),
        return_amount: 0,
        refunded_amount: 0,
        vendor_credit: 0,
        payment_status:
          paid >= totals.totalAmount ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        match_status: match,
      });
    if (input.documentType === "RETURN") header.refunded_amount = refund;
    await insertRow(db, c.table, header);
    for (let index = 0; index < totals.items.length; index++) {
      const item = totals.items[index];
      const lineId = item.id || `${input.id}_line_${index + 1}`;
      await insertRow(db, c.items, {
        id: lineId,
        [c.foreignKey]: input.id,
        product_id: item.productId,
        product_name: item.productName.trim(),
        hsn: nullable(item.hsn),
        unit: nullable(item.unit),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        gst_rate: item.gstRate,
        gst_amount: item.gstAmount,
        discount: item.discount,
        total_amount: item.totalAmount,
        source_item_id: item.sourceItemId ?? null,
        position: index,
        created_at: now,
      });
      if (
        input.documentType === "PURCHASE" ||
        input.documentType === "RETURN"
      ) {
        await moveStock(
          db,
          businessId,
          item.productId,
          item.quantity * (input.documentType === "RETURN" ? -1 : 1),
          input.documentType,
          input.id,
          `${input.id}_stock_${index + 1}`,
        );
      }
    }
    if (input.sourceId && input.sourceType)
      await insertRow(db, "purchase_document_links", {
        business_id: businessId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        target_type: input.documentType,
        target_id: input.id,
        created_at: now,
      });
    if (input.documentType === "PURCHASE" && paid > 0)
      await insertRow(db, "purchase_payments", {
        id: `${input.id}_initial`,
        business_id: businessId,
        purchase_id: input.id,
        direction: "PAYMENT",
        amount: paid,
        payment_date: input.documentDate,
        payment_method: "OTHER",
        notes: "Amount paid when bill was created.",
        created_at: now,
      });
    if (input.documentType === "RETURN" && source) {
      await db.runAsync(
        "UPDATE purchases SET return_amount=ROUND(return_amount+?,2),refunded_amount=ROUND(refunded_amount+?,2) WHERE id=? AND business_id=?",
        totals.totalAmount,
        refund,
        source.document.id,
        businessId,
      );
      if (refund > 0)
        await insertRow(db, "purchase_payments", {
          id: `${input.id}_refund`,
          business_id: businessId,
          purchase_id: source.document.id,
          direction: "REFUND",
          amount: refund,
          payment_date: input.documentDate,
          payment_method: "OTHER",
          notes: `Refund against ${number}`,
          created_at: now,
        });
      await recalculateBalance(db, businessId, source.document.id);
    }
    const saved = await detailIn(db, businessId, input.documentType, input.id);
    if (!saved) throw new Error("Saved document could not be loaded.");
    return saved;
  });
}

export interface RecordPurchasePaymentInput {
  id: string;
  purchaseId: string;
  direction: "PAYMENT" | "REFUND";
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}
export async function addPurchasePayment(
  businessId: string,
  input: RecordPurchasePaymentInput,
): Promise<WorkflowDetail> {
  const amount = roundMoney(requireNumber(input.amount, "Payment amount"));
  if (amount <= 0 || !input.id.trim() || !validDocumentDate(input.paymentDate))
    throw new Error("Enter a positive amount and a valid payment date.");
  if (input.direction !== "PAYMENT" && input.direction !== "REFUND")
    throw new Error("Invalid payment direction.");
  return withPurchaseTransaction(async (db) => {
    const bill = await detailIn(db, businessId, "PURCHASE", input.purchaseId);
    if (!bill) throw new Error("Purchase bill not found in this business.");
    const existing = await db.getFirstAsync<PurchasePayment>(
      "SELECT * FROM purchase_payments WHERE id=?",
      input.id,
    );
    if (existing) {
      if (
        existing.business_id !== businessId ||
        existing.purchase_id !== input.purchaseId
      )
        throw new Error("Payment ID is already used.");
      return bill;
    }
    if (input.paymentDate < bill.document.document_date)
      throw new Error("Payment date cannot be before the bill date.");
    const available =
      input.direction === "PAYMENT"
        ? bill.document.due_amount
        : bill.document.vendor_credit;
    if (amount > available)
      throw new Error(
        `Amount exceeds the outstanding ${available.toFixed(2)}.`,
      );
    await insertRow(db, "purchase_payments", {
      id: input.id,
      business_id: businessId,
      purchase_id: input.purchaseId,
      direction: input.direction,
      amount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod || "OTHER",
      notes: nullable(input.notes),
      created_at: new Date().toISOString(),
    });
    const column =
      input.direction === "PAYMENT" ? "paid_amount" : "refunded_amount";
    await db.runAsync(
      `UPDATE purchases SET ${column}=ROUND(${column}+?,2) WHERE id=? AND business_id=?`,
      amount,
      input.purchaseId,
      businessId,
    );
    await recalculateBalance(db, businessId, input.purchaseId);
    return (await detailIn(db, businessId, "PURCHASE", input.purchaseId))!;
  });
}

/* Backward-compatible purchase and RFQ repository APIs. */
export async function getPurchases(
  businessId: string,
): Promise<PurchaseListRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<PurchaseListRow>(
    `SELECT p.*,v.name AS vendor_name FROM purchases p
    LEFT JOIN vendors v ON v.id=p.vendor_id AND v.business_id=p.business_id
    WHERE p.business_id=? ORDER BY p.purchase_date DESC,p.created_at DESC`,
    businessId,
  );
}
export async function getPurchaseById(
  id: string,
  businessId?: string,
): Promise<PurchaseRow | null> {
  const db = await getDatabase();
  return businessId
    ? db.getFirstAsync<PurchaseRow>(
        "SELECT * FROM purchases WHERE id=? AND business_id=?",
        id,
        businessId,
      )
    : db.getFirstAsync<PurchaseRow>("SELECT * FROM purchases WHERE id=?", id);
}
export async function getPurchaseItems(id: string): Promise<PurchaseItemRow[]> {
  return (await getDatabase()).getAllAsync<PurchaseItemRow>(
    "SELECT * FROM purchase_items WHERE purchase_id=? ORDER BY position,created_at,rowid",
    id,
  );
}
export async function getPurchaseRfqs(
  businessId: string,
): Promise<PurchaseRfqListRow[]> {
  return (await getDatabase()).getAllAsync<PurchaseRfqListRow>(
    `SELECT r.*,v.name AS vendor_name FROM purchase_rfqs r
    LEFT JOIN vendors v ON v.id=r.vendor_id AND v.business_id=r.business_id
    WHERE r.business_id=? ORDER BY r.rfq_date DESC,r.created_at DESC`,
    businessId,
  );
}
export async function getPurchaseRfqById(
  id: string,
  businessId?: string,
): Promise<PurchaseRfqRow | null> {
  const db = await getDatabase();
  return businessId
    ? db.getFirstAsync<PurchaseRfqRow>(
        "SELECT * FROM purchase_rfqs WHERE id=? AND business_id=?",
        id,
        businessId,
      )
    : db.getFirstAsync<PurchaseRfqRow>(
        "SELECT * FROM purchase_rfqs WHERE id=?",
        id,
      );
}
export async function getPurchaseRfqItems(
  id: string,
): Promise<PurchaseRfqItemRow[]> {
  return (await getDatabase()).getAllAsync<PurchaseRfqItemRow>(
    "SELECT * FROM purchase_rfq_items WHERE rfq_id=? ORDER BY position,created_at,rowid",
    id,
  );
}
export async function getPurchaseDashboardTotals(
  businessId: string,
): Promise<PurchaseDashboardTotals> {
  const row = await (
    await getDatabase()
  ).getFirstAsync<PurchaseDashboardTotals>(
    `SELECT
    COALESCE(SUM(total_amount-return_amount),0) AS purchase_total,
    COALESCE(SUM(due_amount),0) AS payable_total, COUNT(*) AS purchase_count,
    COALESCE(SUM(total_amount),0) AS gross_purchase_total,
    COALESCE(SUM(return_amount),0) AS returns_total,
    COALESCE(SUM(paid_amount-refunded_amount),0) AS paid_total,
    COALESCE(SUM(vendor_credit),0) AS vendor_credit_total
    FROM purchases WHERE business_id=?`,
    businessId,
  );
  return row ?? { purchase_total: 0, payable_total: 0, purchase_count: 0 };
}
function legacyLines(
  items: (PurchaseItemRow | PurchaseRfqItemRow)[],
): DocumentLineInput[] {
  return items.map((i) => ({
    id: i.id,
    productId: i.product_id,
    productName: i.product_name,
    hsn: i.hsn ?? undefined,
    unit: i.unit ?? undefined,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    gstRate: i.gst_rate,
    discount: i.discount,
    sourceItemId: i.source_item_id ?? undefined,
  }));
}
export async function createPurchase(
  p: PurchaseRow,
  items: PurchaseItemRow[],
): Promise<void> {
  await createWorkflowDocument(p.business_id, {
    id: p.id,
    documentType: "PURCHASE",
    documentNumber: p.purchase_number,
    vendorId: p.vendor_id || "",
    documentDate: p.purchase_date,
    dueDate: p.due_date ?? undefined,
    supplyType: p.supply_type,
    invoiceNumber: p.invoice_number ?? undefined,
    counterBranch: p.counter_branch ?? undefined,
    salesperson: p.salesperson ?? undefined,
    deliveryMethod: p.delivery_method ?? undefined,
    paidAmount: p.paid_amount,
    notes: p.notes ?? undefined,
    items: legacyLines(items),
    sourceType: p.source_type ?? undefined,
    sourceId: p.source_id ?? undefined,
  });
}
export async function createPurchaseRfq(
  r: PurchaseRfqRow,
  items: PurchaseRfqItemRow[],
): Promise<void> {
  await createWorkflowDocument(r.business_id, {
    id: r.id,
    documentType: "RFQ",
    documentNumber: r.rfq_number,
    vendorId: r.vendor_id || "",
    documentDate: r.rfq_date,
    dueDate: r.valid_until ?? undefined,
    supplyType: r.supply_type,
    counterBranch: r.counter_branch ?? undefined,
    salesperson: r.salesperson ?? undefined,
    deliveryMethod: r.delivery_method ?? undefined,
    notes: r.notes ?? undefined,
    items: legacyLines(items),
    sourceType: r.source_type ?? undefined,
    sourceId: r.source_id ?? undefined,
  });
}
export async function deleteWorkflowDocument(
  businessId: string,
  type: DocumentType,
  id: string,
): Promise<void> {
  const c = config(type);
  await withPurchaseTransaction(async (db) => {
    const detail = await detailIn(db, businessId, type, id);
    if (!detail) return;
    if (type === "RETURN")
      throw new Error(
        "Posted returns are audit records and cannot be deleted.",
      );
    const children = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM purchase_document_links WHERE business_id=? AND source_type=? AND source_id=?",
      businessId,
      type,
      id,
    );
    if (children?.count)
      throw new Error(
        "This document has linked documents and cannot be deleted.",
      );
    if (type === "PURCHASE") {
      if (
        detail.payments.length ||
        detail.document.paid_amount > 0 ||
        detail.document.return_amount > 0
      )
        throw new Error("A paid or returned bill cannot be deleted.");
      for (const line of detail.items)
        await moveStock(
          db,
          businessId,
          line.product_id,
          -line.quantity,
          "PURCHASE_DELETE",
          id,
          makePurchaseKey("reversal"),
        );
    }
    await db.runAsync(`DELETE FROM ${c.items} WHERE ${c.foreignKey}=?`, id);
    await db.runAsync(
      `DELETE FROM ${c.table} WHERE id=? AND business_id=?`,
      id,
      businessId,
    );
    await db.runAsync(
      "DELETE FROM purchase_document_links WHERE business_id=? AND target_type=? AND target_id=?",
      businessId,
      type,
      id,
    );
  });
}
export async function deletePurchase(id: string): Promise<void> {
  const bill = await getPurchaseById(id);
  if (bill) await deleteWorkflowDocument(bill.business_id, "PURCHASE", id);
}
export async function deletePurchaseRfq(id: string): Promise<void> {
  const rfq = await getPurchaseRfqById(id);
  if (rfq) await deleteWorkflowDocument(rfq.business_id, "RFQ", id);
}

/** Stored purchase GST less linked return GST. These are recorded amounts,
 * not a determination of statutory input-tax-credit eligibility. */
export interface PurchaseTaxSummary {
  gst_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  unallocated_gst_total: number;
}
export async function getPurchaseTaxSummary(
  businessId: string,
): Promise<PurchaseTaxSummary> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PurchaseTaxSummary>(
    `SELECT
    ROUND(COALESCE(SUM(gst),0),2) AS gst_total,
    ROUND(COALESCE(SUM(cgst),0),2) AS cgst_total,
    ROUND(COALESCE(SUM(sgst),0),2) AS sgst_total,
    ROUND(COALESCE(SUM(igst),0),2) AS igst_total,
    ROUND(COALESCE(SUM(gst-cgst-sgst-igst),0),2) AS unallocated_gst_total
    FROM (
      SELECT gst_amount AS gst,cgst_amount AS cgst,sgst_amount AS sgst,igst_amount AS igst
      FROM purchases WHERE business_id=?
      UNION ALL
      SELECT -gst_amount,-cgst_amount,-sgst_amount,-igst_amount
      FROM purchase_returns WHERE business_id=? AND source_type='PURCHASE'
    )`,
    businessId,
    businessId,
  );
  return (
    row ?? {
      gst_total: 0,
      cgst_total: 0,
      sgst_total: 0,
      igst_total: 0,
      unallocated_gst_total: 0,
    }
  );
}
