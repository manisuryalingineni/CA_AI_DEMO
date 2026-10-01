import {
  getBusiness,
} from '../repositories/businessRepository';

import {
  createPurchase,
  deletePurchase,
  getPurchaseById,
  getPurchaseDashboardTotals,
  getPurchaseItems,
  getPurchases,
} from '../repositories/purchaseRepository';

import type {
  PurchaseDashboardTotals,
  PurchaseItemRow,
  PurchaseListRow,
  PurchaseRow,
  PurchaseStatus,
  SupplyType,
} from '../repositories/purchaseRepository';


/* =========================================
   INPUT TYPES
========================================= */

export interface CreatePurchaseItemInput {
  productId: string;

  productName: string;

  hsn?: string;

  unit?: string;

  quantity: number;

  unitPrice: number;

  gstRate: number;

  gstAmount: number;

  discount: number;

  totalAmount: number;
}


export interface CreatePurchaseInput {
  vendorId?: string;

  invoiceNumber?: string;

  purchaseDate: string;

  dueDate?: string;

  supplyType: SupplyType;

  counterBranch?: string;

  salesperson?: string;

  deliveryMethod?: string;

  subtotal: number;

  gstAmount: number;

  cgstAmount: number;

  sgstAmount: number;

  igstAmount: number;

  discount: number;

  totalAmount: number;

  paidAmount: number;

  dueAmount: number;

  paymentStatus: PurchaseStatus;

  notes?: string;

  items: CreatePurchaseItemInput[];
}


/* =========================================
   ID GENERATORS
========================================= */

function generatePurchaseId(): string {
  return (
    `purchase_${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


function generatePurchaseItemId(): string {
  return (
    `purchase_item_${Date.now()}_` +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


function generatePurchaseNumber(): string {
  /*
   * Human-readable and unique enough for
   * local/offline use.
   *
   * Example:
   * PB-261001-153045
   */

  const now = new Date();

  const yy =
    String(now.getFullYear())
      .slice(-2);

  const mm =
    String(now.getMonth() + 1)
      .padStart(2, '0');

  const dd =
    String(now.getDate())
      .padStart(2, '0');

  const hh =
    String(now.getHours())
      .padStart(2, '0');

  const min =
    String(now.getMinutes())
      .padStart(2, '0');

  const sec =
    String(now.getSeconds())
      .padStart(2, '0');

  return (
    `PB-${yy}${mm}${dd}-` +
    `${hh}${min}${sec}`
  );
}


/* =========================================
   NORMALISE
========================================= */

function normalizePurchaseInput(
  input: CreatePurchaseInput,
): CreatePurchaseInput {

  return {
    vendorId:
      input.vendorId?.trim() ||
      undefined,

    invoiceNumber:
      input.invoiceNumber?.trim() ||
      undefined,

    purchaseDate:
      input.purchaseDate.trim(),

    dueDate:
      input.dueDate?.trim() ||
      undefined,

    supplyType:
      input.supplyType,

    counterBranch:
      input.counterBranch?.trim() ||
      undefined,

    salesperson:
      input.salesperson?.trim() ||
      undefined,

    deliveryMethod:
      input.deliveryMethod?.trim() ||
      undefined,

    subtotal:
      Number(input.subtotal) || 0,

    gstAmount:
      Number(input.gstAmount) || 0,

    cgstAmount:
      Number(input.cgstAmount) || 0,

    sgstAmount:
      Number(input.sgstAmount) || 0,

    igstAmount:
      Number(input.igstAmount) || 0,

    discount:
      Number(input.discount) || 0,

    totalAmount:
      Number(input.totalAmount) || 0,

    paidAmount:
      Number(input.paidAmount) || 0,

    dueAmount:
      Number(input.dueAmount) || 0,

    paymentStatus:
      input.paymentStatus,

    notes:
      input.notes?.trim() ||
      undefined,

    items:
      input.items.map(
        item => ({
          productId:
            item.productId.trim(),

          productName:
            item.productName.trim(),

          hsn:
            item.hsn?.trim() ||
            undefined,

          unit:
            item.unit?.trim() ||
            undefined,

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
        }),
      ),
  };
}


/* =========================================
   VALIDATION
========================================= */

function validatePurchaseInput(
  input: CreatePurchaseInput,
): void {

  if (!input.vendorId) {
    throw new Error(
      'Please select a vendor.',
    );
  }


  if (!input.purchaseDate) {
    throw new Error(
      'Purchase date is required.',
    );
  }


  if (!input.dueDate) {
    throw new Error(
      'Due date is required.',
    );
  }


  if (
    input.supplyType !==
      'WITHIN_STATE' &&
    input.supplyType !==
      'OTHER_STATE'
  ) {
    throw new Error(
      'Please select a valid supply type.',
    );
  }


  if (input.subtotal < 0) {
    throw new Error(
      'Taxable value cannot be negative.',
    );
  }


  if (input.gstAmount < 0) {
    throw new Error(
      'GST cannot be negative.',
    );
  }


  if (input.cgstAmount < 0) {
    throw new Error(
      'CGST cannot be negative.',
    );
  }


  if (input.sgstAmount < 0) {
    throw new Error(
      'SGST cannot be negative.',
    );
  }


  if (input.igstAmount < 0) {
    throw new Error(
      'IGST cannot be negative.',
    );
  }


  if (input.discount < 0) {
    throw new Error(
      'Discount cannot be negative.',
    );
  }


  if (input.totalAmount <= 0) {
    throw new Error(
      'Purchase total must be greater than zero.',
    );
  }


  if (input.paidAmount < 0) {
    throw new Error(
      'Paid amount cannot be negative.',
    );
  }


  if (
    input.paidAmount >
    input.totalAmount
  ) {
    throw new Error(
      'Paid amount cannot be greater than purchase total.',
    );
  }


  if (input.dueAmount < 0) {
    throw new Error(
      'Due amount cannot be negative.',
    );
  }


  if (!input.items.length) {
    throw new Error(
      'Add at least one purchase item.',
    );
  }


  for (
    const item of input.items
  ) {

    if (!item.productId) {
      throw new Error(
        'Every purchase line must have a product.',
      );
    }


    if (!item.productName) {
      throw new Error(
        'Every purchase line must have a product name.',
      );
    }


    if (item.quantity <= 0) {
      throw new Error(
        `${item.productName}: quantity must be greater than zero.`,
      );
    }


    if (item.unitPrice < 0) {
      throw new Error(
        `${item.productName}: purchase price cannot be negative.`,
      );
    }


    if (item.gstRate < 0) {
      throw new Error(
        `${item.productName}: GST rate cannot be negative.`,
      );
    }


    if (item.gstAmount < 0) {
      throw new Error(
        `${item.productName}: GST amount cannot be negative.`,
      );
    }


    if (item.discount < 0) {
      throw new Error(
        `${item.productName}: discount cannot be negative.`,
      );
    }


    if (item.totalAmount < 0) {
      throw new Error(
        `${item.productName}: total cannot be negative.`,
      );
    }
  }


  /*
   * Tax consistency.
   */

  if (
    input.supplyType ===
    'WITHIN_STATE'
  ) {

    if (input.igstAmount > 0.01) {
      throw new Error(
        'IGST must be zero for within-state purchases.',
      );
    }

  }


  if (
    input.supplyType ===
    'OTHER_STATE'
  ) {

    if (
      input.cgstAmount > 0.01 ||
      input.sgstAmount > 0.01
    ) {
      throw new Error(
        'CGST and SGST must be zero for interstate purchases.',
      );
    }

  }
}


/* =========================================
   SAVE PURCHASE
========================================= */

export async function savePurchase(
  input: CreatePurchaseInput,
): Promise<PurchaseRow> {

  const normalized =
    normalizePurchaseInput(input);


  validatePurchaseInput(
    normalized,
  );


  const business =
    await getBusiness();


  if (!business) {
    throw new Error(
      'Business setup is required before creating a purchase.',
    );
  }


  const now =
    new Date().toISOString();


  const purchaseId =
    generatePurchaseId();


  const purchase: PurchaseRow = {

    id:
      purchaseId,

    business_id:
      business.id,

    purchase_number:
      generatePurchaseNumber(),

    vendor_id:
      normalized.vendorId ??
      null,

    invoice_number:
      normalized.invoiceNumber ??
      null,

    purchase_date:
      normalized.purchaseDate,

    due_date:
      normalized.dueDate ??
      null,

    supply_type:
      normalized.supplyType,

    counter_branch:
      normalized.counterBranch ??
      null,

    salesperson:
      normalized.salesperson ??
      null,

    delivery_method:
      normalized.deliveryMethod ??
      null,

    subtotal:
      normalized.subtotal,

    gst_amount:
      normalized.gstAmount,

    cgst_amount:
      normalized.cgstAmount,

    sgst_amount:
      normalized.sgstAmount,

    igst_amount:
      normalized.igstAmount,

    discount:
      normalized.discount,

    total_amount:
      normalized.totalAmount,

    paid_amount:
      normalized.paidAmount,

    due_amount:
      normalized.dueAmount,

    payment_status:
      normalized.paymentStatus,

    notes:
      normalized.notes ??
      null,

    created_at:
      now,

    updated_at:
      now,
  };


  const items:
    PurchaseItemRow[] =
    normalized.items.map(
      item => ({

        id:
          generatePurchaseItemId(),

        purchase_id:
          purchaseId,

        product_id:
          item.productId,

        product_name:
          item.productName,

        hsn:
          item.hsn ??
          null,

        unit:
          item.unit ??
          null,

        quantity:
          item.quantity,

        unit_price:
          item.unitPrice,

        gst_rate:
          item.gstRate,

        gst_amount:
          item.gstAmount,

        discount:
          item.discount,

        total_amount:
          item.totalAmount,

        created_at:
          now,
      }),
    );


  await createPurchase(
    purchase,
    items,
  );


  return purchase;
}


/* =========================================
   LOAD PURCHASES
========================================= */

export async function loadPurchases():
  Promise<PurchaseListRow[]> {

  const business =
    await getBusiness();


  if (!business) {
    return [];
  }


  return getPurchases(
    business.id,
  );
}


/* =========================================
   LOAD ONE PURCHASE
========================================= */

export async function loadPurchase(
  purchaseId: string,
): Promise<PurchaseRow | null> {

  if (!purchaseId) {
    return null;
  }


  const business =
    await getBusiness();


  if (!business) {
    return null;
  }


  const purchase =
    await getPurchaseById(
      purchaseId,
    );


  if (!purchase) {
    return null;
  }


  if (
    purchase.business_id !==
    business.id
  ) {
    return null;
  }


  return purchase;
}


/* =========================================
   LOAD PURCHASE ITEMS
========================================= */

export async function loadPurchaseItems(
  purchaseId: string,
): Promise<PurchaseItemRow[]> {

  const purchase =
    await loadPurchase(
      purchaseId,
    );


  if (!purchase) {
    return [];
  }


  return getPurchaseItems(
    purchaseId,
  );
}


/* =========================================
   PURCHASE + ITEMS
========================================= */

export interface PurchaseWithItems {
  purchase: PurchaseRow;

  items: PurchaseItemRow[];
}


export async function loadPurchaseWithItems(
  purchaseId: string,
): Promise<PurchaseWithItems | null> {

  const purchase =
    await loadPurchase(
      purchaseId,
    );


  if (!purchase) {
    return null;
  }


  const items =
    await getPurchaseItems(
      purchaseId,
    );


  return {
    purchase,
    items,
  };
}


/* =========================================
   DASHBOARD TOTALS
========================================= */

export async function loadPurchaseDashboardTotals():
  Promise<PurchaseDashboardTotals> {

  const business =
    await getBusiness();


  if (!business) {
    return {
      purchase_total: 0,
      payable_total: 0,
      purchase_count: 0,
    };
  }


  return getPurchaseDashboardTotals(
    business.id,
  );
}


/* =========================================
   DELETE PURCHASE
========================================= */

export async function removePurchase(
  purchaseId: string,
): Promise<void> {

  const business =
    await getBusiness();


  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }


  const purchase =
    await getPurchaseById(
      purchaseId,
    );


  if (!purchase) {
    throw new Error(
      'Purchase not found.',
    );
  }


  if (
    purchase.business_id !==
    business.id
  ) {
    throw new Error(
      'You cannot delete a purchase from another business.',
    );
  }


  await deletePurchase(
    purchaseId,
  );
}