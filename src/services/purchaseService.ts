import { getBusiness } from '../repositories/businessRepository';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getPurchaseItems,
  deletePurchase,
} from '../repositories/purchaseRepository';
import type { Purchase, PurchaseItem } from '../types/purchase';

export interface CreatePurchaseInput {
  vendorId: string;
  invoiceNumber?: string;
  purchaseDate: string;

  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;

  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';

  notes?: string;

  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    discount: number;
    totalAmount: number;
  }>;
}

export interface PurchaseListItem extends Purchase {
  vendorName?: string;
}

/*
 * ---------------------------------------------------------
 * ID GENERATORS
 * ---------------------------------------------------------
 */

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

/*
 * ---------------------------------------------------------
 * VALIDATION
 * ---------------------------------------------------------
 */

function validatePurchaseInput(
  input: CreatePurchaseInput,
): void {
  if (!input.vendorId.trim()) {
    throw new Error('Vendor is required.');
  }

  if (!input.purchaseDate.trim()) {
    throw new Error('Purchase date is required.');
  }

  if (!input.items.length) {
    throw new Error(
      'Add at least one product to the purchase.',
    );
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
        'Every purchase item must have a product.',
      );
    }

    if (item.quantity <= 0) {
      throw new Error(
        'Product quantity must be greater than zero.',
      );
    }

    if (item.unitPrice < 0) {
      throw new Error(
        'Product purchase price cannot be negative.',
      );
    }

    if (item.gstRate < 0) {
      throw new Error(
        'Product GST rate cannot be negative.',
      );
    }

    if (item.gstAmount < 0) {
      throw new Error(
        'Product GST amount cannot be negative.',
      );
    }

    if (item.discount < 0) {
      throw new Error(
        'Product discount cannot be negative.',
      );
    }

    if (item.totalAmount < 0) {
      throw new Error(
        'Product total amount cannot be negative.',
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * NORMALIZATION
 * ---------------------------------------------------------
 */

function normalizePurchaseInput(
  input: CreatePurchaseInput,
): CreatePurchaseInput {
  return {
    ...input,

    vendorId: input.vendorId.trim(),

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

    notes:
      input.notes?.trim() || undefined,

    items: input.items.map(item => ({
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

/*
 * ---------------------------------------------------------
 * SAVE PURCHASE
 *
 * APK-style flow:
 *
 * Vendor
 *   ↓
 * Purchase Bill
 *   ↓
 * Purchase Items
 *   ↓
 * Vendor/Product relationship
 *   ↓
 * Inventory IN
 *   ↓
 * Stock increases
 * ---------------------------------------------------------
 */

export async function savePurchase(
  input: CreatePurchaseInput,
): Promise<Purchase> {
  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required before creating a purchase.',
    );
  }

  const normalized =
    normalizePurchaseInput(input);

  validatePurchaseInput(normalized);

  const now =
    new Date().toISOString();

  const purchaseId =
    generatePurchaseId();

  const purchase: Purchase = {
    id: purchaseId,

    businessId:
      business.id,

    vendorId:
      normalized.vendorId,

    invoiceNumber:
      normalized.invoiceNumber,

    purchaseDate:
      normalized.purchaseDate,

    subtotal:
      normalized.subtotal,

    gstAmount:
      normalized.gstAmount,

    discount:
      normalized.discount,

    totalAmount:
      normalized.totalAmount,

    paidAmount:
      normalized.paidAmount,

    dueAmount:
      normalized.dueAmount,

    paymentStatus:
      normalized.paymentStatus,

    notes:
      normalized.notes,

    createdAt:
      now,

    updatedAt:
      now,
  };

  const purchaseItems: PurchaseItem[] =
    normalized.items.map(item => ({
      id:
        generatePurchaseItemId(),

      purchaseId,

      productId:
        item.productId,

      quantity:
        item.quantity,

      unitPrice:
        item.unitPrice,

      gstRate:
        item.gstRate,

      gstAmount:
        item.gstAmount,

      discount:
        item.discount,

      totalAmount:
        item.totalAmount,

      createdAt:
        now,
    }));

  await createPurchase(
    {
      id:
        purchase.id,

      business_id:
        purchase.businessId,

      vendor_id:
        purchase.vendorId ?? null,

      invoice_number:
        purchase.invoiceNumber ?? null,

      purchase_date:
        purchase.purchaseDate,

      subtotal:
        purchase.subtotal,

      gst_amount:
        purchase.gstAmount,

      discount:
        purchase.discount,

      total_amount:
        purchase.totalAmount,

      paid_amount:
        purchase.paidAmount,

      due_amount:
        purchase.dueAmount,

      payment_status:
        purchase.paymentStatus,

      notes:
        purchase.notes ?? null,

      created_at:
        purchase.createdAt,

      updated_at:
        purchase.updatedAt,
    },

    purchaseItems.map(item => ({
      id:
        item.id,

      purchase_id:
        item.purchaseId,

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
        item.createdAt,
    })),
  );

  return purchase;
}

/*
 * ---------------------------------------------------------
 * LOAD PURCHASE LIST
 * ---------------------------------------------------------
 */

export async function loadPurchases(): Promise<
  PurchaseListItem[]
> {
  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  const rows =
    await getPurchases(
      business.id,
    );

  return rows.map(row => ({
    id:
      row.id,

    businessId:
      row.business_id,

    vendorId:
      row.vendor_id ?? undefined,

    vendorName:
      row.vendor_name ?? undefined,

    invoiceNumber:
      row.invoice_number ?? undefined,

    purchaseDate:
      row.purchase_date,

    subtotal:
      row.subtotal,

    gstAmount:
      row.gst_amount,

    discount:
      row.discount,

    totalAmount:
      row.total_amount,

    paidAmount:
      row.paid_amount,

    dueAmount:
      row.due_amount,

    paymentStatus:
      row.payment_status as
        | 'UNPAID'
        | 'PARTIAL'
        | 'PAID',

    notes:
      row.notes ?? undefined,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }));
}

/*
 * ---------------------------------------------------------
 * LOAD SINGLE PURCHASE
 * ---------------------------------------------------------
 */

export async function loadPurchase(
  purchaseId: string,
): Promise<Purchase | null> {
  const row =
    await getPurchaseById(
      purchaseId,
    );

  if (!row) {
    return null;
  }

  return {
    id:
      row.id,

    businessId:
      row.business_id,

    vendorId:
      row.vendor_id ?? undefined,

    invoiceNumber:
      row.invoice_number ?? undefined,

    purchaseDate:
      row.purchase_date,

    subtotal:
      row.subtotal,

    gstAmount:
      row.gst_amount,

    discount:
      row.discount,

    totalAmount:
      row.total_amount,

    paidAmount:
      row.paid_amount,

    dueAmount:
      row.due_amount,

    paymentStatus:
      row.payment_status as
        | 'UNPAID'
        | 'PARTIAL'
        | 'PAID',

    notes:
      row.notes ?? undefined,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

/*
 * ---------------------------------------------------------
 * LOAD PURCHASE ITEMS
 * ---------------------------------------------------------
 */

export async function loadPurchaseItems(
  purchaseId: string,
): Promise<PurchaseItem[]> {
  const rows =
    await getPurchaseItems(
      purchaseId,
    );

  return rows.map(row => ({
    id:
      row.id,

    purchaseId:
      row.purchase_id,

    productId:
      row.product_id,

    quantity:
      row.quantity,

    unitPrice:
      row.unit_price,

    gstRate:
      row.gst_rate,

    gstAmount:
      row.gst_amount,

    discount:
      row.discount,

    totalAmount:
      row.total_amount,

    createdAt:
      row.created_at,
  }));
}

/*
 * ---------------------------------------------------------
 * LOAD PURCHASE + ITEMS
 * ---------------------------------------------------------
 */

export async function loadPurchaseWithItems(
  purchaseId: string,
): Promise<{
  purchase: Purchase;
  items: PurchaseItem[];
} | null> {
  const purchase =
    await loadPurchase(
      purchaseId,
    );

  if (!purchase) {
    return null;
  }

  const items =
    await loadPurchaseItems(
      purchaseId,
    );

  return {
    purchase,
    items,
  };
}

/*
 * ---------------------------------------------------------
 * REMOVE PURCHASE
 *
 * Keep disabled until inventory reversal is implemented.
 * ---------------------------------------------------------
 */

export async function removePurchase(
  purchaseId: string,
): Promise<void> {
  const purchase =
    await getPurchaseById(
      purchaseId,
    );

  if (!purchase) {
    throw new Error(
      'Purchase not found.',
    );
  }

  await deletePurchase(
    purchaseId,
  );
}