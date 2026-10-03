import { getBusiness } from '../repositories/businessRepository';

import {

  calculateSalesLines,

  calculateSalesReturn,

  createSale,

  createSalesPayment,

  createSalesWorkflowDocument,

  deleteSale,

  getSaleById,

  getSaleItems,

  getSales,

  getSalesPayments,

  getSalesPdfSettings,

  getSalesWorkflow,

  getSalesWorkflowDocument,

  getSalesWorkflowSummary,

  makeSalesKey,

  roundSalesMoney,

  saveSalesPdfSettings,
} from '../repositories/saleRepository';

import type {

  CreateSaleInput,

  CreateSalesPaymentInput,

  CreateSalesWorkflowInput,

  Sale,

  SaleItem,

  SaleWithItems,

  SalesCalculatedTotals,

  SalesDocumentType,
  SalesPayment,

  SalesPdfSettings,

  SalesReturnLineInput,

  SalesSupplyType,

  SalesWorkflowDetail,

  SalesWorkflowDocument,

  SalesWorkflowLine,

  SalesWorkflowLineInput,

  SalesWorkflowSummary,

} from '../types/sale';

/* =========================================================

   SHARED HELPERS

\========================================================= */

function trim(value: string | null | undefined): string {

  return value?.trim() ?? '';

}

async function requireBusiness() {

  const business = await getBusiness();

  if (!business) {

    throw new Error(

      'Business setup is required before creating a sales document.',

    );

  }

  return business;

}

/**

 * Omit businessId from every member of a discriminated union.

 * A normal Omit<CreateSalesWorkflowInput, 'businessId'> would

 * collapse useful union-specific fields in some TypeScript versions.

 */

type WithoutBusinessId<T> = T extends unknown

  ? Omit<T, 'businessId'>

  : never;

/* =========================================================

   LEGACY POS API

   Kept for current /pos callers until that screen is migrated.

\========================================================= */

function generateSaleId(): string {

  return `sale_${Date.now()}_${Math.random()

    .toString(36)

    .slice(2, 8)}`;

}

function generateSaleItemId(): string {

  return `sale_item_${Date.now()}_${Math.random()

    .toString(36)

    .slice(2, 8)}`;

}

function validateSaleInput(

  input: CreateSaleInput,

): void {

  if (!input.saleDate.trim()) {

    throw new Error('Sale date is required.');

  }

  if (!input.items.length) {

    throw new Error('Add at least one product to the sale.');

  }

  if (input.subtotal < 0) {

    throw new Error('Subtotal cannot be negative.');

  }

  if (input.gstAmount < 0) {

    throw new Error('GST amount cannot be negative.');

  }

  if (input.discount < 0) {

    throw new Error('Discount cannot be negative.');

  }

  if (input.totalAmount < 0) {

    throw new Error('Total amount cannot be negative.');

  }

  if (input.paidAmount < 0) {

    throw new Error('Paid amount cannot be negative.');

  }

  if (input.dueAmount < 0) {

    throw new Error('Due amount cannot be negative.');

  }

  if (input.paidAmount > input.totalAmount) {

    throw new Error(

      'Paid amount cannot be greater than total amount.',

    );

  }

  for (const item of input.items) {

    if (!item.productId.trim()) {

      throw new Error(

        'Every sale item must have a product.',

      );

    }

    if (item.quantity <= 0) {

      throw new Error(

        'Product quantity must be greater than zero.',

      );

    }

    if (item.unitPrice < 0) {

      throw new Error(

        'Product price cannot be negative.',

      );

    }

    if (item.gstRate < 0) {

      throw new Error(

        'GST rate cannot be negative.',

      );

    }

    if (item.gstAmount < 0) {

      throw new Error(

        'GST amount cannot be negative.',

      );

    }

    if (item.discount < 0) {

      throw new Error(

        'Item discount cannot be negative.',

      );

    }

    if (item.totalAmount < 0) {

      throw new Error(

        'Item total cannot be negative.',

      );

    }

  }

}

function normalizeSaleInput(

  input: CreateSaleInput,

): CreateSaleInput {

  return {

    customerId:

      input.customerId?.trim() || undefined,

    invoiceNumber:

      input.invoiceNumber?.trim() || undefined,

    saleDate:

      input.saleDate.trim(),

    subtotal:

      Number(input.subtotal) || 0,

    gstAmount:

      Number(input.gstAmount) || 0,

    discount:

      Number(input.discount) || 0,

    totalAmount:

      Number(input.totalAmount) || 0,

    paidAmount:

      Number(input.paidAmount) || 0,

    dueAmount:

      Number(input.dueAmount) || 0,

    paymentMethod:

      input.paymentMethod,

    paymentStatus:

      input.paymentStatus,

    notes:

      input.notes?.trim() || undefined,

    items:

      input.items.map(item => ({

        productId:

          item.productId.trim(),

        quantity:

          Number(item.quantity) || 0,

        unitPrice:

          Number(item.unitPrice) || 0,

        gstRate:

          Number(item.gstRate) || 0,

        gstAmount:

          Number(item.gstAmount) || 0,

        discount:

          Number(item.discount) || 0,

        totalAmount:

          Number(item.totalAmount) || 0,

      })),

  };

}

async function generateInvoiceNumber(

  businessId: string,

): Promise<string> {

  const sales = await getSales(businessId);

  let maxNumber = 1000;

  for (const sale of sales) {

    const invoice = sale.invoiceNumber;

    if (!invoice) {

      continue;

    }

    const match = invoice.match(/^INV-(\d+)$/);

    if (!match) {

      continue;

    }

    const value = Number(match[1]);

    if (

      Number.isFinite(value) &&

      value > maxNumber

    ) {

      maxNumber = value;

    }

  }

  return `INV-${maxNumber + 1}`;

}

/**

 * Legacy POS save.

 *

 * This function is intentionally retained as-is for compatibility.

 * New workflow screens must call saveSalesWorkflow() instead, because

 * workflow saves perform authoritative pricing, numbering, snapshots,

 * stock posting and conversion validation inside the repository.

 */

export async function saveSale(

  input: CreateSaleInput,

): Promise<Sale> {

  const normalized = normalizeSaleInput(input);

  validateSaleInput(normalized);

  const business = await requireBusiness();

  const now = new Date().toISOString();

  const saleId = generateSaleId();

  const invoiceNumber =

    normalized.invoiceNumber ||

    (await generateInvoiceNumber(business.id));

  const sale: Sale = {

    id: saleId,

    businessId: business.id,

    customerId: normalized.customerId,

    invoiceNumber,

    saleDate: normalized.saleDate,

    subtotal: normalized.subtotal,

    gstAmount: normalized.gstAmount,

    discount: normalized.discount,

    totalAmount: normalized.totalAmount,

    paidAmount: normalized.paidAmount,

    dueAmount: normalized.dueAmount,

    paymentMethod: normalized.paymentMethod,

    paymentStatus: normalized.paymentStatus,

    notes: normalized.notes,

    createdAt: now,

    updatedAt: now,

  };

  const items: SaleItem[] =

    normalized.items.map(item => ({

      id: generateSaleItemId(),

      saleId,

      productId: item.productId,

      quantity: item.quantity,

      unitPrice: item.unitPrice,

      gstRate: item.gstRate,

      gstAmount: item.gstAmount,

      discount: item.discount,

      totalAmount: item.totalAmount,

      createdAt: now,

    }));

  await createSale(sale, items);

  return sale;

}

export async function loadSales(): Promise<Sale[]> {

  const business = await getBusiness();

  if (!business) {

    return [];

  }

  return getSales(business.id);

}

export async function loadSale(

  saleId: string,

): Promise<Sale | null> {

  const id = trim(saleId);

  if (!id) {

    return null;

  }

  const business = await getBusiness();

  if (!business) {

    return null;

  }

  const sale = await getSaleById(id);

  if (!sale || sale.businessId !== business.id) {

    return null;

  }

  return sale;

}

export async function loadSaleItems(

  saleId: string,

): Promise<SaleItem[]> {

  const sale = await loadSale(saleId);

  if (!sale) {

    return [];

  }

  return getSaleItems(sale.id);

}

export async function loadSaleWithItems(

  saleId: string,

): Promise<SaleWithItems | null> {

  const sale = await loadSale(saleId);

  if (!sale) {

    return null;

  }

  const items = await getSaleItems(sale.id);

  return {

    sale,

    items,

  };

}

export async function removeSale(

  saleId: string,

): Promise<void> {

  const id = trim(saleId);

  if (!id) {

    throw new Error('Sale ID is required.');

  }

  const business = await requireBusiness();

  const sale = await getSaleById(id);

  if (!sale) {

    throw new Error('Sale not found.');

  }

  if (sale.businessId !== business.id) {

    throw new Error(

      'You cannot delete a sale from another business.',

    );

  }

  await deleteSale(id);

}

/* =========================================================

   PURE SALES CALCULATIONS

   The UI may use these for live totals. The repository still

   recalculates on save and remains authoritative.

\========================================================= */

export function calculateSalesWorkflowLines(

  items: SalesWorkflowLineInput[],

  supplyType: SalesSupplyType,

): SalesCalculatedTotals {

  return calculateSalesLines(items, supplyType);

}

export function calculateSalesReturnLines(

  originalItems: SalesWorkflowLine[],

  items: SalesReturnLineInput[],

  supplyType: SalesSupplyType,

): SalesCalculatedTotals {

  return calculateSalesReturn(

    originalItems,

    items,

    supplyType,

  );

}

export function normalizeSalesMoney(

  value: number,

): number {

  return roundSalesMoney(value);

}

/* =========================================================

   SALES WORKFLOW DOCUMENTS

\========================================================= */

export type SaveSalesWorkflowInput =

  WithoutBusinessId<CreateSalesWorkflowInput>;

/**

 * Creates any of:

 * Quotation, Sales order, Delivery challan, Tax invoice,

 * or Sales return.

 *

 * The active business is injected here; callers cannot choose

 * another business ID from route params or UI state.

 */

export async function saveSalesWorkflow(

  input: SaveSalesWorkflowInput,

): Promise<SalesWorkflowDetail> {

  const business = await requireBusiness();

  const id =

    trim(input.id) ||

    makeSalesKey(input.documentType.toLowerCase());

  const repositoryInput = {

    ...input,

    id,

    businessId: business.id,

  } as CreateSalesWorkflowInput;

  return createSalesWorkflowDocument(repositoryInput);

}

export async function loadSalesWorkflow(): Promise<

  SalesWorkflowDocument[]

> {

  const business = await getBusiness();

  if (!business) {

    return [];

  }

  return getSalesWorkflow(business.id);

}

export async function loadSalesWorkflowDocument(

  documentType: SalesDocumentType,

  documentId: string,

): Promise<SalesWorkflowDetail | null> {

  const id = trim(documentId);

  if (!id) {

    return null;

  }

  const business = await getBusiness();

  if (!business) {

    return null;

  }

  return getSalesWorkflowDocument(

    business.id,

    documentType,

    id,

  );

}

export async function loadSalesWorkflowSummary(): Promise<

  SalesWorkflowSummary

> {

  const business = await getBusiness();

  if (!business) {

    return {

      invoiceCount: 0,

      workflowCount: 0,

      grossSales: 0,

      returns: 0,

      netSales: 0,

      received: 0,

      refunded: 0,

      due: 0,

      customerCredit: 0,

    };

  }

  return getSalesWorkflowSummary(business.id);

}

/* =========================================================

   SALES RETURN REFUNDS

\========================================================= */

export type SaveSalesRefundInput =
  Omit<
    Extract<CreateSalesPaymentInput, { direction: 'REFUND' }>,
    'businessId'
  >;

/**
 * Saves a refund against a Sales return.
 * Receipt entry is intentionally not exposed by this Sales service.
 */
export async function saveSalesPayment(
  input: SaveSalesRefundInput,
): Promise<SalesPayment> {
  const business = await requireBusiness();

  const repositoryInput: CreateSalesPaymentInput = {
    ...input,
    id:
      trim(input.id) ||
      makeSalesKey('sales_refund'),
    businessId: business.id,
  };

  return createSalesPayment(repositoryInput);
}

export async function loadSalesPayments(
  invoiceId: string,
): Promise<SalesPayment[]> {
  const id = trim(invoiceId);

  if (!id) {
    return [];
  }

  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return getSalesPayments(
    business.id,
    id,
  );
}

/* =========================================================

   PDF SETTINGS

\========================================================= */

export async function loadSalesPdfSettings(): Promise<

  SalesPdfSettings | null

> {

  const business = await getBusiness();

  if (!business) {

    return null;

  }

  return getSalesPdfSettings(business.id);

}

export async function updateSalesPdfSettings(

  settings: SalesPdfSettings,

): Promise<void> {

  const business = await requireBusiness();

  await saveSalesPdfSettings(

    business.id,

    settings,

  );

}
