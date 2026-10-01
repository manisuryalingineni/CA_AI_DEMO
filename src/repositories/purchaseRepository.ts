import { getDatabase } from '../database/database';


/* =========================================
   TYPES
========================================= */

export type PurchaseStatus =
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID';

export type SupplyType =
  | 'WITHIN_STATE'
  | 'OTHER_STATE';


export type PurchaseRow = {
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
};


export type PurchaseListRow =
  PurchaseRow & {
    vendor_name: string | null;
  };


export type PurchaseItemRow = {
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
};


/* =========================================
   CREATE PURCHASE
========================================= */

export async function createPurchase(
  purchase: PurchaseRow,
  items: PurchaseItemRow[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(
    async () => {

      /*
       * PURCHASE HEADER
       */

      await db.runAsync(
        `
          INSERT INTO purchases (
            id,
            business_id,
            purchase_number,
            vendor_id,
            invoice_number,
            purchase_date,
            due_date,
            supply_type,
            counter_branch,
            salesperson,
            delivery_method,
            subtotal,
            gst_amount,
            cgst_amount,
            sgst_amount,
            igst_amount,
            discount,
            total_amount,
            paid_amount,
            due_amount,
            payment_status,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
          );
        `,
        purchase.id,
        purchase.business_id,
        purchase.purchase_number,
        purchase.vendor_id,
        purchase.invoice_number,
        purchase.purchase_date,
        purchase.due_date,
        purchase.supply_type,
        purchase.counter_branch,
        purchase.salesperson,
        purchase.delivery_method,
        purchase.subtotal,
        purchase.gst_amount,
        purchase.cgst_amount,
        purchase.sgst_amount,
        purchase.igst_amount,
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
       * PURCHASE ITEMS
       */

      for (const item of items) {

        await db.runAsync(
          `
            INSERT INTO purchase_items (
              id,
              purchase_id,
              product_id,
              product_name,
              hsn,
              unit,
              quantity,
              unit_price,
              gst_rate,
              gst_amount,
              discount,
              total_amount,
              created_at
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?
            );
          `,
          item.id,
          item.purchase_id,
          item.product_id,
          item.product_name,
          item.hsn,
          item.unit,
          item.quantity,
          item.unit_price,
          item.gst_rate,
          item.gst_amount,
          item.discount,
          item.total_amount,
          item.created_at,
        );


        /*
         * STOCK INWARD
         *
         * Purchase quantity increases
         * current inventory.
         */

        const result =
          await db.runAsync(
            `
              UPDATE products
              SET
                stock_quantity =
                  stock_quantity + ?,

                updated_at = ?

              WHERE id = ?
                AND business_id = ?;
            `,
            item.quantity,
            purchase.updated_at,
            item.product_id,
            purchase.business_id,
          );


        /*
         * Prevent a purchase from being saved
         * against a product that does not belong
         * to the current business.
         */
        if (
          result.changes !== undefined &&
          result.changes < 1
        ) {
          throw new Error(
            `Product not found: ${item.product_name}`,
          );
        }
      }

    },
  );
}


/* =========================================
   LOAD PURCHASE LIST
========================================= */

export async function getPurchases(
  businessId: string,
): Promise<PurchaseListRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PurchaseListRow>(
    `
      SELECT
        p.id,
        p.business_id,
        p.purchase_number,
        p.vendor_id,
        p.invoice_number,
        p.purchase_date,
        p.due_date,
        p.supply_type,
        p.counter_branch,
        p.salesperson,
        p.delivery_method,
        p.subtotal,
        p.gst_amount,
        p.cgst_amount,
        p.sgst_amount,
        p.igst_amount,
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
        p.created_at DESC;
    `,
    businessId,
  );
}


/* =========================================
   LOAD ONE PURCHASE
========================================= */

export async function getPurchaseById(
  purchaseId: string,
): Promise<PurchaseRow | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<PurchaseRow>(
      `
        SELECT
          id,
          business_id,
          purchase_number,
          vendor_id,
          invoice_number,
          purchase_date,
          due_date,
          supply_type,
          counter_branch,
          salesperson,
          delivery_method,
          subtotal,
          gst_amount,
          cgst_amount,
          sgst_amount,
          igst_amount,
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

        LIMIT 1;
      `,
      purchaseId,
    );

  return row ?? null;
}


/* =========================================
   LOAD PURCHASE ITEMS
========================================= */

export async function getPurchaseItems(
  purchaseId: string,
): Promise<PurchaseItemRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PurchaseItemRow>(
    `
      SELECT
        id,
        purchase_id,
        product_id,
        product_name,
        hsn,
        unit,
        quantity,
        unit_price,
        gst_rate,
        gst_amount,
        discount,
        total_amount,
        created_at

      FROM purchase_items

      WHERE purchase_id = ?

      ORDER BY created_at ASC;
    `,
    purchaseId,
  );
}


/* =========================================
   DASHBOARD TOTALS
========================================= */

export type PurchaseDashboardTotals = {
  purchase_total: number;
  payable_total: number;
  purchase_count: number;
};


export async function getPurchaseDashboardTotals(
  businessId: string,
): Promise<PurchaseDashboardTotals> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<PurchaseDashboardTotals>(
      `
        SELECT
          COALESCE(
            SUM(total_amount),
            0
          ) AS purchase_total,

          COALESCE(
            SUM(due_amount),
            0
          ) AS payable_total,

          COUNT(*) AS purchase_count

        FROM purchases

        WHERE business_id = ?;
      `,
      businessId,
    );


  return (
    row ?? {
      purchase_total: 0,
      payable_total: 0,
      purchase_count: 0,
    }
  );
}


/* =========================================
   DELETE PURCHASE
========================================= */

export async function deletePurchase(
  purchaseId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(
    async () => {

      /*
       * Read the purchase first so that
       * deleting it can reverse stock.
       */

      const purchase =
        await db.getFirstAsync<PurchaseRow>(
          `
            SELECT *
            FROM purchases
            WHERE id = ?
            LIMIT 1;
          `,
          purchaseId,
        );


      if (!purchase) {
        return;
      }


      const items =
        await db.getAllAsync<PurchaseItemRow>(
          `
            SELECT *
            FROM purchase_items
            WHERE purchase_id = ?;
          `,
          purchaseId,
        );


      /*
       * Reverse stock inward.
       */

      for (const item of items) {

        await db.runAsync(
          `
            UPDATE products
            SET
              stock_quantity =
                MAX(
                  stock_quantity - ?,
                  0
                ),

              updated_at = ?

            WHERE id = ?
              AND business_id = ?;
          `,
          item.quantity,
          new Date().toISOString(),
          item.product_id,
          purchase.business_id,
        );

      }


      await db.runAsync(
        `
          DELETE FROM purchase_items
          WHERE purchase_id = ?;
        `,
        purchaseId,
      );


      await db.runAsync(
        `
          DELETE FROM purchases
          WHERE id = ?;
        `,
        purchaseId,
      );

    },
  );
}