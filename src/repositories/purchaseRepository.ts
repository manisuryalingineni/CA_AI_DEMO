import { getDatabase } from '../database/database';

export type PurchaseRow = {
  id: string;
  business_id: string;
  vendor_id: string | null;
  invoice_number: string | null;
  purchase_date: string;
  subtotal: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  created_at: string;
};

export async function createPurchase(
  purchase: PurchaseRow,
  items: PurchaseItemRow[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO purchases (
        id,
        business_id,
        vendor_id,
        invoice_number,
        purchase_date,
        subtotal,
        gst_amount,
        discount,
        total_amount,
        paid_amount,
        due_amount,
        payment_status,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchase.id,
      purchase.business_id,
      purchase.vendor_id,
      purchase.invoice_number,
      purchase.purchase_date,
      purchase.subtotal,
      purchase.gst_amount,
      purchase.discount,
      purchase.total_amount,
      purchase.paid_amount,
      purchase.due_amount,
      purchase.payment_status,
      purchase.notes,
      purchase.created_at,
      purchase.updated_at,
    );

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO purchase_items (
          id,
          purchase_id,
          product_id,
          quantity,
          unit_price,
          gst_rate,
          gst_amount,
          discount,
          total_amount,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.purchase_id,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.gst_rate,
        item.gst_amount,
        item.discount,
        item.total_amount,
        item.created_at,
      );
    }
  });
}

export async function getPurchases(
  businessId: string,
): Promise<PurchaseRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PurchaseRow>(
    `SELECT
      id,
      business_id,
      vendor_id,
      invoice_number,
      purchase_date,
      subtotal,
      gst_amount,
      discount,
      total_amount,
      paid_amount,
      due_amount,
      payment_status,
      notes,
      created_at,
      updated_at
     FROM purchases
     WHERE business_id = ?
     ORDER BY purchase_date DESC, created_at DESC`,
    businessId,
  );
}

export async function getPurchaseById(
  purchaseId: string,
): Promise<PurchaseRow | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<PurchaseRow>(
    `SELECT
      id,
      business_id,
      vendor_id,
      invoice_number,
      purchase_date,
      subtotal,
      gst_amount,
      discount,
      total_amount,
      paid_amount,
      due_amount,
      payment_status,
      notes,
      created_at,
      updated_at
     FROM purchases
     WHERE id = ?
     LIMIT 1`,
    purchaseId,
  );

  return row ?? null;
}

export async function getPurchaseItems(
  purchaseId: string,
): Promise<PurchaseItemRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PurchaseItemRow>(
    `SELECT
      id,
      purchase_id,
      product_id,
      quantity,
      unit_price,
      gst_rate,
      gst_amount,
      discount,
      total_amount,
      created_at
     FROM purchase_items
     WHERE purchase_id = ?
     ORDER BY created_at ASC`,
    purchaseId,
  );
}

export async function deletePurchase(
  purchaseId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM purchase_items
       WHERE purchase_id = ?`,
      purchaseId,
    );

    await db.runAsync(
      `DELETE FROM purchases
       WHERE id = ?`,
      purchaseId,
    );
  });
}