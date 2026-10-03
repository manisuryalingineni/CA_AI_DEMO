import type * as SQLite from 'expo-sqlite';

import {
  getDatabase,
  withSalesTransaction,
} from '../database/database';

import {
  SALES_DOCUMENT_PREFIXES,
  SALES_NEXT_DOCUMENT,
} from '../types/sale';

import type {
  CreateSalesPaymentInput,
  CreateSalesWorkflowInput,
  PaymentStatus,
  Sale,
  SaleItem,
  SalesCalculatedLine,
  SalesCalculatedTotals,
  SalesCustomField,
  SalesDocumentReference,
  SalesDocumentState,
  SalesDocumentType,
  SalesInventoryPostingStatus,
  SalesPartySnapshot,
  SalesPayment,
  SalesPdfSettings,
  SalesReturnLineInput,
  SalesSnapshotStatus,
  SalesSupplyType,
  SalesWorkflowDetail,
  SalesWorkflowDocument,
  SalesWorkflowLine,
  SalesWorkflowLineInput,
  SalesWorkflowSummary,
} from '../types/sale';

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_SAFE_SERIAL = 9_007_199_254_740_991;
const MONEY_EPSILON = 0.005;
const QTY_EPSILON = 0.0000005;

const TABLES: Record<
  Exclude<SalesDocumentType, 'SALES_INVOICE'>,
  {
    header: string;
    items: string;
    dateColumn: 'document_date';
    numberColumn: 'document_number';
  }
> = {
  QUOTATION: {
    header: 'sales_quotations',
    items: 'sales_quotation_items',
    dateColumn: 'document_date',
    numberColumn: 'document_number',
  },
  SALES_ORDER: {
    header: 'sales_orders',
    items: 'sales_order_items',
    dateColumn: 'document_date',
    numberColumn: 'document_number',
  },
  DELIVERY_CHALLAN: {
    header: 'sales_delivery_challans',
    items: 'sales_delivery_challan_items',
    dateColumn: 'document_date',
    numberColumn: 'document_number',
  },
  SALES_RETURN: {
    header: 'sales_returns',
    items: 'sales_return_items',
    dateColumn: 'document_date',
    numberColumn: 'document_number',
  },
};

/* =========================================================
   LEGACY POS ROWS / MAPPERS
   These exports are kept for the existing POS code.
========================================================= */

type SaleRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  invoice_number: string | null;
  sale_date: string;
  subtotal: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  created_at: string;
};

function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    saleDate: row.sale_date,
    subtotal: number(row.subtotal),
    gstAmount: number(row.gst_amount),
    discount: number(row.discount),
    totalAmount: number(row.total_amount),
    paidAmount: number(row.paid_amount),
    dueAmount: number(row.due_amount),
    paymentMethod: row.payment_method as Sale['paymentMethod'],
    paymentStatus: row.payment_status as Sale['paymentStatus'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSaleItem(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    quantity: number(row.quantity),
    unitPrice: number(row.unit_price),
    gstRate: number(row.gst_rate),
    gstAmount: number(row.gst_amount),
    discount: number(row.discount),
    totalAmount: number(row.total_amount),
    createdAt: row.created_at,
  };
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function roundSalesMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function trim(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function optional(value: string | null | undefined): string | undefined {
  const normalized = trim(value);
  return normalized || undefined;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeSalesKey(prefix = 'sales'): string {
  return makeId(prefix.replace(/[^a-z0-9_]/gi, '_').toLowerCase());
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
}

function assertGstRate(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('GST rate must be between 0 and 100.');
  }
}

function stateForInvoice(
  total: number,
  paid: number,
  returned: number,
  refunded: number,
): { state: SalesDocumentState; status: PaymentStatus; due: number; credit: number } {
  const netInvoice = Math.max(0, roundSalesMoney(total - returned));
  const netReceived = roundSalesMoney(paid - refunded);
  const due = Math.max(0, roundSalesMoney(netInvoice - netReceived));
  const credit = Math.max(0, roundSalesMoney(netReceived - netInvoice));

  if (netInvoice <= MONEY_EPSILON || due <= MONEY_EPSILON) {
    return { state: 'PAID', status: 'PAID', due: 0, credit };
  }
  if (netReceived > MONEY_EPSILON) {
    return { state: 'PART_PAID', status: 'PARTIAL', due, credit };
  }
  return { state: 'ISSUED', status: 'DUE', due, credit };
}

/* =========================================================
   CALCULATIONS
========================================================= */

export function calculateSalesLines(
  items: SalesWorkflowLineInput[],
  supplyType: SalesSupplyType,
): SalesCalculatedTotals {
  if (!items.length) {
    throw new Error('Add at least one item.');
  }

  const calculated: SalesCalculatedLine[] = items.map(item => {
    const productId = trim(item.productId);
    if (!productId) throw new Error('Every line requires an item.');

    const quantity = roundQuantity(number(item.quantity));
    const unitPrice = roundSalesMoney(number(item.unitPrice));
    const gstRate = number(item.gstRate);

    assertPositive(quantity, 'Quantity');
    assertNonNegative(unitPrice, 'Rate');
    assertGstRate(gstRate);

    const taxableAmount = roundSalesMoney(quantity * unitPrice);
    const gstAmount = roundSalesMoney((taxableAmount * gstRate) / 100);
    const cgstAmount =
      supplyType === 'WITHIN_STATE'
        ? roundSalesMoney(gstAmount / 2)
        : 0;
    const sgstAmount =
      supplyType === 'WITHIN_STATE'
        ? roundSalesMoney(gstAmount - cgstAmount)
        : 0;
    const igstAmount =
      supplyType === 'OTHER_STATE'
        ? gstAmount
        : 0;

    return {
      productId,
      sourceItemId: optional(item.sourceItemId),
      quantity,
      unitPrice,
      gstRate,
      discount: 0,
      taxableAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: roundSalesMoney(taxableAmount + gstAmount),
    };
  });

  return {
    items: calculated,
    subtotal: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.taxableAmount, 0),
    ),
    discount: 0,
    gstAmount: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.gstAmount, 0),
    ),
    cgstAmount: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.cgstAmount, 0),
    ),
    sgstAmount: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.sgstAmount, 0),
    ),
    igstAmount: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.igstAmount, 0),
    ),
    totalAmount: roundSalesMoney(
      calculated.reduce((sum, item) => sum + item.totalAmount, 0),
    ),
  };
}

export function calculateSalesReturn(
  invoiceItems: SalesWorkflowLine[],
  items: SalesReturnLineInput[],
  supplyType: SalesSupplyType,
): SalesCalculatedTotals {
  if (!items.length) {
    throw new Error('Select at least one invoice line to return.');
  }

  const sourceById = new Map(invoiceItems.map(item => [item.id, item]));
  const seen = new Set<string>();

  const calculated: SalesCalculatedLine[] = items.map(item => {
    const sourceItemId = trim(item.sourceItemId);

    if (!sourceItemId) {
      throw new Error('Every return line must reference an invoice line.');
    }

    if (seen.has(sourceItemId)) {
      throw new Error(
        'The same invoice line cannot be returned twice in one return.',
      );
    }

    seen.add(sourceItemId);

    const source = sourceById.get(sourceItemId);

    if (!source) {
      throw new Error(
        'A return line does not belong to the selected invoice.',
      );
    }

    const quantity = roundQuantity(number(item.quantity));

    assertPositive(
      quantity,
      `${source.productName}: return quantity`,
    );

    if (
      quantity - source.returnableQuantity >
      QTY_EPSILON
    ) {
      throw new Error(
        `${source.productName}: only ${source.returnableQuantity} can still be returned.`,
      );
    }

    const ratio =
      source.quantity > 0
        ? quantity / source.quantity
        : 0;

    const taxableAmount = roundSalesMoney(
      source.taxableAmount * ratio,
    );

    const gstAmount = roundSalesMoney(
      source.gstAmount * ratio,
    );

    const cgstAmount =
      source.cgstAmount == null
        ? supplyType === 'WITHIN_STATE'
          ? roundSalesMoney(gstAmount / 2)
          : 0
        : roundSalesMoney(source.cgstAmount * ratio);

    const sgstAmount =
      source.sgstAmount == null
        ? supplyType === 'WITHIN_STATE'
          ? roundSalesMoney(gstAmount - cgstAmount)
          : 0
        : roundSalesMoney(source.sgstAmount * ratio);

    const igstAmount =
      source.igstAmount == null
        ? supplyType === 'OTHER_STATE'
          ? gstAmount
          : 0
        : roundSalesMoney(source.igstAmount * ratio);

    return {
      productId: source.productId,
      sourceItemId,
      quantity,
      unitPrice: source.unitPrice,
      gstRate: source.gstRate,
      discount: 0,
      taxableAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: roundSalesMoney(
        source.totalAmount * ratio,
      ),
    };
  });

  return {
    items: calculated,
    subtotal: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.taxableAmount,
        0,
      ),
    ),
    discount: 0,
    gstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.gstAmount,
        0,
      ),
    ),
    cgstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.cgstAmount,
        0,
      ),
    ),
    sgstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.sgstAmount,
        0,
      ),
    ),
    igstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.igstAmount,
        0,
      ),
    ),
    totalAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      ),
    ),
  };
}

/* =========================================================
   DATABASE SNAPSHOTS
========================================================= */

type BusinessRow = {
  id: string;
  name: string;
  gstin: string | null;
  business_type: string;
};

type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  mobile: string | null;
  gstin: string | null;
  state: string | null;
  address: string | null;
};

type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  hsn: string | null;
  unit: string | null;
  sale_price: number;
  gst_rate: number;
  stock_quantity: number;
  item_kind: 'PRODUCT' | 'SERVICE' | null;
};

async function getBusinessSnapshot(
  db: SQLite.SQLiteDatabase,
  businessId: string,
): Promise<SalesPartySnapshot> {
  const row = await db.getFirstAsync<BusinessRow>(
    `SELECT id, name, gstin, business_type FROM businesses WHERE id = ? LIMIT 1`,
    businessId,
  );
  if (!row) throw new Error('Business setup is required before creating a sales document.');
  return {
    id: row.id,
    name: row.name,
    gstin: optional(row.gstin),
    businessType: row.business_type,
  };
}

async function getCustomerSnapshot(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  customerId?: string,
): Promise<SalesPartySnapshot> {
  if (!customerId) {
    return { name: 'Walk-in Customer' };
  }

  const row = await db.getFirstAsync<CustomerRow>(
    `SELECT id, business_id, name, mobile, gstin, state, address
       FROM customers WHERE business_id = ? AND id = ? LIMIT 1`,
    businessId,
    customerId,
  );
  if (!row) throw new Error('The selected customer does not belong to the active business.');
  return {
    id: row.id,
    name: row.name,
    mobile: optional(row.mobile),
    gstin: optional(row.gstin),
    state: optional(row.state),
    address: optional(row.address),
  };
}

async function getPdfSettings(
  db: SQLite.SQLiteDatabase,
  businessId: string,
): Promise<SalesPdfSettings | null> {
  const row = await db.getFirstAsync<{ settings_json: string }>(
    `SELECT settings_json FROM sales_pdf_settings WHERE business_id = ? LIMIT 1`,
    businessId,
  );
  return row ? safeJson<SalesPdfSettings>(row.settings_json, {}) : null;
}

export async function getSalesPdfSettings(
  businessId: string,
): Promise<SalesPdfSettings | null> {
  const db = await getDatabase();
  return getPdfSettings(db, businessId);
}

export async function saveSalesPdfSettings(
  businessId: string,
  settings: SalesPdfSettings,
): Promise<void> {
  await withSalesTransaction(async db => {
    await getBusinessSnapshot(db, businessId);
    await db.runAsync(
      `INSERT INTO sales_pdf_settings (business_id, settings_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (business_id) DO UPDATE SET
         settings_json = excluded.settings_json,
         updated_at = excluded.updated_at`,
      businessId,
      json(settings),
      new Date().toISOString(),
    );
  });
}

async function getProductRows(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  productIds: string[],
): Promise<Map<string, ProductRow>> {
  const unique = [...new Set(productIds.map(trim).filter(Boolean))];
  if (!unique.length) return new Map();
  const placeholders = unique.map(() => '?').join(',');
  const rows = await db.getAllAsync<ProductRow>(
    `SELECT id, business_id, name, hsn, unit, sale_price, gst_rate, stock_quantity, item_kind
       FROM products
      WHERE business_id = ? AND id IN (${placeholders})`,
    businessId,
    ...unique,
  );
  const result = new Map(rows.map(row => [row.id, row]));
  if (result.size !== unique.length) {
    throw new Error('One or more selected items are unavailable in this business.');
  }
  return result;
}

/* =========================================================
   DOCUMENT NUMBER ALLOCATION
========================================================= */

async function documentNumberExists(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  documentNumber: string,
): Promise<boolean> {
  if (type === 'SALES_INVOICE') {
    const row = await db.getFirstAsync<{ found: number }>(
      `SELECT 1 AS found FROM sales
       WHERE business_id = ? AND trim(invoice_number) = ? COLLATE NOCASE LIMIT 1`,
      businessId,
      documentNumber,
    );
    return Boolean(row);
  }
  const table = TABLES[type].header;
  const row = await db.getFirstAsync<{ found: number }>(
    `SELECT 1 AS found FROM ${table}
     WHERE business_id = ? AND document_number = ? COLLATE NOCASE LIMIT 1`,
    businessId,
    documentNumber,
  );
  return Boolean(row);
}

async function allocateDocumentNumber(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
): Promise<string> {
  const prefix = SALES_DOCUMENT_PREFIXES[type];
  const now = new Date().toISOString();

  let row = await db.getFirstAsync<{ last_number: number }>(
    `SELECT last_number FROM sales_document_sequences
     WHERE business_id = ? AND document_type = ?`,
    businessId,
    type,
  );

  let serial = Math.max(1000, Math.floor(number(row?.last_number)));

  // Also look at live rows, because the legacy POS path may have inserted an
  // invoice after the migration seeded the sequence table.
  if (type === 'SALES_INVOICE') {
    const live = await db.getAllAsync<{ saved_number: string | null }>(
      `SELECT invoice_number AS saved_number FROM sales
       WHERE business_id = ? AND invoice_number IS NOT NULL`,
      businessId,
    );
    const expression = /^INV-(\d+)$/i;
    for (const item of live) {
      const match = expression.exec(trim(item.saved_number));
      const n = match ? Number(match[1]) : NaN;
      if (Number.isSafeInteger(n)) serial = Math.max(serial, n);
    }
  }

  do {
    serial += 1;
    if (!Number.isSafeInteger(serial) || serial > MAX_SAFE_SERIAL) {
      throw new Error('Sales document number sequence is exhausted.');
    }
  } while (await documentNumberExists(db, businessId, type, `${prefix}-${serial}`));

  await db.runAsync(
    `INSERT INTO sales_document_sequences
       (business_id, document_type, last_number, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (business_id, document_type) DO UPDATE SET
       last_number = excluded.last_number,
       updated_at = excluded.updated_at`,
    businessId,
    type,
    serial,
    now,
  );

  return `${prefix}-${serial}`;
}

/* =========================================================
   WORKFLOW ROW TYPES
========================================================= */

type WorkflowHeaderRow = {
  id: string;
  business_id: string;
  document_type: SalesDocumentType;
  document_number: string;
  customer_id: string | null;
  customer_name: string | null;
  document_date: string;
  due_date: string | null;
  reference_number: string | null;
  supply_type: SalesSupplyType | null;
  subtotal: number;
  gst_amount: number;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  return_amount: number;
  refunded_amount: number;
  customer_credit: number;
  payment_status: PaymentStatus | null;
  document_state: SalesDocumentState;
  source_type: SalesDocumentType | null;
  source_id: string | null;
  source_number: string | null;
  next_type: SalesDocumentType | null;
  next_id: string | null;
  next_number: string | null;
  line_count: number;
  business_snapshot: string | null;
  customer_snapshot: string | null;
  custom_fields: string | null;
  pdf_settings_snapshot: string | null;
  snapshot_status: SalesSnapshotStatus;
  inventory_posting_status: SalesInventoryPostingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkflowItemRow = {
  id: string;
  document_id: string;
  product_id: string;
  product_name: string | null;
  hsn: string | null;
  unit: string | null;
  item_kind: 'PRODUCT' | 'SERVICE' | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount: number;
  taxable_amount: number | null;
  gst_amount: number;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  total_amount: number;
  source_item_id: string | null;
  position: number;
  returned_quantity: number;
  snapshot_status: SalesSnapshotStatus;
  created_at: string;
};

function mapWorkflowDocument(row: WorkflowHeaderRow): SalesWorkflowDocument {
  const source = row.source_type && row.source_id
    ? {
        documentType: row.source_type,
        id: row.source_id,
        documentNumber: optional(row.source_number),
      }
    : null;
  const nextDocument = row.next_type && row.next_id
    ? {
        documentType: row.next_type,
        id: row.next_id,
        documentNumber: optional(row.next_number),
      }
    : null;

  const customerSnapshot = safeJson<SalesPartySnapshot>(
    row.customer_snapshot,
    { name: row.customer_name || 'Walk-in Customer' },
  );
  if (!customerSnapshot.name) customerSnapshot.name = row.customer_name || 'Walk-in Customer';

  return {
    id: row.id,
    businessId: row.business_id,
    documentType: row.document_type,
    documentNumber: row.document_number,
    customerId: optional(row.customer_id),
    customerName: row.customer_name || customerSnapshot.name || 'Walk-in Customer',
    documentDate: row.document_date,
    dueDate: optional(row.due_date),
    referenceNumber: optional(row.reference_number),
    supplyType: row.supply_type,
    subtotal: number(row.subtotal),
    gstAmount: number(row.gst_amount),
    cgstAmount: row.cgst_amount == null ? null : number(row.cgst_amount),
    sgstAmount: row.sgst_amount == null ? null : number(row.sgst_amount),
    igstAmount: row.igst_amount == null ? null : number(row.igst_amount),
    discount: number(row.discount),
    totalAmount: number(row.total_amount),
    paidAmount: number(row.paid_amount),
    dueAmount: number(row.due_amount),
    returnAmount: number(row.return_amount),
    refundedAmount: number(row.refunded_amount),
    customerCredit: number(row.customer_credit),
    paymentStatus: row.payment_status,
    state: row.document_state,
    source,
    nextDocument,
    lineCount: number(row.line_count),
    business: safeJson<SalesPartySnapshot>(row.business_snapshot, { name: 'Business' }),
    customer: customerSnapshot,
    customFields: safeJson<SalesCustomField[]>(row.custom_fields, []),
    pdfSettingsSnapshot: row.pdf_settings_snapshot
      ? safeJson<SalesPdfSettings>(row.pdf_settings_snapshot, {})
      : null,
    snapshotStatus: row.snapshot_status,
    inventoryPostingStatus: row.inventory_posting_status,
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkflowLine(row: WorkflowItemRow): SalesWorkflowLine {
  const quantity = number(row.quantity);
  const returned = number(row.returned_quantity);
  return {
    id: row.id,
    documentId: row.document_id,
    productId: row.product_id,
    productName: row.product_name || 'Item',
    hsn: optional(row.hsn),
    unit: optional(row.unit),
    itemKind: row.item_kind,
    quantity,
    unitPrice: number(row.unit_price),
    gstRate: number(row.gst_rate),
    discount: number(row.discount),
    taxableAmount: row.taxable_amount == null
      ? roundSalesMoney(Math.max(0, quantity * number(row.unit_price) - number(row.discount)))
      : number(row.taxable_amount),
    gstAmount: number(row.gst_amount),
    cgstAmount: row.cgst_amount == null ? null : number(row.cgst_amount),
    sgstAmount: row.sgst_amount == null ? null : number(row.sgst_amount),
    igstAmount: row.igst_amount == null ? null : number(row.igst_amount),
    totalAmount: number(row.total_amount),
    sourceItemId: optional(row.source_item_id),
    position: number(row.position),
    returnedQuantity: returned,
    returnableQuantity: Math.max(0, roundQuantity(quantity - returned)),
    snapshotStatus: row.snapshot_status,
    createdAt: row.created_at,
  };
}

/* =========================================================
   WORKFLOW SELECTS
========================================================= */

function headerSelect(type: SalesDocumentType): string {
  if (type === 'SALES_INVOICE') {
    return `
      SELECT
        s.id,
        s.business_id,
        'SALES_INVOICE' AS document_type,
        COALESCE(NULLIF(trim(s.invoice_number), ''), 'Legacy invoice') AS document_number,
        s.customer_id,
        COALESCE(json_extract(s.customer_snapshot, '$.name'), c.name, 'Walk-in Customer') AS customer_name,
        s.sale_date AS document_date,
        s.due_date,
        s.reference_number,
        s.supply_type,
        s.subtotal,
        s.gst_amount,
        s.cgst_amount,
        s.sgst_amount,
        s.igst_amount,
        s.discount,
        s.total_amount,
        s.paid_amount,
        s.due_amount,
        s.return_amount,
        s.refunded_amount,
        s.customer_credit,
        CASE WHEN s.payment_status IN ('PAID','PARTIAL','DUE') THEN s.payment_status ELSE 'DUE' END AS payment_status,
        s.document_state,
        s.source_type,
        s.source_id,
        src.document_number AS source_number,
        NULL AS next_type,
        NULL AS next_id,
        NULL AS next_number,
        (SELECT COUNT(*) FROM sale_items i WHERE i.sale_id = s.id) AS line_count,
        s.business_snapshot,
        s.customer_snapshot,
        s.custom_fields,
        s.pdf_settings_snapshot,
        s.snapshot_status,
        s.inventory_posting_status,
        s.notes,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN customers c ON c.business_id = s.business_id AND c.id = s.customer_id
      LEFT JOIN sales_delivery_challans src
        ON src.business_id = s.business_id AND src.id = s.source_id
    `;
  }

  const table = TABLES[type].header;
  const items = TABLES[type].items;
  const nextType = SALES_NEXT_DOCUMENT[type];
  const nextNumberJoin = nextType
    ? nextType === 'SALES_INVOICE'
      ? `LEFT JOIN sales nxt ON nxt.business_id = h.business_id AND nxt.source_type = '${type}' AND nxt.source_id = h.id`
      : `LEFT JOIN ${TABLES[nextType as Exclude<SalesDocumentType, 'SALES_INVOICE'>].header} nxt
           ON nxt.business_id = h.business_id AND nxt.source_type = '${type}' AND nxt.source_id = h.id`
    : '';

  const nextNumberExpression = nextType
    ? nextType === 'SALES_INVOICE'
      ? `nxt.invoice_number`
      : `nxt.document_number`
    : `NULL`;

  const sourceJoin = type === 'SALES_ORDER'
    ? `LEFT JOIN sales_quotations src ON src.business_id = h.business_id AND src.id = h.source_id`
    : type === 'DELIVERY_CHALLAN'
      ? `LEFT JOIN sales_orders src ON src.business_id = h.business_id AND src.id = h.source_id`
      : type === 'SALES_RETURN'
        ? `LEFT JOIN sales src ON src.business_id = h.business_id AND src.id = h.source_id`
        : '';

  const sourceNumberExpression = type === 'SALES_RETURN'
    ? `src.invoice_number`
    : type === 'QUOTATION'
      ? `NULL`
      : `src.document_number`;

  const financial = type === 'SALES_RETURN';

  return `
    SELECT
      h.id,
      h.business_id,
      '${type}' AS document_type,
      h.document_number,
      h.customer_id,
      COALESCE(json_extract(h.customer_snapshot, '$.name'), c.name, 'Walk-in Customer') AS customer_name,
      h.document_date,
      h.due_date,
      h.reference_number,
      h.supply_type,
      h.subtotal,
      h.gst_amount,
      h.cgst_amount,
      h.sgst_amount,
      h.igst_amount,
      h.discount,
      h.total_amount,
      0 AS paid_amount,
      0 AS due_amount,
      0 AS return_amount,
      h.refunded_amount,
      0 AS customer_credit,
      NULL AS payment_status,
      h.document_state,
      h.source_type,
      h.source_id,
      ${sourceNumberExpression} AS source_number,
      ${nextType ? `'${nextType}'` : 'NULL'} AS next_type,
      ${nextType ? 'nxt.id' : 'NULL'} AS next_id,
      ${nextNumberExpression} AS next_number,
      (SELECT COUNT(*) FROM ${items} i WHERE i.document_id = h.id) AS line_count,
      h.business_snapshot,
      h.customer_snapshot,
      h.custom_fields,
      h.pdf_settings_snapshot,
      h.snapshot_status,
      h.inventory_posting_status,
      h.notes,
      h.created_at,
      h.updated_at
    FROM ${table} h
    LEFT JOIN customers c ON c.business_id = h.business_id AND c.id = h.customer_id
    ${sourceJoin}
    ${nextNumberJoin}
  `;
}

async function getHeader(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  id: string,
): Promise<SalesWorkflowDocument | null> {
  const row = await db.getFirstAsync<WorkflowHeaderRow>(
    `${headerSelect(type)} WHERE ${type === 'SALES_INVOICE' ? 's' : 'h'}.business_id = ? AND ${type === 'SALES_INVOICE' ? 's' : 'h'}.id = ? LIMIT 1`,
    businessId,
    id,
  );
  if (!row) return null;

  // Invoice next relation is return(s), so do not expose one arbitrary return as
  // a forward conversion. Returns are available separately from the workflow.
  return mapWorkflowDocument(row);
}

async function getItems(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  id: string,
): Promise<SalesWorkflowLine[]> {
  if (type === 'SALES_INVOICE') {
    const rows = await db.getAllAsync<WorkflowItemRow>(
      `SELECT
         i.id,
         i.sale_id AS document_id,
         i.product_id,
         COALESCE(i.product_name, p.name, 'Item') AS product_name,
         COALESCE(i.hsn, p.hsn) AS hsn,
         COALESCE(i.unit, p.unit) AS unit,
         i.item_kind,
         i.quantity,
         i.unit_price,
         i.gst_rate,
         i.discount,
         i.taxable_amount,
         i.gst_amount,
         i.cgst_amount,
         i.sgst_amount,
         i.igst_amount,
         i.total_amount,
         i.source_item_id,
         i.position,
         COALESCE((
           SELECT SUM(ri.quantity)
           FROM sales_return_items ri
           JOIN sales_returns r ON r.id = ri.document_id
           WHERE r.business_id = ? AND r.source_id = i.sale_id AND ri.source_item_id = i.id
         ), 0) AS returned_quantity,
         i.snapshot_status,
         i.created_at
       FROM sale_items i
       LEFT JOIN products p ON p.id = i.product_id AND p.business_id = ?
       WHERE i.sale_id = ? AND (i.business_id = ? OR i.business_id IS NULL)
       ORDER BY i.position ASC, i.created_at ASC, i.id ASC`,
      businessId,
      businessId,
      id,
      businessId,
    );
    return rows.map(mapWorkflowLine);
  }

  const table = TABLES[type].items;
  const rows = await db.getAllAsync<WorkflowItemRow>(
    `SELECT
       i.id,
       i.document_id,
       i.product_id,
       i.product_name,
       i.hsn,
       i.unit,
       i.item_kind,
       i.quantity,
       i.unit_price,
       i.gst_rate,
       i.discount,
       i.taxable_amount,
       i.gst_amount,
       i.cgst_amount,
       i.sgst_amount,
       i.igst_amount,
       i.total_amount,
       i.source_item_id,
       i.position,
       0 AS returned_quantity,
       i.snapshot_status,
       i.created_at
     FROM ${table} i
     WHERE i.business_id = ? AND i.document_id = ?
     ORDER BY i.position ASC, i.created_at ASC, i.id ASC`,
    businessId,
    id,
  );
  return rows.map(mapWorkflowLine);
}

export async function getSalesWorkflow(
  businessId: string,
): Promise<SalesWorkflowDocument[]> {
  const db = await getDatabase();
  const result: SalesWorkflowDocument[] = [];

  for (const type of [
    'QUOTATION',
    'SALES_ORDER',
    'DELIVERY_CHALLAN',
    'SALES_INVOICE',
    'SALES_RETURN',
  ] as SalesDocumentType[]) {
    const alias = type === 'SALES_INVOICE' ? 's' : 'h';
    const rows = await db.getAllAsync<WorkflowHeaderRow>(
      `${headerSelect(type)} WHERE ${alias}.business_id = ?`,
      businessId,
    );
    result.push(...rows.map(mapWorkflowDocument));
  }

  result.sort((a, b) => {
    const date = b.documentDate.localeCompare(a.documentDate);
    if (date) return date;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return result;
}

export async function getSalesWorkflowDocument(
  businessId: string,
  type: SalesDocumentType,
  id: string,
): Promise<SalesWorkflowDetail | null> {
  const db = await getDatabase();
  const document = await getHeader(db, businessId, type, id);
  if (!document) return null;
  const items = await getItems(db, businessId, type, id);
  const payments = type === 'SALES_INVOICE' || type === 'SALES_RETURN'
    ? await getSalesPaymentsInternal(
        db,
        businessId,
        type === 'SALES_RETURN' ? document.source?.id ?? '' : id,
      )
    : [];
  return { document, items, payments };
}

/* =========================================================
   SOURCE VALIDATION / NORMALIZATION
========================================================= */

async function validateSource(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  source: SalesDocumentReference | undefined,
  customerId: string | undefined,
  documentDate: string,
): Promise<SalesWorkflowDetail | null> {
  if (!source) return null;

  const expected = type === 'SALES_RETURN'
    ? 'SALES_INVOICE'
    : Object.entries(SALES_NEXT_DOCUMENT).find(([, target]) => target === type)?.[0] as SalesDocumentType | undefined;

  if (!expected || source.documentType !== expected) {
    throw new Error('This sales document cannot be created from the selected source.');
  }

  const detail = await loadDetailWithDb(db, businessId, source.documentType, source.id);
  if (!detail) throw new Error('The selected source sales document could not be found.');
  if ((detail.document.customerId ?? '') !== (customerId ?? '')) {
    throw new Error('The customer must match the source sales document.');
  }
  if (documentDate < detail.document.documentDate) {
    throw new Error('Document date cannot be before the source document date.');
  }
  if (type !== 'SALES_RETURN' && detail.document.nextDocument) {
    throw new Error('This source document has already been converted.');
  }
  return detail;
}

async function loadDetailWithDb(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  id: string,
): Promise<SalesWorkflowDetail | null> {
  const document = await getHeader(db, businessId, type, id);
  if (!document) return null;
  const items = await getItems(db, businessId, type, id);
  const payments = type === 'SALES_INVOICE'
    ? await getSalesPaymentsInternal(db, businessId, id)
    : type === 'SALES_RETURN' && document.source?.id
      ? await getSalesPaymentsInternal(db, businessId, document.source.id)
      : [];
  return { document, items, payments };
}

function normalizeCustomFields(fields: SalesCustomField[] | undefined): SalesCustomField[] {
  const result: SalesCustomField[] = [];
  const keys = new Set<string>();
  for (const field of fields ?? []) {
    const key = trim(field.key);
    const label = trim(field.label);
    const value = trim(field.value);
    if (!key || !label || !value) continue;
    if (keys.has(key)) throw new Error(`Duplicate custom field: ${label}.`);
    keys.add(key);
    result.push({ key, label, value });
  }
  return result;
}

function validateWorkflowInput(input: CreateSalesWorkflowInput): void {
  if (!trim(input.businessId)) throw new Error('Business is required.');
  if (!validDate(trim(input.documentDate))) throw new Error('Enter a valid document date in YYYY-MM-DD format.');
  if (input.dueDate && !validDate(trim(input.dueDate))) throw new Error('Enter a valid due date in YYYY-MM-DD format.');
  if (input.dueDate && trim(input.dueDate) < trim(input.documentDate)) {
    throw new Error('Due date cannot be before the document date.');
  }
  if (!input.items.length) throw new Error('Add at least one item.');
  if (input.items.length > 500) throw new Error('A document can contain up to 500 lines.');
}

function deriveLinkedLines(
  source: SalesWorkflowDetail,
  submitted: SalesWorkflowLineInput[],
  supplyType: SalesSupplyType,
): SalesCalculatedTotals {
  const sourceById = new Map(
    source.items.map(item => [item.id, item]),
  );

  const seen = new Set<string>();

  const calculated: SalesCalculatedLine[] =
    submitted.map(item => {
      const sourceItemId = trim(item.sourceItemId);

      if (!sourceItemId) {
        throw new Error(
          'Every converted line must reference its source line.',
        );
      }

      if (seen.has(sourceItemId)) {
        throw new Error(
          'A source line cannot be used twice in the same conversion.',
        );
      }

      seen.add(sourceItemId);

      const original = sourceById.get(sourceItemId);

      if (
        !original ||
        original.productId !== trim(item.productId)
      ) {
        throw new Error(
          'A converted line does not match its source line.',
        );
      }

      const quantity = roundQuantity(
        number(item.quantity),
      );

      assertPositive(
        quantity,
        `${original.productName}: quantity`,
      );

      if (
        quantity - original.quantity >
        QTY_EPSILON
      ) {
        throw new Error(
          `${original.productName}: quantity exceeds the source quantity ${original.quantity}.`,
        );
      }

      const ratio =
        original.quantity > 0
          ? quantity / original.quantity
          : 0;

      const taxableAmount = roundSalesMoney(
        original.taxableAmount * ratio,
      );

      const gstAmount = roundSalesMoney(
        original.gstAmount * ratio,
      );

      const cgstAmount =
        original.cgstAmount == null
          ? supplyType === 'WITHIN_STATE'
            ? roundSalesMoney(gstAmount / 2)
            : 0
          : roundSalesMoney(
              original.cgstAmount * ratio,
            );

      const sgstAmount =
        original.sgstAmount == null
          ? supplyType === 'WITHIN_STATE'
            ? roundSalesMoney(
                gstAmount - cgstAmount,
              )
            : 0
          : roundSalesMoney(
              original.sgstAmount * ratio,
            );

      const igstAmount =
        original.igstAmount == null
          ? supplyType === 'OTHER_STATE'
            ? gstAmount
            : 0
          : roundSalesMoney(
              original.igstAmount * ratio,
            );

      return {
        productId: original.productId,
        sourceItemId,
        quantity,
        unitPrice: original.unitPrice,
        gstRate: original.gstRate,
        discount: 0,
        taxableAmount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount: roundSalesMoney(
          original.totalAmount * ratio,
        ),
      };
    });

  return {
    items: calculated,
    subtotal: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.taxableAmount,
        0,
      ),
    ),
    discount: 0,
    gstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.gstAmount,
        0,
      ),
    ),
    cgstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.cgstAmount,
        0,
      ),
    ),
    sgstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.sgstAmount,
        0,
      ),
    ),
    igstAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.igstAmount,
        0,
      ),
    ),
    totalAmount: roundSalesMoney(
      calculated.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      ),
    ),
  };
}

/* =========================================================
   INSERT DOCUMENT
========================================================= */

async function insertWorkflowItems(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: SalesDocumentType,
  documentId: string,
  sourceDocumentId: string | undefined,
  calculated: SalesCalculatedTotals,
  products: Map<string, ProductRow>,
  now: string,
): Promise<void> {
  for (let position = 0; position < calculated.items.length; position += 1) {
    const item = calculated.items[position];
    const product = products.get(item.productId);
    if (!product) throw new Error('A selected item is unavailable.');

    const itemKind =
      product.item_kind === 'SERVICE'
        ? 'SERVICE'
        : 'PRODUCT';
    const itemId = makeId('sale_line');

    if (type === 'SALES_INVOICE') {
      await db.runAsync(
        `INSERT INTO sale_items (
           id, sale_id, business_id, product_id, product_name, hsn, unit, item_kind,
           quantity, unit_price, gst_rate, discount, taxable_amount, gst_amount,
           cgst_amount, sgst_amount, igst_amount, total_amount, position,
           source_document_id, source_item_id, snapshot_status, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAVED', ?)`,
        itemId,
        documentId,
        businessId,
        product.id,
        product.name,
        product.hsn,
        product.unit,
        itemKind,
        item.quantity,
        item.unitPrice,
        item.gstRate,
        item.discount,
        item.taxableAmount,
        item.gstAmount,
        item.cgstAmount,
        item.sgstAmount,
        item.igstAmount,
        item.totalAmount,
        position,
        sourceDocumentId ?? null,
        item.sourceItemId ?? null,
        now,
      );
      continue;
    }

    const itemTable = TABLES[type as Exclude<SalesDocumentType, 'SALES_INVOICE'>].items;
    await db.runAsync(
      `INSERT INTO ${itemTable} (
         id, business_id, document_id, product_id, product_name, hsn, unit, item_kind,
         quantity, unit_price, gst_rate, discount, taxable_amount, gst_amount,
         cgst_amount, sgst_amount, igst_amount, total_amount, position,
         source_document_id, source_item_id, snapshot_status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAVED', ?)`,
      itemId,
      businessId,
      documentId,
      product.id,
      product.name,
      product.hsn,
      product.unit,
      itemKind,
      item.quantity,
      item.unitPrice,
      item.gstRate,
      item.discount,
      item.taxableAmount,
      item.gstAmount,
      item.cgstAmount,
      item.sgstAmount,
      item.igstAmount,
      item.totalAmount,
      position,
      sourceDocumentId ?? null,
      item.sourceItemId ?? null,
      now,
    );
  }
}

async function postInventory(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  type: 'SALES_INVOICE' | 'SALES_RETURN',
  documentId: string,
  calculated: SalesCalculatedTotals,
  products: Map<string, ProductRow>,
  now: string,
): Promise<'POSTED' | 'NOT_APPLICABLE'> {
  let posted = false;

  for (const item of calculated.items) {
    const product = products.get(item.productId);
    if (!product) throw new Error('A selected item is unavailable.');
    // Existing catalogue rows already marked as SERVICE do not move stock.
    // Unclassified rows default to normal stock items, so the Sales form
    // no longer needs a Product / Service selector.
    if (product.item_kind === 'SERVICE') continue;

    const fresh = await db.getFirstAsync<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM products WHERE business_id = ? AND id = ? LIMIT 1`,
      businessId,
      product.id,
    );
    if (!fresh) throw new Error(`${product.name}: product no longer exists.`);

    const before = roundQuantity(number(fresh.stock_quantity));
    const delta = type === 'SALES_INVOICE' ? -item.quantity : item.quantity;
    const after = roundQuantity(before + delta);
    if (after < -QTY_EPSILON) {
      throw new Error(`${product.name}: only ${before} is available in stock.`);
    }

    await db.runAsync(
      `UPDATE products SET stock_quantity = ?, updated_at = ?
       WHERE business_id = ? AND id = ?`,
      Math.max(0, after),
      now,
      businessId,
      product.id,
    );

    await db.runAsync(
      `INSERT INTO inventory_movements (
         id, business_id, product_id, movement_type, reference_type, reference_id,
         quantity, stock_before, stock_after, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId('inv_move'),
      businessId,
      product.id,
      type === 'SALES_INVOICE' ? 'SALE_OUT' : 'SALE_RETURN_IN',
      type,
      documentId,
      Math.abs(item.quantity),
      before,
      Math.max(0, after),
      now,
    );
    posted = true;
  }

  return posted ? 'POSTED' : 'NOT_APPLICABLE';
}

async function insertDocumentLink(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  source: SalesDocumentReference | undefined,
  targetType: SalesDocumentType,
  targetId: string,
  now: string,
): Promise<void> {
  if (!source) return;
  await db.runAsync(
    `INSERT INTO sales_document_links
       (business_id, source_type, source_id, target_type, target_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    businessId,
    source.documentType,
    source.id,
    targetType,
    targetId,
    now,
  );
}

export async function createSalesWorkflowDocument(
  input: CreateSalesWorkflowInput,
): Promise<SalesWorkflowDetail> {
  validateWorkflowInput(input);

  const businessId = trim(input.businessId);
  const documentDate = trim(input.documentDate);
  const dueDate = optional(input.dueDate);
  const customerId = optional(input.customerId);
  const source = input.source;
  const customFields = normalizeCustomFields(input.customFields);

  return withSalesTransaction(async db => {
    const existing = input.id
      ? await loadDetailWithDb(db, businessId, input.documentType, trim(input.id))
      : null;
    if (existing) return existing;

    const businessSnapshot = await getBusinessSnapshot(db, businessId);
    const customerSnapshot = await getCustomerSnapshot(db, businessId, customerId);
    const pdfSettings = await getPdfSettings(db, businessId);
    const sourceDetail = await validateSource(
      db,
      businessId,
      input.documentType,
      source,
      customerId,
      documentDate,
    );

    if (
      sourceDetail &&
      input.documentType !== 'SALES_RETURN' &&
      sourceDetail.document.supplyType &&
      sourceDetail.document.supplyType !== input.supplyType
    ) {
      throw new Error('Supply type must match the source sales document.');
    }

    let calculated: SalesCalculatedTotals;
    if (input.documentType === 'SALES_RETURN') {
      if (!sourceDetail || sourceDetail.document.documentType !== 'SALES_INVOICE') {
        throw new Error('A sales return must be linked to an original tax invoice.');
      }
      if (!sourceDetail.document.supplyType) {
        throw new Error('The original invoice has no saved supply type and cannot be safely returned through the workflow.');
      }
      calculated = calculateSalesReturn(
        sourceDetail.items,
        input.items,
        sourceDetail.document.supplyType,
      );
    } else if (sourceDetail) {
      calculated = deriveLinkedLines(
        sourceDetail,
        input.items,
        input.supplyType,
      );
    } else {
      calculated = calculateSalesLines(input.items, input.supplyType);
    }

    if (calculated.totalAmount <= MONEY_EPSILON && input.documentType !== 'QUOTATION') {
      throw new Error('Document total must be greater than zero.');
    }

    const productIds = calculated.items.map(item => item.productId);
    const products = await getProductRows(db, businessId, productIds);

    if (input.documentType === 'SALES_RETURN' && sourceDetail) {
      const originalById = new Map(sourceDetail.items.map(item => [item.id, item]));
      for (const item of calculated.items) {
        const sourceLine = item.sourceItemId ? originalById.get(item.sourceItemId) : undefined;
        const product = products.get(item.productId);
        if (!sourceLine || !product) throw new Error('A return line no longer matches its invoice item.');
        products.set(item.productId, {
          ...product,
          item_kind:
            sourceLine.itemKind === 'SERVICE'
              ? 'SERVICE'
              : product.item_kind,
        });
      }
    }

    const documentId = trim(input.id) || makeId(`sales_${input.documentType.toLowerCase()}`);
    const documentNumber = await allocateDocumentNumber(db, businessId, input.documentType);
    const now = new Date().toISOString();

    if (input.documentType === 'SALES_INVOICE') {
      const initial = stateForInvoice(calculated.totalAmount, 0, 0, 0);
      await db.runAsync(
        `INSERT INTO sales (
           id, business_id, customer_id, invoice_number, sale_date, due_date,
           reference_number, supply_type, subtotal, gst_amount, cgst_amount,
           sgst_amount, igst_amount, discount, total_amount, paid_amount,
           due_amount, return_amount, refunded_amount, customer_credit,
           payment_method, payment_status, notes, source_type, source_id,
           custom_fields, business_snapshot, customer_snapshot,
           pdf_settings_snapshot, document_state, snapshot_status,
           inventory_posting_status, request_fingerprint, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0,
                   'CREDIT', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAVED', 'NOT_APPLICABLE', NULL, ?, ?)`,
        documentId,
        businessId,
        customerId ?? null,
        documentNumber,
        documentDate,
        dueDate ?? null,
        optional(input.referenceNumber) ?? null,
        input.supplyType,
        calculated.subtotal,
        calculated.gstAmount,
        calculated.cgstAmount,
        calculated.sgstAmount,
        calculated.igstAmount,
        calculated.discount,
        calculated.totalAmount,
        initial.due,
        initial.status,
        optional(input.notes) ?? null,
        source?.documentType ?? null,
        source?.id ?? null,
        json(customFields),
        json(businessSnapshot),
        json(customerSnapshot),
        pdfSettings ? json(pdfSettings) : null,
        initial.state,
        now,
        now,
      );

      await insertWorkflowItems(
        db,
        businessId,
        input.documentType,
        documentId,
        source?.id,
        calculated,
        products,
        now,
      );

      const posting = await postInventory(
        db,
        businessId,
        'SALES_INVOICE',
        documentId,
        calculated,
        products,
        now,
      );
      await db.runAsync(
        `UPDATE sales SET inventory_posting_status = ?, updated_at = ? WHERE business_id = ? AND id = ?`,
        posting,
        now,
        businessId,
        documentId,
      );
      await insertDocumentLink(db, businessId, source, input.documentType, documentId, now);
    } else if (input.documentType === 'SALES_RETURN') {
      const invoice = sourceDetail?.document;
      if (!invoice || !source) throw new Error('Original invoice is required.');

      const remainingValue = Math.max(0, roundSalesMoney(invoice.totalAmount - invoice.returnAmount));
      if (calculated.totalAmount - remainingValue > MONEY_EPSILON) {
        throw new Error('Return value exceeds the remaining value of the original invoice.');
      }

      const table = TABLES.SALES_RETURN.header;
      await db.runAsync(
        `INSERT INTO ${table} (
           id, business_id, document_number, customer_id, document_date,
           due_date, reference_number, supply_type, subtotal, gst_amount,
           cgst_amount, sgst_amount, igst_amount, discount, total_amount,
           refunded_amount, source_type, source_id, custom_fields,
           business_snapshot, customer_snapshot, pdf_settings_snapshot,
           snapshot_status, document_state, inventory_posting_status,
           request_fingerprint, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0,
                   'SALES_INVOICE', ?, ?, ?, ?, ?, 'SAVED', 'ISSUED',
                   'NOT_APPLICABLE', NULL, ?, ?, ?)`,
        documentId,
        businessId,
        documentNumber,
        customerId ?? null,
        documentDate,
        dueDate ?? null,
        optional(input.referenceNumber) ?? null,
        invoice.supplyType,
        calculated.subtotal,
        calculated.gstAmount,
        calculated.cgstAmount,
        calculated.sgstAmount,
        calculated.igstAmount,
        calculated.discount,
        calculated.totalAmount,
        source.id,
        json(customFields),
        json(businessSnapshot),
        json(customerSnapshot),
        pdfSettings ? json(pdfSettings) : null,
        optional(input.notes) ?? null,
        now,
        now,
      );

      await insertWorkflowItems(
        db,
        businessId,
        input.documentType,
        documentId,
        source.id,
        calculated,
        products,
        now,
      );

      const posting = await postInventory(
        db,
        businessId,
        'SALES_RETURN',
        documentId,
        calculated,
        products,
        now,
      );
      await db.runAsync(
        `UPDATE sales_returns SET inventory_posting_status = ?, updated_at = ?
         WHERE business_id = ? AND id = ?`,
        posting,
        now,
        businessId,
        documentId,
      );
      await insertDocumentLink(db, businessId, source, input.documentType, documentId, now);
      await recomputeInvoiceBalances(db, businessId, source.id);

      if (input.refund && input.refund.amount > MONEY_EPSILON) {
        await insertSalesPaymentInternal(db, {
          ...input.refund,
          businessId,
          invoiceId: source.id,
          returnId: documentId,
          direction: 'REFUND',
        });
      }
    } else {
      const table = TABLES[input.documentType].header;
      await db.runAsync(
        `INSERT INTO ${table} (
           id, business_id, document_number, customer_id, document_date,
           due_date, reference_number, supply_type, subtotal, gst_amount,
           cgst_amount, sgst_amount, igst_amount, discount, total_amount,
           refunded_amount, source_type, source_id, custom_fields,
           business_snapshot, customer_snapshot, pdf_settings_snapshot,
           snapshot_status, document_state, inventory_posting_status,
           request_fingerprint, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?,
                   'SAVED', 'WORKFLOW', 'NOT_APPLICABLE', NULL, ?, ?, ?)`,
        documentId,
        businessId,
        documentNumber,
        customerId ?? null,
        documentDate,
        dueDate ?? null,
        optional(input.referenceNumber) ?? null,
        input.supplyType,
        calculated.subtotal,
        calculated.gstAmount,
        calculated.cgstAmount,
        calculated.sgstAmount,
        calculated.igstAmount,
        calculated.discount,
        calculated.totalAmount,
        source?.documentType ?? null,
        source?.id ?? null,
        json(customFields),
        json(businessSnapshot),
        json(customerSnapshot),
        pdfSettings ? json(pdfSettings) : null,
        optional(input.notes) ?? null,
        now,
        now,
      );

      await insertWorkflowItems(
        db,
        businessId,
        input.documentType,
        documentId,
        source?.id,
        calculated,
        products,
        now,
      );
      await insertDocumentLink(db, businessId, source, input.documentType, documentId, now);
    }

    const detail = await loadDetailWithDb(db, businessId, input.documentType, documentId);
    if (!detail) throw new Error('The saved sales document could not be reloaded.');
    return detail;
  });
}

/* =========================================================
   PAYMENTS HISTORY / SALES RETURN REFUNDS
========================================================= */

type PaymentRow = {
  id: string;
  business_id: string;
  document_id: string;
  document_number: string;
  party_name: string;
  direction: string;
  amount: number;
  mode: string;
  payment_date: string;
  reference: string | null;
  cheque_number: string | null;
  cheque_bank: string | null;
  cheque_date: string | null;
  created_at: string;
  return_id: string | null;
  customer_id: string | null;
};

async function getSalesPaymentsInternal(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  invoiceId: string,
): Promise<SalesPayment[]> {
  if (!invoiceId) return [];
  const rows = await db.getAllAsync<PaymentRow>(
    `SELECT
       p.id, p.business_id, p.document_id, p.document_number, p.party_name,
       l.direction, p.amount, p.mode, p.payment_date, p.reference,
       p.cheque_number, p.cheque_bank, p.cheque_date, p.created_at,
       l.return_id, s.customer_id
     FROM sales_payment_links l
     JOIN payments p ON p.business_id = l.business_id AND p.id = l.payment_id
     JOIN sales s ON s.business_id = l.business_id AND s.id = l.invoice_id
     WHERE l.business_id = ? AND l.invoice_id = ?
     ORDER BY p.payment_date ASC, p.created_at ASC`,
    businessId,
    invoiceId,
  );
  return rows.map(row => ({
    id: row.id,
    businessId: row.business_id,
    invoiceId: row.document_id,
    invoiceNumber: row.document_number,
    customerId: optional(row.customer_id),
    customerName: row.party_name,
    direction: row.direction as 'RECEIPT' | 'REFUND',
    returnId: optional(row.return_id),
    amount: number(row.amount),
    method: row.mode as SalesPayment['method'],
    paymentDate: row.payment_date,
    reference: optional(row.reference),
    chequeNumber: optional(row.cheque_number),
    chequeBank: optional(row.cheque_bank),
    chequeDate: optional(row.cheque_date),
    createdAt: row.created_at,
  }));
}

export async function getSalesPayments(
  businessId: string,
  invoiceId: string,
): Promise<SalesPayment[]> {
  const db = await getDatabase();
  return getSalesPaymentsInternal(db, businessId, invoiceId);
}

async function recomputeInvoiceBalances(
  db: SQLite.SQLiteDatabase,
  businessId: string,
  invoiceId: string,
): Promise<void> {
  const invoice = await db.getFirstAsync<{
    total_amount: number;
    payment_method: string;
  }>(
    `SELECT total_amount, payment_method FROM sales WHERE business_id = ? AND id = ? LIMIT 1`,
    businessId,
    invoiceId,
  );
  if (!invoice) throw new Error('Tax invoice could not be found.');

  const returnRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM sales_returns WHERE business_id = ? AND source_id = ?`,
    businessId,
    invoiceId,
  );
  const paymentRows = await db.getAllAsync<{ direction: string; total: number }>(
    `SELECT l.direction, COALESCE(SUM(p.amount), 0) AS total
     FROM sales_payment_links l
     JOIN payments p ON p.business_id = l.business_id AND p.id = l.payment_id
     WHERE l.business_id = ? AND l.invoice_id = ?
     GROUP BY l.direction`,
    businessId,
    invoiceId,
  );

  let receipts = 0;
  let refunds = 0;
  for (const row of paymentRows) {
    if (row.direction === 'RECEIPT') receipts = number(row.total);
    if (row.direction === 'REFUND') refunds = number(row.total);
  }

  const returned = roundSalesMoney(number(returnRow?.total));
  const status = stateForInvoice(number(invoice.total_amount), receipts, returned, refunds);
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE sales SET
       paid_amount = ?, due_amount = ?, return_amount = ?, refunded_amount = ?,
       customer_credit = ?, payment_status = ?, document_state = ?, updated_at = ?
     WHERE business_id = ? AND id = ?`,
    roundSalesMoney(receipts),
    status.due,
    returned,
    roundSalesMoney(refunds),
    status.credit,
    status.status,
    status.state,
    now,
    businessId,
    invoiceId,
  );

  await db.runAsync(
    `UPDATE sales_returns SET refunded_amount = COALESCE((
       SELECT SUM(p.amount)
       FROM sales_payment_links l
       JOIN payments p ON p.business_id = l.business_id AND p.id = l.payment_id
       WHERE l.business_id = sales_returns.business_id
         AND l.return_id = sales_returns.id
         AND l.direction = 'REFUND'
     ), 0), updated_at = ?
     WHERE business_id = ? AND source_id = ?`,
    now,
    businessId,
    invoiceId,
  );
}

async function insertSalesPaymentInternal(
  db: SQLite.SQLiteDatabase,
  input: CreateSalesPaymentInput,
): Promise<SalesPayment> {
  if (input.direction !== 'REFUND') {
    throw new Error(
      'Receipt entry is no longer available from the Sales workflow.',
    );
  }

  const amount = roundSalesMoney(
    number(input.amount),
  );

  assertPositive(amount, 'Refund amount');

  const paymentDate = trim(
    input.paymentDate,
  );

  if (!validDate(paymentDate)) {
    throw new Error(
      'Enter a valid refund date in YYYY-MM-DD format.',
    );
  }

  const invoice = await getHeader(
    db,
    trim(input.businessId),
    'SALES_INVOICE',
    trim(input.invoiceId),
  );

  if (!invoice) {
    throw new Error(
      'Tax invoice could not be found.',
    );
  }

  if (
    paymentDate <
    invoice.documentDate
  ) {
    throw new Error(
      'Refund date cannot be before the invoice date.',
    );
  }

  const returnId = trim(
    input.returnId,
  );

  const returnDoc = await getHeader(
    db,
    trim(input.businessId),
    'SALES_RETURN',
    returnId,
  );

  if (
    !returnDoc ||
    returnDoc.source?.id !== invoice.id
  ) {
    throw new Error(
      'Refund must be linked to a return for this invoice.',
    );
  }

  if (
    paymentDate <
    returnDoc.documentDate
  ) {
    throw new Error(
      'Refund date cannot be before the sales return date.',
    );
  }

  const maxRefund = Math.min(
    Math.max(
      0,
      invoice.customerCredit,
    ),
    Math.max(
      0,
      roundSalesMoney(
        returnDoc.totalAmount -
        returnDoc.refundedAmount,
      ),
    ),
  );

  if (
    amount - maxRefund >
    MONEY_EPSILON
  ) {
    throw new Error(
      `Refund cannot exceed ₹${maxRefund.toFixed(2)} for this return.`,
    );
  }

  const id =
    trim(input.id) ||
    makeId('sales_refund');

  const existing =
    await db.getFirstAsync<{
      id: string;
    }>(
      `SELECT id
         FROM payments
        WHERE business_id = ?
          AND id = ?
        LIMIT 1`,
      input.businessId,
      id,
    );

  if (existing) {
    const payments =
      await getSalesPaymentsInternal(
        db,
        input.businessId,
        input.invoiceId,
      );

    const found =
      payments.find(
        payment =>
          payment.id === id,
      );

    if (!found) {
      throw new Error(
        'Payment ID already exists for another document.',
      );
    }

    return found;
  }

  const now =
    new Date().toISOString();

  await db.runAsync(
    `INSERT INTO payments (
       id,
       business_id,
       document_type,
       document_id,
       document_number,
       party_name,
       direction,
       amount,
       mode,
       payment_date,
       reference,
       cheque_number,
       cheque_bank,
       cheque_date,
       created_at
     ) VALUES (
       ?, ?, 'SALES_INVOICE', ?, ?, ?,
       'REFUND', ?, ?, ?, ?, ?, ?, ?, ?
     )`,
    id,
    input.businessId,
    invoice.id,
    invoice.documentNumber,
    invoice.customerName,
    amount,
    input.method,
    paymentDate,
    optional(input.reference) ?? null,
    optional(input.chequeNumber) ?? null,
    optional(input.chequeBank) ?? null,
    optional(input.chequeDate) ?? null,
    now,
  );

  await db.runAsync(
    `INSERT INTO sales_payment_links (
       payment_id,
       business_id,
       invoice_id,
       direction,
       return_id,
       request_fingerprint,
       created_at
     ) VALUES (
       ?, ?, ?, 'REFUND', ?, NULL, ?
     )`,
    id,
    input.businessId,
    invoice.id,
    returnId,
    now,
  );

  await recomputeInvoiceBalances(
    db,
    input.businessId,
    invoice.id,
  );

  const payments =
    await getSalesPaymentsInternal(
      db,
      input.businessId,
      invoice.id,
    );

  const saved =
    payments.find(
      payment => payment.id === id,
    );

  if (!saved) {
    throw new Error(
      'Saved refund could not be reloaded.',
    );
  }

  return saved;
}

export async function createSalesPayment(
  input: CreateSalesPaymentInput,
): Promise<SalesPayment> {
  return withSalesTransaction(db => insertSalesPaymentInternal(db, input));
}

/* =========================================================
   SUMMARY
========================================================= */

export async function getSalesWorkflowSummary(
  businessId: string,
): Promise<SalesWorkflowSummary> {
  const db = await getDatabase();
  const invoices = await db.getFirstAsync<{
    count: number;
    gross: number;
    received: number;
    due: number;
    returns: number;
    refunded: number;
    credit: number;
  }>(
    `SELECT
       COUNT(*) AS count,
       COALESCE(SUM(total_amount), 0) AS gross,
       COALESCE(SUM(paid_amount), 0) AS received,
       COALESCE(SUM(due_amount), 0) AS due,
       COALESCE(SUM(return_amount), 0) AS returns,
       COALESCE(SUM(refunded_amount), 0) AS refunded,
       COALESCE(SUM(customer_credit), 0) AS credit
     FROM sales WHERE business_id = ?`,
    businessId,
  );
  const workflowCount = await db.getFirstAsync<{ count: number }>(
    `SELECT
       (SELECT COUNT(*) FROM sales_quotations WHERE business_id = ?) +
       (SELECT COUNT(*) FROM sales_orders WHERE business_id = ?) +
       (SELECT COUNT(*) FROM sales_delivery_challans WHERE business_id = ?) +
       (SELECT COUNT(*) FROM sales_returns WHERE business_id = ?) AS count`,
    businessId,
    businessId,
    businessId,
    businessId,
  );

  const gross = number(invoices?.gross);
  const returned = number(invoices?.returns);
  return {
    invoiceCount: number(invoices?.count),
    workflowCount: number(workflowCount?.count),
    grossSales: gross,
    returns: returned,
    netSales: roundSalesMoney(gross - returned),
    received: number(invoices?.received),
    refunded: number(invoices?.refunded),
    due: number(invoices?.due),
    customerCredit: number(invoices?.credit),
  };
}

/* =========================================================
   LEGACY POS EXPORTS
========================================================= */

export async function createSale(
  sale: Sale,
  items: SaleItem[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sales (
         id, business_id, customer_id, invoice_number, sale_date,
         subtotal, gst_amount, discount, total_amount, paid_amount,
         due_amount, payment_method, payment_status, notes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sale.id,
      sale.businessId,
      sale.customerId ?? null,
      sale.invoiceNumber ?? null,
      sale.saleDate,
      sale.subtotal,
      sale.gstAmount,
      sale.discount,
      sale.totalAmount,
      sale.paidAmount,
      sale.dueAmount,
      sale.paymentMethod,
      sale.paymentStatus,
      sale.notes ?? null,
      sale.createdAt,
      sale.updatedAt,
    );

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sale_items (
           id, sale_id, product_id, quantity, unit_price, gst_rate,
           gst_amount, discount, total_amount, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.saleId,
        item.productId,
        item.quantity,
        item.unitPrice,
        item.gstRate,
        item.gstAmount,
        item.discount,
        item.totalAmount,
        item.createdAt,
      );
    }
  });
}

export async function getSales(businessId: string): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SaleRow>(
    `SELECT id, business_id, customer_id, invoice_number, sale_date,
            subtotal, gst_amount, discount, total_amount, paid_amount,
            due_amount, payment_method, payment_status, notes,
            created_at, updated_at
       FROM sales
      WHERE business_id = ?
      ORDER BY sale_date DESC, created_at DESC`,
    businessId,
  );
  return rows.map(mapSale);
}

export async function getSaleById(saleId: string): Promise<Sale | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SaleRow>(
    `SELECT id, business_id, customer_id, invoice_number, sale_date,
            subtotal, gst_amount, discount, total_amount, paid_amount,
            due_amount, payment_method, payment_status, notes,
            created_at, updated_at
       FROM sales WHERE id = ? LIMIT 1`,
    saleId,
  );
  return row ? mapSale(row) : null;
}

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SaleItemRow>(
    `SELECT id, sale_id, product_id, quantity, unit_price, gst_rate,
            gst_amount, discount, total_amount, created_at
       FROM sale_items WHERE sale_id = ? ORDER BY created_at ASC`,
    saleId,
  );
  return rows.map(mapSaleItem);
}

export async function deleteSale(saleId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM sale_items WHERE sale_id = ?`, saleId);
    await db.runAsync(`DELETE FROM sales WHERE id = ?`, saleId);
  });
}
