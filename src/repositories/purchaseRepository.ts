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

export type PurchaseListRow = PurchaseRow & {
  vendor_name: string | null;
};

/**
 * Create a purchase.
 *
 * Retail APK flow:
 *
 * Vendor
 *   ↓
 * Purchase Bill
 *   ↓
 * Purchase Items
 *   ↓
 * Vendor/Product relationship
 *   ↓
 * Business Inventory IN
 *   ↓
 * Inventory Movement
 *
 * Everything is executed inside one SQLite transaction.
 */
export async function createPurchase(
  purchase: PurchaseRow,
  items: PurchaseItemRow[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    /*
     * ---------------------------------------------------------
     * 1. Basic validation
     * ---------------------------------------------------------
     */

    if (!purchase.business_id) {
      throw new Error('Business is required for a purchase.');
    }

    if (!purchase.vendor_id) {
      throw new Error('Vendor is required for a purchase.');
    }

    if (!items.length) {
      throw new Error('At least one product is required.');
    }

    /*
     * ---------------------------------------------------------
     * 2. Validate vendor
     * ---------------------------------------------------------
     */

    const vendor = await db.getFirstAsync<{
      id: string;
      business_id: string;
    }>(
      `SELECT
        id,
        business_id
       FROM vendors
       WHERE id = ?
       LIMIT 1`,
      purchase.vendor_id,
    );

    if (!vendor) {
      throw new Error('Vendor not found.');
    }

    if (vendor.business_id !== purchase.business_id) {
      throw new Error(
        'Vendor does not belong to the selected business.',
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. Validate purchase items
     *
     * IMPORTANT:
     * We do NOT require vendor stock.
     *
     * A purchase is inward stock.
     * ---------------------------------------------------------
     */

    for (const item of items) {
      if (!item.product_id) {
        throw new Error('Product is required for every purchase item.');
      }

      if (item.quantity <= 0) {
        throw new Error(
          `Purchase quantity must be greater than zero for product ${item.product_id}.`,
        );
      }

      if (item.unit_price < 0) {
        throw new Error(
          `Purchase rate cannot be negative for product ${item.product_id}.`,
        );
      }

      if (item.gst_rate < 0) {
        throw new Error(
          `GST rate cannot be negative for product ${item.product_id}.`,
        );
      }

      const product = await db.getFirstAsync<{
        id: string;
        business_id: string;
        opening_stock: number;
      }>(
        `SELECT
          id,
          business_id,
          opening_stock
         FROM products
         WHERE id = ?
         LIMIT 1`,
        item.product_id,
      );

      if (!product) {
        throw new Error(
          `Product not found: ${item.product_id}`,
        );
      }

      if (product.business_id !== purchase.business_id) {
        throw new Error(
          `Product ${item.product_id} does not belong to the selected business.`,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * 4. Insert purchase header
     * ---------------------------------------------------------
     */

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
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    /*
     * ---------------------------------------------------------
     * 5. Insert purchase items
     * ---------------------------------------------------------
     */

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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    /*
     * ---------------------------------------------------------
     * 6. Create / update vendor-product relationship
     *
     * This does NOT reduce vendor stock.
     *
     * The vendor-product table is used as the relationship /
     * purchase-price reference between vendor and product.
     * ---------------------------------------------------------
     */

    for (const item of items) {
      const existingVendorProduct = await db.getFirstAsync<{
        id: string;
        available_stock: number;
      }>(
        `SELECT
          id,
          available_stock
         FROM vendor_products
         WHERE vendor_id = ?
           AND product_id = ?
         LIMIT 1`,
        purchase.vendor_id,
        item.product_id,
      );

      const now = new Date().toISOString();

      if (existingVendorProduct) {
        await db.runAsync(
          `UPDATE vendor_products
           SET
             purchase_price = ?,
             updated_at = ?
           WHERE vendor_id = ?
             AND product_id = ?`,
          item.unit_price,
          now,
          purchase.vendor_id,
          item.product_id,
        );
      } else {
        const vendorProductId =
          `vendor_product_${Date.now()}_${item.product_id}`;

        await db.runAsync(
          `INSERT INTO vendor_products (
            id,
            vendor_id,
            product_id,
            purchase_price,
            available_stock,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          vendorProductId,
          purchase.vendor_id,
          item.product_id,
          item.unit_price,
          0,
          now,
          now,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * 7. Increase business inventory
     * ---------------------------------------------------------
     */

    for (const item of items) {
      const product = await db.getFirstAsync<{
        opening_stock: number;
      }>(
        `SELECT
          opening_stock
         FROM products
         WHERE id = ?
           AND business_id = ?
         LIMIT 1`,
        item.product_id,
        purchase.business_id,
      );

      if (!product) {
        throw new Error(
          `Business product not found: ${item.product_id}`,
        );
      }

      const stockBefore = Number(product.opening_stock) || 0;
      const stockAfter = stockBefore + item.quantity;

      /*
       * Update product stock.
       */

      const updateResult = await db.runAsync(
        `UPDATE products
         SET
           opening_stock = ?,
           updated_at = ?
         WHERE id = ?
           AND business_id = ?`,
        stockAfter,
        new Date().toISOString(),
        item.product_id,
        purchase.business_id,
      );

      if (updateResult.changes === 0) {
        throw new Error(
          `Unable to update inventory for product ${item.product_id}.`,
        );
      }

      /*
       * -------------------------------------------------------
       * 8. Create inventory movement
       * -------------------------------------------------------
       */

      const movementId =
        `inventory_${purchase.id}_${item.id}`;

      await db.runAsync(
        `INSERT INTO inventory_movements (
          id,
          business_id,
          product_id,
          movement_type,
          reference_type,
          reference_id,
          quantity,
          stock_before,
          stock_after,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        movementId,
        purchase.business_id,
        item.product_id,
        'IN',
        'PURCHASE',
        purchase.id,
        item.quantity,
        stockBefore,
        stockAfter,
        new Date().toISOString(),
      );
    }
  });
}

/**
 * Get purchase list for a business.
 *
 * Includes vendor name for the Purchase List UI.
 */
export async function getPurchases(
  businessId: string,
): Promise<PurchaseListRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PurchaseListRow>(
    `SELECT
      p.id,
      p.business_id,
      p.vendor_id,
      p.invoice_number,
      p.purchase_date,
      p.subtotal,
      p.gst_amount,
      p.discount,
      p.total_amount,
      p.paid_amount,
      p.due_amount,
      p.payment_status,
      p.notes,
      p.created_at,
      p.updated_at,
      v.name AS vendor_name
     FROM purchases p
     LEFT JOIN vendors v
       ON v.id = p.vendor_id
     WHERE p.business_id = ?
     ORDER BY
       p.purchase_date DESC,
       p.created_at DESC`,
    businessId,
  );
}

/**
 * Get a single purchase.
 */
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

/**
 * Get purchase items.
 */
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

/**
 * Delete purchase.
 *
 * IMPORTANT:
 * Do not connect this to the UI yet.
 *
 * Purchase deletion needs inventory reversal first so that
 * product stock and inventory movements remain correct.
 */
export async function deletePurchase(
  purchaseId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    const purchase = await db.getFirstAsync<{
      id: string;
    }>(
      `SELECT id
       FROM purchases
       WHERE id = ?
       LIMIT 1`,
      purchaseId,
    );

    if (!purchase) {
      throw new Error('Purchase not found.');
    }

    /*
     * We intentionally don't delete yet.
     *
     * A proper delete must:
     *
     * 1. Reverse inventory
     * 2. Create OUT/REVERSAL movement
     * 3. Then delete purchase items
     * 4. Then delete purchase
     *
     * Leaving this protected is safer for the POC.
     */

    throw new Error(
      'Purchase deletion is disabled until inventory reversal is implemented.',
    );
  });
}