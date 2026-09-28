import { getBusiness } from '../repositories/businessRepository';

import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getPurchaseItems,
  deletePurchase,
} from '../repositories/purchaseRepository';

import type {
  PurchaseRow,
  PurchaseItemRow,
} from '../repositories/purchaseRepository';

export interface CreatePurchaseInput {
  vendorId?: string;
  invoiceNumber?: string;
  purchaseDate: string;
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
}

function generatePurchaseId(): string {
  return `purchase_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function generatePurchaseItemId(): string {
  return `purchase_item_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function validatePurchaseInput(
  input: CreatePurchaseInput,
): void {
  if (!input.purchaseDate.trim()) {
    throw new Error('Purchase date is required.');
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

  if (!input.items.length) {
    throw new Error(
      'At least one purchase item is required.',
    );
  }

  for (const item of input.items) {
    if (!item.productId.trim()) {
      throw new Error(
        'Product is required for every purchase item.',
      );
    }

    if (item.quantity <= 0) {
      throw new Error(
        'Purchase quantity must be greater than zero.',
      );
    }

    if (item.unitPrice < 0) {
      throw new Error(
        'Unit price cannot be negative.',
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

function normalizePurchaseInput(
  input: CreatePurchaseInput,
): CreatePurchaseInput {
  return {
    vendorId:
      input.vendorId?.trim() || undefined,

    invoiceNumber:
      input.invoiceNumber?.trim() || undefined,

    purchaseDate:
      input.purchaseDate.trim(),

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

    paymentStatus:
      input.paymentStatus.trim(),

    notes:
      input.notes?.trim() || undefined,

    items: input.items.map((item) => ({
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

/* =================================
   CREATE PURCHASE
================================= */

export async function savePurchase(
  input: CreatePurchaseInput,
): Promise<PurchaseRow> {
  const normalized =
    normalizePurchaseInput(input);

  validatePurchaseInput(normalized);

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
    id: purchaseId,

    business_id:
      business.id,

    vendor_id:
      normalized.vendorId ?? null,

    invoice_number:
      normalized.invoiceNumber ?? null,

    purchase_date:
      normalized.purchaseDate,

    subtotal:
      normalized.subtotal,

    gst_amount:
      normalized.gstAmount,

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
      normalized.notes ?? null,

    created_at:
      now,

    updated_at:
      now,
  };

  const items: PurchaseItemRow[] =
    normalized.items.map((item) => ({
      id:
        generatePurchaseItemId(),

      purchase_id:
        purchaseId,

      product_id:
        item.productId,

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
    }));

  await createPurchase(
    purchase,
    items,
  );

  return purchase;
}

/* =================================
   LOAD ALL PURCHASES
================================= */

export async function loadPurchases(): Promise<
  PurchaseRow[]
> {
  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  return getPurchases(
    business.id,
  );
}

/* =================================
   LOAD SINGLE PURCHASE
================================= */

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

/* =================================
   LOAD PURCHASE ITEMS
================================= */

export async function loadPurchaseItems(
  purchaseId: string,
): Promise<PurchaseItemRow[]> {
  if (!purchaseId) {
    return [];
  }

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

/* =================================
   LOAD PURCHASE WITH ITEMS
================================= */

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

/* =================================
   DELETE PURCHASE
================================= */

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