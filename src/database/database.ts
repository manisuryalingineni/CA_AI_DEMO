import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

const DATABASE_NAME = "ca_ai_retail.db";

let database: SQLite.SQLiteDatabase | null = null;

/* =========================================================

   MIGRATION TYPES

========================================================= */

type TableInfoRow = {
  cid: number;

  name: string;

  type: string;

  notnull: number;

  dflt_value: unknown;

  pk: number;
};

// Share the initialization promise, not a half-initialized connection.

let initialization: Promise<SQLite.SQLiteDatabase> | null = null;

let writeQueue: Promise<void> = Promise.resolve();

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return Promise.resolve(database);

  if (!initialization) {
    initialization = initializeDatabase()
      .then((db) => {
        database = db;

        return db;
      })
      .catch((error) => {
        initialization = null;

        throw error;
      });
  }

  return initialization;
}

/** All purchase-workflow writes use this queue and a transaction.

 * Native: a separate connection prevents unrelated screen queries joining it.

 * Web: callers using this helper are serialized; other repositories must also

 * use the same helper to obtain the same isolation on web.

 */

export function withPurchaseTransaction<T>(
  task: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const result = writeQueue.then(async () => {
    const db = await getDatabase();

    if (Platform.OS === "web") {
      let value!: T;

      await db.withTransactionAsync(async () => {
        value = await task(db);
      });

      return value;
    }

    const connection = await SQLite.openDatabaseAsync(DATABASE_NAME, {
      useNewConnection: true,
    });

    let started = false;

    try {
      await connection.execAsync(
        "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
      );

      await connection.execAsync("BEGIN IMMEDIATE;");

      started = true;

      const value = await task(connection);

      await connection.execAsync("COMMIT;");

      started = false;

      return value;
    } catch (error) {
      if (started)
        await connection.execAsync("ROLLBACK;").catch(() => undefined);

      throw error;
    } finally {
      // A close failure must not turn a successful commit into a failed save.

      await connection
        .closeAsync()
        .catch((error) => console.warn("Closing purchase connection", error));
    }
  });

  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

/* =========================================================
   SALES TRANSACTIONS
   Use the SAME queue as Purchases, not an independent queue.
   Do not nest transaction helpers. Inside a task, use only
   the supplied connection for reads and writes.
========================================================= */

export function withSalesTransaction<T>(
  task: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return withPurchaseTransaction(task);
}

/* =========================================================

   MIGRATION HELPERS

========================================================= */

async function hasColumn(
  db: SQLite.SQLiteDatabase,

  tableName: string,

  columnName: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(${tableName});`,
  );

  return rows.some((row) => row.name === columnName);
}

async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,

  tableName: string,

  columnName: string,

  definition: string,
): Promise<boolean> {
  const exists = await hasColumn(
    db,

    tableName,

    columnName,
  );

  if (exists) {
    return false;
  }

  await db.execAsync(`

    ALTER TABLE ${tableName}

    ADD COLUMN ${columnName} ${definition};

  `);

  return true;
}

/* =========================================================

   DATABASE

========================================================= */

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    await database.execAsync(
      "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
    );

    await database.execAsync("BEGIN IMMEDIATE;");

    /* =======================================================

     CREATE TABLES

  ======================================================= */

    await database.execAsync(`

    /* =====================================================

       BUSINESSES

    ===================================================== */

    CREATE TABLE IF NOT EXISTS businesses (

      id TEXT PRIMARY KEY NOT NULL,

      name TEXT NOT NULL,

      gstin TEXT,

      business_type TEXT NOT NULL,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    /* =====================================================

       CUSTOMERS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS customers (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      name TEXT NOT NULL,

      mobile TEXT NOT NULL,

      gstin TEXT,

      state TEXT NOT NULL,

      address TEXT,

      credit_days INTEGER NOT NULL DEFAULT 15,

      opening_balance REAL NOT NULL DEFAULT 0,

      business_detail TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_customers_business_id

      ON customers (business_id);

    /* =====================================================

       PRODUCTS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS products (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT NOT NULL,

      sale_price REAL NOT NULL DEFAULT 0,

      purchase_price REAL NOT NULL DEFAULT 0,

      gst_rate REAL NOT NULL DEFAULT 0,

      opening_stock REAL NOT NULL DEFAULT 0,

      stock_quantity REAL NOT NULL DEFAULT 0,

      barcode TEXT,

      brand TEXT,

      rack TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_products_business_id

      ON products (business_id);

    /* =====================================================

       VENDORS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS vendors (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      name TEXT NOT NULL,

      mobile TEXT NOT NULL,

      gstin TEXT,

      state TEXT NOT NULL,

      address TEXT,

      credit_days INTEGER NOT NULL DEFAULT 15,

      opening_balance REAL NOT NULL DEFAULT 0,

      business_detail TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_vendors_business_id

      ON vendors (business_id);

    /* =====================================================

       VENDOR PRODUCTS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS vendor_products (

      id TEXT PRIMARY KEY NOT NULL,

      vendor_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      purchase_price REAL NOT NULL DEFAULT 0,

      available_stock REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      UNIQUE (

        vendor_id,

        product_id

      )

    );

    CREATE INDEX IF NOT EXISTS

      idx_vendor_products_vendor_id

      ON vendor_products (vendor_id);

    CREATE INDEX IF NOT EXISTS

      idx_vendor_products_product_id

      ON vendor_products (product_id);

    /* =====================================================

       PURCHASES

    ===================================================== */

    CREATE TABLE IF NOT EXISTS purchases (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      purchase_number TEXT NOT NULL DEFAULT '',

      vendor_id TEXT,

      invoice_number TEXT,

      purchase_date TEXT NOT NULL,

      due_date TEXT,

      supply_type TEXT NOT NULL DEFAULT 'WITHIN_STATE',

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      paid_amount REAL NOT NULL DEFAULT 0,

      due_amount REAL NOT NULL DEFAULT 0,

      payment_status TEXT NOT NULL DEFAULT 'UNPAID',

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_purchases_business_id

      ON purchases (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchases_vendor_id

      ON purchases (vendor_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchases_date

      ON purchases (purchase_date);

    /* =====================================================

       PURCHASE ITEMS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS purchase_items (

      id TEXT PRIMARY KEY NOT NULL,

      purchase_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL DEFAULT '',

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL DEFAULT 0,

      unit_price REAL NOT NULL DEFAULT 0,

      gst_rate REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_purchase_items_purchase_id

      ON purchase_items (purchase_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchase_items_product_id

      ON purchase_items (product_id);

        /* =====================================================

       PURCHASE RFQS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS purchase_rfqs (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      rfq_number TEXT NOT NULL DEFAULT '',

      vendor_id TEXT,

      rfq_date TEXT NOT NULL,

      valid_until TEXT,

      supply_type TEXT NOT NULL DEFAULT 'WITHIN_STATE',

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_purchase_rfqs_business_id

      ON purchase_rfqs (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchase_rfqs_vendor_id

      ON purchase_rfqs (vendor_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchase_rfqs_date

      ON purchase_rfqs (rfq_date);

    /* =====================================================

       PURCHASE RFQ ITEMS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS purchase_rfq_items (

      id TEXT PRIMARY KEY NOT NULL,

      rfq_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL DEFAULT '',

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL DEFAULT 0,

      unit_price REAL NOT NULL DEFAULT 0,

      gst_rate REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_purchase_rfq_items_rfq_id

      ON purchase_rfq_items (rfq_id);

    CREATE INDEX IF NOT EXISTS

      idx_purchase_rfq_items_product_id

      ON purchase_rfq_items (product_id);

    /* =====================================================

       INVENTORY MOVEMENTS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS inventory_movements (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      movement_type TEXT NOT NULL,

      reference_type TEXT,

      reference_id TEXT,

      quantity REAL NOT NULL,

      stock_before REAL NOT NULL DEFAULT 0,

      stock_after REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_inventory_movements_business_id

      ON inventory_movements (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_inventory_movements_product_id

      ON inventory_movements (product_id);

    CREATE INDEX IF NOT EXISTS

      idx_inventory_movements_reference_id

      ON inventory_movements (reference_id);

    /* =====================================================

       SALES

    ===================================================== */

    CREATE TABLE IF NOT EXISTS sales (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      customer_id TEXT,

      invoice_number TEXT,

      sale_date TEXT NOT NULL,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      paid_amount REAL NOT NULL DEFAULT 0,

      due_amount REAL NOT NULL DEFAULT 0,

      payment_method TEXT NOT NULL DEFAULT 'CASH',

      payment_status TEXT NOT NULL DEFAULT 'UNPAID',

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_sales_business_id

      ON sales (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_sales_customer_id

      ON sales (customer_id);

    /* =====================================================

       SALE ITEMS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS sale_items (

      id TEXT PRIMARY KEY NOT NULL,

      sale_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      quantity REAL NOT NULL,

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_sale_items_sale_id

      ON sale_items (sale_id);

    CREATE INDEX IF NOT EXISTS

      idx_sale_items_product_id

      ON sale_items (product_id);

    /* =====================================================

       PAYMENTS / RECEIPTS

    ===================================================== */

    CREATE TABLE IF NOT EXISTS payments (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      document_type TEXT NOT NULL,

      document_id TEXT NOT NULL,

      document_number TEXT NOT NULL,

      party_name TEXT NOT NULL,

      direction TEXT NOT NULL,

      amount REAL NOT NULL DEFAULT 0,

      mode TEXT NOT NULL,

      payment_date TEXT NOT NULL,

      reference TEXT,

      cheque_number TEXT,

      cheque_bank TEXT,

      cheque_date TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS

      idx_payments_business_id

      ON payments (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_payments_document

      ON payments (

        document_type,

        document_id

      );

    CREATE INDEX IF NOT EXISTS

      idx_payments_created_at

      ON payments (created_at);

    /* =====================================================

       ACTIVITY AUDIT

    ===================================================== */

    CREATE TABLE IF NOT EXISTS activity_audit (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      module TEXT NOT NULL,

      action TEXT NOT NULL,

      title TEXT NOT NULL,

      details TEXT,

      actor_name TEXT NOT NULL DEFAULT 'Business Owner',

      actor_role TEXT NOT NULL DEFAULT 'Business owner',

      entity_type TEXT,

      entity_id TEXT,

      metadata_json TEXT,

      created_at TEXT NOT NULL,

      FOREIGN KEY (business_id)

        REFERENCES businesses(id)

        ON DELETE CASCADE

    );

    CREATE INDEX IF NOT EXISTS

      idx_activity_audit_business_id

      ON activity_audit (business_id);

    CREATE INDEX IF NOT EXISTS

      idx_activity_audit_created_at

      ON activity_audit (created_at DESC);

    CREATE INDEX IF NOT EXISTS

      idx_activity_audit_module

      ON activity_audit (business_id, module, created_at DESC);

    CREATE INDEX IF NOT EXISTS

      idx_activity_audit_action

      ON activity_audit (business_id, action, created_at DESC);

    CREATE INDEX IF NOT EXISTS

      idx_activity_audit_entity

      ON activity_audit (business_id, entity_type, entity_id);

  `);

    /* =======================================================

     MIGRATIONS FOR EXISTING INSTALLS

  ======================================================= */

    /*

   * PRODUCT CURRENT STOCK

   */

    const stockQuantityAdded = await addColumnIfMissing(
      database,

      "products",

      "stock_quantity",

      "REAL NOT NULL DEFAULT 0",
    );

    /*

   * Older installs only had opening_stock.

   *

   * If stock_quantity was added right now,

   * copy opening stock into it once.

   */

    if (stockQuantityAdded) {
      await database.execAsync(`

      UPDATE products

      SET stock_quantity = opening_stock;

    `);
    }

    /*

   * PURCHASE HEADER FIELDS

   */

    await addColumnIfMissing(
      database,

      "purchases",

      "purchase_number",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "due_date",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "supply_type",

      "TEXT NOT NULL DEFAULT 'WITHIN_STATE'",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "counter_branch",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "salesperson",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "delivery_method",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "cgst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "sgst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchases",

      "igst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    /*

   * PURCHASE ITEM SNAPSHOTS

   */

    await addColumnIfMissing(
      database,

      "purchase_items",

      "product_name",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchase_items",

      "hsn",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_items",

      "unit",

      "TEXT",
    );

    /*

 * PURCHASE RFQ HEADER FIELDS

 *

 * These migrations protect existing installations.

 * CREATE TABLE IF NOT EXISTS does not add missing columns

 * to a table that already exists.

 */

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "rfq_number",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "vendor_id",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "rfq_date",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "valid_until",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "supply_type",

      "TEXT NOT NULL DEFAULT 'WITHIN_STATE'",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "counter_branch",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "salesperson",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "delivery_method",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "subtotal",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "gst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "cgst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "sgst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "igst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "discount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "total_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfqs",

      "notes",

      "TEXT",
    );

    /*

 * PURCHASE RFQ ITEM FIELDS

 *

 * Protect existing installations in case an older

 * purchase_rfq_items table is missing newer columns.

 */

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "product_id",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "product_name",

      "TEXT NOT NULL DEFAULT ''",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "hsn",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "unit",

      "TEXT",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "quantity",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "unit_price",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "gst_rate",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "gst_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "discount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "total_amount",

      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,

      "purchase_rfq_items",

      "created_at",

      "TEXT NOT NULL DEFAULT ''",
    );

    /*

 * RFQ NUMBER UNIQUENESS

 *

 * Allow old blank RFQ numbers to remain untouched,

 * but prevent two real RFQs in the same business

 * from receiving the same RFQ number.

 */

    await database.execAsync(`

  CREATE UNIQUE INDEX IF NOT EXISTS

    idx_purchase_rfqs_business_rfq_number

    ON purchase_rfqs (

      business_id,

      rfq_number

    )

    WHERE rfq_number <> '';

`);

    /* PURCHASE WORKFLOW: new documents and audit records. */

    await database.execAsync(`

    CREATE TABLE IF NOT EXISTS purchase_document_sequences (

      business_id TEXT NOT NULL,

      document_type TEXT NOT NULL,

      last_number INTEGER NOT NULL,

      PRIMARY KEY (business_id, document_type)

    );

    CREATE TABLE IF NOT EXISTS purchase_document_links (

      business_id TEXT NOT NULL,

      source_type TEXT NOT NULL,

      source_id TEXT NOT NULL,

      target_type TEXT NOT NULL,

      target_id TEXT NOT NULL,

      created_at TEXT NOT NULL,

      PRIMARY KEY (target_type, target_id)

    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_single_conversion

      ON purchase_document_links (business_id, source_type, source_id, target_type)

      WHERE target_type <> 'RETURN';

    CREATE INDEX IF NOT EXISTS idx_purchase_links_source

      ON purchase_document_links (business_id, source_type, source_id);

    CREATE TABLE IF NOT EXISTS purchase_payments (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      purchase_id TEXT NOT NULL,

      direction TEXT NOT NULL CHECK (direction IN ('PAYMENT', 'REFUND')),

      amount REAL NOT NULL CHECK (amount > 0),

      payment_date TEXT NOT NULL,

      payment_method TEXT NOT NULL,

      notes TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase

      ON purchase_payments (business_id, purchase_id);

  `);

    await database.execAsync(`

    CREATE TABLE IF NOT EXISTS purchase_requests (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      document_number TEXT NOT NULL,

      vendor_id TEXT NOT NULL,

      document_date TEXT NOT NULL,

      due_date TEXT,

      supply_type TEXT NOT NULL,

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      invoice_number TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      refunded_amount REAL NOT NULL DEFAULT 0,

      source_type TEXT,

      source_id TEXT,

      vendor_snapshot TEXT,

      business_snapshot TEXT,

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      UNIQUE (business_id, document_number)

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_requests_business_date

      ON purchase_requests (business_id, document_date);

    CREATE TABLE IF NOT EXISTS purchase_request_items (

      id TEXT PRIMARY KEY NOT NULL,

      document_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL CHECK (quantity > 0),

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL,

      position INTEGER NOT NULL DEFAULT 0,

      source_item_id TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_request_items_document

      ON purchase_request_items (document_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_request_items_source

      ON purchase_request_items (source_item_id);

  `);

    await database.execAsync(`

    CREATE TABLE IF NOT EXISTS purchase_orders (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      document_number TEXT NOT NULL,

      vendor_id TEXT NOT NULL,

      document_date TEXT NOT NULL,

      due_date TEXT,

      supply_type TEXT NOT NULL,

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      invoice_number TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      refunded_amount REAL NOT NULL DEFAULT 0,

      source_type TEXT,

      source_id TEXT,

      vendor_snapshot TEXT,

      business_snapshot TEXT,

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      UNIQUE (business_id, document_number)

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_date

      ON purchase_orders (business_id, document_date);

    CREATE TABLE IF NOT EXISTS purchase_order_items (

      id TEXT PRIMARY KEY NOT NULL,

      document_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL CHECK (quantity > 0),

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL,

      position INTEGER NOT NULL DEFAULT 0,

      source_item_id TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_document

      ON purchase_order_items (document_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_source

      ON purchase_order_items (source_item_id);

  `);

    await database.execAsync(`

    CREATE TABLE IF NOT EXISTS purchase_grns (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      document_number TEXT NOT NULL,

      vendor_id TEXT NOT NULL,

      document_date TEXT NOT NULL,

      due_date TEXT,

      supply_type TEXT NOT NULL,

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      invoice_number TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      refunded_amount REAL NOT NULL DEFAULT 0,

      source_type TEXT,

      source_id TEXT,

      vendor_snapshot TEXT,

      business_snapshot TEXT,

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      UNIQUE (business_id, document_number)

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_grns_business_date

      ON purchase_grns (business_id, document_date);

    CREATE TABLE IF NOT EXISTS purchase_grn_items (

      id TEXT PRIMARY KEY NOT NULL,

      document_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL CHECK (quantity > 0),

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL,

      position INTEGER NOT NULL DEFAULT 0,

      source_item_id TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_grn_items_document

      ON purchase_grn_items (document_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_grn_items_source

      ON purchase_grn_items (source_item_id);

  `);

    await database.execAsync(`

    CREATE TABLE IF NOT EXISTS purchase_returns (

      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      document_number TEXT NOT NULL,

      vendor_id TEXT NOT NULL,

      document_date TEXT NOT NULL,

      due_date TEXT,

      supply_type TEXT NOT NULL,

      counter_branch TEXT,

      salesperson TEXT,

      delivery_method TEXT,

      invoice_number TEXT,

      subtotal REAL NOT NULL DEFAULT 0,

      gst_amount REAL NOT NULL DEFAULT 0,

      cgst_amount REAL NOT NULL DEFAULT 0,

      sgst_amount REAL NOT NULL DEFAULT 0,

      igst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL DEFAULT 0,

      refunded_amount REAL NOT NULL DEFAULT 0,

      source_type TEXT,

      source_id TEXT,

      vendor_snapshot TEXT,

      business_snapshot TEXT,

      notes TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      UNIQUE (business_id, document_number)

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_returns_business_date

      ON purchase_returns (business_id, document_date);

    CREATE TABLE IF NOT EXISTS purchase_return_items (

      id TEXT PRIMARY KEY NOT NULL,

      document_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      product_name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL CHECK (quantity > 0),

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL,

      position INTEGER NOT NULL DEFAULT 0,

      source_item_id TEXT,

      created_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_document

      ON purchase_return_items (document_id);

    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_source

      ON purchase_return_items (source_item_id);

  `);

    // Extend old bills/RFQs without moving or recreating their existing records.

    for (const table of ["purchases", "purchase_rfqs"]) {
      for (const column of [
        "source_type",
        "source_id",
        "vendor_snapshot",
        "business_snapshot",
      ]) {
        await addColumnIfMissing(database, table, column, "TEXT");
      }
    }

    await addColumnIfMissing(
      database,
      "purchases",
      "return_amount",
      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,
      "purchases",
      "refunded_amount",
      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,
      "purchases",
      "vendor_credit",
      "REAL NOT NULL DEFAULT 0",
    );

    await addColumnIfMissing(
      database,
      "purchases",
      "match_status",
      "TEXT NOT NULL DEFAULT 'NOT_CHECKED'",
    );

    for (const table of ["purchase_items", "purchase_rfq_items"]) {
      await addColumnIfMissing(
        database,
        table,
        "position",
        "INTEGER NOT NULL DEFAULT 0",
      );

      await addColumnIfMissing(database, table, "source_item_id", "TEXT");
    }

    // Compatibility with the existing product-create repository, which may only

    // supply opening_stock. This runs on INSERT only, never resets existing stock.

    await database.execAsync(`

    CREATE TRIGGER IF NOT EXISTS purchase_initial_product_stock

    AFTER INSERT ON products

    WHEN NEW.stock_quantity = 0 AND NEW.opening_stock <> 0

    BEGIN

      UPDATE products SET stock_quantity = NEW.opening_stock WHERE id = NEW.id;

    END;

  `);

    /* SALES WORKFLOW: additive upgrade; existing invoices and stock stay intact. */
    await migrateSalesWorkflow(database);
    await migrateSalesWorkflowPatchV11(database);

    /* =======================================================

     RETAIL POC SEED DATA

  ======================================================= */

    const now = new Date().toISOString();

    /* =======================================================

     FIND / CREATE BUSINESS

  ======================================================= */

    let businessId: string;

    const existingBusiness = await database.getFirstAsync<{
      id: string;
    }>(
      `

        SELECT id

        FROM businesses

        ORDER BY created_at ASC

        LIMIT 1

      `,
    );

    if (existingBusiness) {
      businessId = existingBusiness.id;
    } else {
      businessId = "business_retail_poc";

      await database.runAsync(
        `

        INSERT OR IGNORE INTO businesses (

          id,

          name,

          gstin,

          business_type,

          created_at,

          updated_at

        )

        VALUES (?, ?, ?, ?, ?, ?)

      `,

        [businessId, "Retail Shop", "", "RETAIL", now, now],
      );
    }

    /* =======================================================

     WALK-IN CUSTOMER

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO customers (

        id,

        business_id,

        name,

        mobile,

        gstin,

        state,

        address,

        credit_days,

        opening_balance,

        business_detail,

        created_at,

        updated_at

      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    `,

      [
        "customer_walk_in",

        businessId,

        "Walk-in Customer",

        "",

        "",

        "Andhra Pradesh",

        "",

        0,

        0,

        "Retail counter customer",

        now,

        now,
      ],
    );

    /* =======================================================

     SAMPLE VENDOR

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO vendors (

        id,

        business_id,

        name,

        mobile,

        gstin,

        state,

        address,

        credit_days,

        opening_balance,

        business_detail,

        created_at,

        updated_at

      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    `,

      [
        "vendor_sri_lakshmi",

        businessId,

        "Sri Lakshmi Distributors",

        "9876543210",

        "",

        "Andhra Pradesh",

        "",

        15,

        0,

        "Retail stock supplier",

        now,

        now,
      ],
    );

    // Existing seeded vendor ownership is deliberately not reassigned.

    /* =======================================================

     SAMPLE PRODUCT 1

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO products (

        id,

        business_id,

        name,

        hsn,

        unit,

        sale_price,

        purchase_price,

        gst_rate,

        opening_stock,

        stock_quantity,

        barcode,

        brand,

        rack,

        created_at,

        updated_at

      )

      VALUES (

        ?, ?, ?, ?, ?, ?, ?, ?, ?,

        ?, ?, ?, ?, ?, ?

      )

    `,

      [
        "product_premium_rice_5kg",

        businessId,

        "Premium Rice 5kg",

        "100630",

        "Bag",

        650,

        570,

        5,

        24,

        24,

        "",

        "",

        "A1",

        now,

        now,
      ],
    );

    /* =======================================================

     SAMPLE PRODUCT 2

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO products (

        id,

        business_id,

        name,

        hsn,

        unit,

        sale_price,

        purchase_price,

        gst_rate,

        opening_stock,

        stock_quantity,

        barcode,

        brand,

        rack,

        created_at,

        updated_at

      )

      VALUES (

        ?, ?, ?, ?, ?, ?, ?, ?, ?,

        ?, ?, ?, ?, ?, ?

      )

    `,

      [
        "product_groundnut_oil_1l",

        businessId,

        "Groundnut Oil 1L",

        "151550",

        "Bottle",

        190,

        168,

        5,

        36,

        36,

        "",

        "",

        "A2",

        now,

        now,
      ],
    );

    /* =======================================================

     SAMPLE PRODUCT 3

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO products (

        id,

        business_id,

        name,

        hsn,

        unit,

        sale_price,

        purchase_price,

        gst_rate,

        opening_stock,

        stock_quantity,

        barcode,

        brand,

        rack,

        created_at,

        updated_at

      )

      VALUES (

        ?, ?, ?, ?, ?, ?, ?, ?, ?,

        ?, ?, ?, ?, ?, ?

      )

    `,

      [
        "product_bath_soap",

        businessId,

        "Bath Soap",

        "340111",

        "Piece",

        42,

        34,

        18,

        60,

        60,

        "",

        "",

        "A3",

        now,

        now,
      ],
    );

    // Existing seeded product ownership is deliberately not reassigned.

    /* =======================================================

     VENDOR → PRODUCT RELATIONSHIP 1

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO vendor_products (

        id,

        vendor_id,

        product_id,

        purchase_price,

        available_stock,

        created_at,

        updated_at

      )

      VALUES (?, ?, ?, ?, ?, ?, ?)

    `,

      [
        "vendor_product_rice",

        "vendor_sri_lakshmi",

        "product_premium_rice_5kg",

        570,

        24,

        now,

        now,
      ],
    );

    /* =======================================================

     VENDOR → PRODUCT RELATIONSHIP 2

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO vendor_products (

        id,

        vendor_id,

        product_id,

        purchase_price,

        available_stock,

        created_at,

        updated_at

      )

      VALUES (?, ?, ?, ?, ?, ?, ?)

    `,

      [
        "vendor_product_oil",

        "vendor_sri_lakshmi",

        "product_groundnut_oil_1l",

        168,

        36,

        now,

        now,
      ],
    );

    /* =======================================================

     VENDOR → PRODUCT RELATIONSHIP 3

  ======================================================= */

    await database.runAsync(
      `

      INSERT OR IGNORE INTO vendor_products (

        id,

        vendor_id,

        product_id,

        purchase_price,

        available_stock,

        created_at,

        updated_at

      )

      VALUES (?, ?, ?, ?, ?, ?, ?)

    `,

      [
        "vendor_product_soap",

        "vendor_sri_lakshmi",

        "product_bath_soap",

        34,

        60,

        now,

        now,
      ],
    );

    await database.execAsync("COMMIT;");

    return database;
  } catch (error) {
    await database.execAsync("ROLLBACK;").catch(() => undefined);

    await database.closeAsync().catch(() => undefined);

    throw error;
  }
}

/* =========================================================
   SALES WORKFLOW V1.1 - SALE ITEM BUSINESS OWNERSHIP PATCH

   V1 introduced workflow snapshots on legacy sale_items but the original
   table had no business_id column. New workflow invoice lines and guards
   require it. This patch is deliberately a NEW migration ID because some
   devices may already have sales-workflow-v1 marked as applied.
========================================================= */

async function migrateSalesWorkflowPatchV11(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const migrationId = "sales-workflow-v1.1-sale-item-business";

  const applied = await db.getFirstAsync<{ migration_id: string }>(
    "SELECT migration_id FROM sales_schema_migrations WHERE migration_id = ?",
    migrationId,
  );

  if (applied) return;

  await addColumnIfMissing(db, "sale_items", "business_id", "TEXT");

  // Existing rows inherit ownership from their parent invoice.
  // No item values, quantities, tax, stock, or invoice numbers are changed.
  await db.execAsync(`
    UPDATE sale_items
    SET business_id = (
      SELECT s.business_id
      FROM sales s
      WHERE s.id = sale_items.sale_id
    )
    WHERE business_id IS NULL OR length(trim(business_id)) = 0;

    CREATE INDEX IF NOT EXISTS idx_sale_items_business
      ON sale_items (business_id, sale_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_item_business_identity
      ON sale_items (business_id, sale_id, id, product_id);
  `);

  const orphan = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM sale_items i
    LEFT JOIN sales s ON s.id = i.sale_id
    WHERE s.id IS NULL
       OR i.business_id IS NULL
       OR length(trim(i.business_id)) = 0
       OR i.business_id <> s.business_id
  `);

  if ((orphan?.count ?? 0) > 0) {
    throw new Error(
      "Sales migration found invoice items without a valid business owner.",
    );
  }

  // Legacy POS inserts do not provide business_id. Populate it from the
  // parent invoice before workflow validation runs. Workflow repository
  // inserts provide business_id explicitly and are unaffected.
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS sales_item_business_fill_after_insert
    AFTER INSERT ON sale_items
    WHEN NEW.business_id IS NULL OR length(trim(NEW.business_id)) = 0
    BEGIN
      UPDATE sale_items
      SET business_id = (
        SELECT s.business_id FROM sales s WHERE s.id = NEW.sale_id
      )
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS sales_item_business_guard_update
    BEFORE UPDATE OF business_id, sale_id ON sale_items
    WHEN NEW.business_id IS NOT NULL
    BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = NEW.sale_id AND s.business_id = NEW.business_id
      ) THEN RAISE(ABORT, 'Invoice item belongs to another business.') END;
    END;
  `);

  await db.runAsync(
    "INSERT INTO sales_schema_migrations (migration_id, applied_at) VALUES (?, ?)",
    migrationId,
    new Date().toISOString(),
  );
}

/* =========================================================
   SALES WORKFLOW V1 - ADDITIVE MIGRATION

   Existing invoices remain in sales / sale_items.
   Only quotation, order, delivery and return use new tables.
   Called INSIDE initializeDatabase's existing transaction.
   Never replay old stock movements or invent old snapshots.
========================================================= */

type SalesSchemaTable = {
  documentType:
    | "QUOTATION"
    | "SALES_ORDER"
    | "DELIVERY_CHALLAN"
    | "SALES_RETURN";
  table: string;
  items: string;
  prefix: string;
  sourceType: string | null;
  sourceTable: string | null;
  sourceItems: string | null;
  sourceItemDocumentKey: "document_id" | "sale_id";
};

// SQL identifiers below are fixed application constants, never user input.
const SALES_SCHEMA_TABLES: readonly SalesSchemaTable[] = [
  {
    documentType: "QUOTATION",
    table: "sales_quotations",
    items: "sales_quotation_items",
    prefix: "QT",
    sourceType: null,
    sourceTable: null,
    sourceItems: null,
    sourceItemDocumentKey: "document_id",
  },
  {
    documentType: "SALES_ORDER",
    table: "sales_orders",
    items: "sales_order_items",
    prefix: "SO",
    sourceType: "QUOTATION",
    sourceTable: "sales_quotations",
    sourceItems: "sales_quotation_items",
    sourceItemDocumentKey: "document_id",
  },
  {
    documentType: "DELIVERY_CHALLAN",
    table: "sales_delivery_challans",
    items: "sales_delivery_challan_items",
    prefix: "DC",
    sourceType: "SALES_ORDER",
    sourceTable: "sales_orders",
    sourceItems: "sales_order_items",
    sourceItemDocumentKey: "document_id",
  },
  {
    documentType: "SALES_RETURN",
    table: "sales_returns",
    items: "sales_return_items",
    prefix: "SR",
    sourceType: "SALES_INVOICE",
    sourceTable: "sales",
    sourceItems: "sale_items",
    sourceItemDocumentKey: "sale_id",
  },
];

async function migrateSalesWorkflow(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales_schema_migrations (
      migration_id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationId = "sales-workflow-v1";
  const applied = await db.getFirstAsync<{ migration_id: string }>(
    "SELECT migration_id FROM sales_schema_migrations WHERE migration_id = ?",
    migrationId,
  );

  if (applied) return;

  /* Unknown is intentional. A zero-stock item is NOT automatically a service.
   * The sales service will require explicit classification before stock posting.
   */
  await addColumnIfMissing(
    db,
    "products",
    "item_kind",
    "TEXT CHECK (item_kind IN ('PRODUCT', 'SERVICE'))",
  );

  const invoiceColumns: ReadonlyArray<readonly [string, string]> = [
    ["due_date", "TEXT"],
    ["reference_number", "TEXT"],
    [
      "supply_type",
      "TEXT CHECK (supply_type IN ('WITHIN_STATE', 'OTHER_STATE'))",
    ],
    ["cgst_amount", "REAL CHECK (cgst_amount >= 0)"],
    ["sgst_amount", "REAL CHECK (sgst_amount >= 0)"],
    ["igst_amount", "REAL CHECK (igst_amount >= 0)"],
    ["return_amount", "REAL NOT NULL DEFAULT 0 CHECK (return_amount >= 0)"],
    ["refunded_amount", "REAL NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0)"],
    ["customer_credit", "REAL NOT NULL DEFAULT 0 CHECK (customer_credit >= 0)"],
    ["source_type", "TEXT CHECK (source_type = 'DELIVERY_CHALLAN')"],
    ["source_id", "TEXT"],
    ["custom_fields", "TEXT NOT NULL DEFAULT '[]'"],
    ["business_snapshot", "TEXT"],
    ["customer_snapshot", "TEXT"],
    ["pdf_settings_snapshot", "TEXT"],
    [
      "document_state",
      "TEXT NOT NULL DEFAULT 'ISSUED' CHECK (document_state IN ('ISSUED', 'PART_PAID', 'PAID'))",
    ],
    [
      "snapshot_status",
      "TEXT NOT NULL DEFAULT 'LEGACY_FALLBACK' CHECK (snapshot_status IN ('SAVED', 'LEGACY_FALLBACK'))",
    ],
    [
      "inventory_posting_status",
      "TEXT NOT NULL DEFAULT 'LEGACY_UNVERIFIED' CHECK (inventory_posting_status IN ('POSTED', 'NOT_APPLICABLE', 'LEGACY_UNVERIFIED'))",
    ],
    ["request_fingerprint", "TEXT"],
  ];

  for (const [name, definition] of invoiceColumns) {
    await addColumnIfMissing(db, "sales", name, definition);
  }

  const itemColumns: ReadonlyArray<readonly [string, string]> = [
    ["product_name", "TEXT"],
    ["hsn", "TEXT"],
    ["unit", "TEXT"],
    ["item_kind", "TEXT CHECK (item_kind IN ('PRODUCT', 'SERVICE'))"],
    ["taxable_amount", "REAL CHECK (taxable_amount >= 0)"],
    ["cgst_amount", "REAL CHECK (cgst_amount >= 0)"],
    ["sgst_amount", "REAL CHECK (sgst_amount >= 0)"],
    ["igst_amount", "REAL CHECK (igst_amount >= 0)"],
    ["position", "INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0)"],
    ["source_document_id", "TEXT"],
    ["source_item_id", "TEXT"],
    [
      "snapshot_status",
      "TEXT NOT NULL DEFAULT 'LEGACY_FALLBACK' CHECK (snapshot_status IN ('SAVED', 'LEGACY_FALLBACK'))",
    ],
  ];

  for (const [name, definition] of itemColumns) {
    await addColumnIfMissing(db, "sale_items", name, definition);
  }

  // These redundant-by-ID unique indexes provide explicit composite FK targets.
  // They do NOT require old invoice numbers to be unique.
  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_customer_identity
      ON customers (business_id, id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_product_identity
      ON products (business_id, id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_identity
      ON sales (business_id, id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_item_identity
      ON sale_items (sale_id, id, product_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_payment_identity
      ON payments (business_id, id);

    CREATE INDEX IF NOT EXISTS idx_sales_invoice_business_date
      ON sales (business_id, sale_date, created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_number_lookup
      ON sales (business_id, invoice_number COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_source
      ON sale_items (source_document_id, source_item_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_single_delivery
      ON sales (business_id, source_id)
      WHERE source_type = 'DELIVERY_CHALLAN' AND source_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS sales_document_sequences (
      business_id TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK (document_type IN (
        'QUOTATION', 'SALES_ORDER', 'DELIVERY_CHALLAN',
        'SALES_INVOICE', 'SALES_RETURN'
      )),
      last_number INTEGER NOT NULL DEFAULT 1000
        CHECK (typeof(last_number) = 'integer' AND last_number >= 0
          AND last_number <= 9007199254740991),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (business_id, document_type),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sales_pdf_settings (
      business_id TEXT PRIMARY KEY NOT NULL,
      settings_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
    );
  `);

  // Parents precede children. Returns reference existing invoices, not copies.
  for (const entry of SALES_SCHEMA_TABLES) {
    await createSalesWorkflowTables(db, entry);
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales_document_links (
      business_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL CHECK (length(trim(target_id)) > 0),
      created_at TEXT NOT NULL,
      PRIMARY KEY (business_id, target_type, target_id),
      CHECK (
        (source_type = 'QUOTATION' AND target_type = 'SALES_ORDER') OR
        (source_type = 'SALES_ORDER' AND target_type = 'DELIVERY_CHALLAN') OR
        (source_type = 'DELIVERY_CHALLAN' AND target_type = 'SALES_INVOICE') OR
        (source_type = 'SALES_INVOICE' AND target_type = 'SALES_RETURN')
      ),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_single_conversion
      ON sales_document_links (business_id, source_type, source_id, target_type)
      WHERE target_type <> 'SALES_RETURN';
    CREATE INDEX IF NOT EXISTS idx_sales_links_source
      ON sales_document_links (business_id, source_type, source_id);

    /* Monetary receipt/refund rows stay in the EXISTING payments table.
     * This is an association table, not a duplicate monetary ledger.
     * The repository will insert payment + link + balance update atomically.
     * Existing unrelated payments are not inferred, duplicated or modified.
     */
    CREATE TABLE IF NOT EXISTS sales_payment_links (
      payment_id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('RECEIPT', 'REFUND')),
      return_id TEXT,
      request_fingerprint TEXT,
      created_at TEXT NOT NULL,
      CHECK (
        (direction = 'RECEIPT' AND return_id IS NULL) OR
        (direction = 'REFUND' AND return_id IS NOT NULL)
      ),
      FOREIGN KEY (business_id, payment_id)
        REFERENCES payments(business_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (business_id, invoice_id)
        REFERENCES sales(business_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (business_id, invoice_id, return_id)
        REFERENCES sales_returns(business_id, source_id, id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS idx_sales_payment_links_invoice
      ON sales_payment_links (business_id, invoice_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_payment_links_return
      ON sales_payment_links (business_id, return_id);
  `);

  await addSalesWorkflowGuards(db);
  await seedSalesDocumentSequences(db);

  // Mark applied LAST. initializeDatabase commits the whole upgrade, or rolls
  // it all back. Do not independently BEGIN/COMMIT inside this migration.
  await db.runAsync(
    "INSERT INTO sales_schema_migrations (migration_id, applied_at) VALUES (?, ?)",
    migrationId,
    new Date().toISOString(),
  );
}

async function createSalesWorkflowTables(
  db: SQLite.SQLiteDatabase,
  entry: SalesSchemaTable,
): Promise<void> {
  const isReturn = entry.documentType === "SALES_RETURN";
  const sourceRequired = isReturn ? "NOT NULL" : "";

  const sourceCheck =
    entry.sourceType === null
      ? "source_type IS NULL AND source_id IS NULL"
      : `(
        ${isReturn ? "" : "(source_type IS NULL AND source_id IS NULL) OR"}
        (source_type IS NOT NULL AND source_id IS NOT NULL
          AND source_type = '${entry.sourceType}'
          AND length(trim(source_id)) > 0)
      )`;

  const sourceForeignKey = entry.sourceTable
    ? `, FOREIGN KEY (business_id, source_id)
        REFERENCES ${entry.sourceTable}(business_id, id) ON DELETE RESTRICT`
    : "";

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${entry.table} (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      business_id TEXT NOT NULL,
      document_number TEXT NOT NULL COLLATE NOCASE
        CHECK (length(trim(document_number)) > 0 AND document_number = trim(document_number)),
      customer_id TEXT,
      document_date TEXT NOT NULL,
      due_date TEXT,
      reference_number TEXT,
      supply_type TEXT NOT NULL CHECK (supply_type IN ('WITHIN_STATE', 'OTHER_STATE')),
      subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
      gst_amount REAL NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
      cgst_amount REAL NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
      sgst_amount REAL NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
      igst_amount REAL NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
      discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
      total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
      refunded_amount REAL NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
      source_type TEXT ${sourceRequired},
      source_id TEXT ${sourceRequired},
      custom_fields TEXT NOT NULL DEFAULT '[]',
      business_snapshot TEXT NOT NULL,
      customer_snapshot TEXT NOT NULL,
      pdf_settings_snapshot TEXT,
      snapshot_status TEXT NOT NULL DEFAULT 'SAVED'
        CHECK (snapshot_status = 'SAVED'),
      document_state TEXT NOT NULL DEFAULT '${isReturn ? "ISSUED" : "WORKFLOW"}'
        CHECK (document_state = '${isReturn ? "ISSUED" : "WORKFLOW"}'),
      inventory_posting_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (inventory_posting_status IN (
          ${isReturn ? "'POSTED', 'NOT_APPLICABLE'" : "'NOT_APPLICABLE'"}
        )),
      request_fingerprint TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (business_id, document_number),
      UNIQUE (business_id, id),
      UNIQUE (business_id, id, source_id),
      UNIQUE (business_id, source_id, id),
      CHECK (${sourceCheck}),
      CHECK (${isReturn ? "total_amount > 0" : "refunded_amount = 0"}),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT,
      FOREIGN KEY (business_id, customer_id)
        REFERENCES customers(business_id, id) ON DELETE RESTRICT
      ${sourceForeignKey}
    );
    CREATE INDEX IF NOT EXISTS idx_${entry.table}_business_date
      ON ${entry.table} (business_id, document_date, created_at);
    CREATE INDEX IF NOT EXISTS idx_${entry.table}_customer
      ON ${entry.table} (business_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_${entry.table}_source
      ON ${entry.table} (business_id, source_id);
  `);

  if (entry.sourceType && !isReturn) {
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_${entry.table}_single_source
        ON ${entry.table} (business_id, source_id)
        WHERE source_id IS NOT NULL;
    `);
  }

  const sourceItemCheck =
    entry.sourceItems === null
      ? "source_document_id IS NULL AND source_item_id IS NULL"
      : `(
        ${isReturn ? "" : "(source_document_id IS NULL AND source_item_id IS NULL) OR"}
        (source_document_id IS NOT NULL AND source_item_id IS NOT NULL
          AND length(trim(source_document_id)) > 0
          AND length(trim(source_item_id)) > 0)
      )`;

  const sourceItemForeignKey = entry.sourceItems
    ? `, FOREIGN KEY (source_document_id, source_item_id, product_id)
        REFERENCES ${entry.sourceItems}(${entry.sourceItemDocumentKey}, id, product_id)
        ON DELETE RESTRICT`
    : "";

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${entry.items} (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      business_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL CHECK (length(trim(product_name)) > 0),
      hsn TEXT,
      unit TEXT,
      item_kind TEXT CHECK (item_kind IN ('PRODUCT', 'SERVICE')),
      quantity REAL NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      gst_rate REAL NOT NULL CHECK (gst_rate >= 0 AND gst_rate <= 100),
      discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
      taxable_amount REAL NOT NULL CHECK (taxable_amount >= 0),
      gst_amount REAL NOT NULL CHECK (gst_amount >= 0),
      cgst_amount REAL NOT NULL CHECK (cgst_amount >= 0),
      sgst_amount REAL NOT NULL CHECK (sgst_amount >= 0),
      igst_amount REAL NOT NULL CHECK (igst_amount >= 0),
      total_amount REAL NOT NULL CHECK (total_amount >= 0),
      position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
      source_document_id TEXT ${sourceRequired},
      source_item_id TEXT ${sourceRequired},
      snapshot_status TEXT NOT NULL DEFAULT 'SAVED' CHECK (snapshot_status = 'SAVED'),
      created_at TEXT NOT NULL,
      UNIQUE (document_id, id, product_id),
      CHECK (${sourceItemCheck}),
      FOREIGN KEY (business_id, document_id)
        REFERENCES ${entry.table}(business_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (business_id, document_id, source_document_id)
        REFERENCES ${entry.table}(business_id, id, source_id) ON DELETE RESTRICT
      ${sourceItemForeignKey}
    );
    CREATE INDEX IF NOT EXISTS idx_${entry.items}_document
      ON ${entry.items} (business_id, document_id, position);
    CREATE INDEX IF NOT EXISTS idx_${entry.items}_source
      ON ${entry.items} (source_document_id, source_item_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_${entry.items}_single_source_line
      ON ${entry.items} (document_id, source_item_id)
      WHERE source_item_id IS NOT NULL;
  `);
}

async function addSalesWorkflowGuards(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  /* Existing installations can already contain duplicate INV numbers.
   * A UNIQUE index over those old rows would prevent the app from opening.
   * Preserve them; reject NEW collisions without renumbering old invoices.
   */
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS sales_invoice_number_insert
    BEFORE INSERT ON sales
    WHEN length(trim(COALESCE(NEW.invoice_number, ''))) > 0
    BEGIN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM sales s
        WHERE s.business_id = NEW.business_id
          AND trim(s.invoice_number) = trim(NEW.invoice_number) COLLATE NOCASE
      ) THEN RAISE(ABORT, 'This invoice number is already used in this business.') END;
    END;

    CREATE TRIGGER IF NOT EXISTS sales_invoice_number_update
    BEFORE UPDATE OF invoice_number, business_id ON sales
    WHEN length(trim(COALESCE(NEW.invoice_number, ''))) > 0
      AND (NEW.business_id IS NOT OLD.business_id
        OR NEW.invoice_number IS NOT OLD.invoice_number)
    BEGIN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM sales s
        WHERE s.business_id = NEW.business_id AND s.id <> OLD.id
          AND trim(s.invoice_number) = trim(NEW.invoice_number) COLLATE NOCASE
      ) THEN RAISE(ABORT, 'This invoice number is already used in this business.') END;
    END;
  `);

  // ALTER TABLE cannot retrofit these composite FKs onto existing invoices.
  // Apply guards only to new SAVED workflow rows; leave legacy POS contracts
  // usable while the repository/service replacement is delivered next.
  const invoiceValidation = `
    SELECT CASE WHEN NOT EXISTS (
      SELECT 1 FROM businesses b WHERE b.id = NEW.business_id
    ) THEN RAISE(ABORT, 'Select a valid invoice business.') END;

    SELECT CASE WHEN NEW.customer_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM customers c
      WHERE c.business_id = NEW.business_id AND c.id = NEW.customer_id
    ) THEN RAISE(ABORT, 'Invoice customer belongs to another business or is missing.') END;

    SELECT CASE WHEN NEW.supply_type IS NULL
      OR NEW.cgst_amount IS NULL OR NEW.sgst_amount IS NULL OR NEW.igst_amount IS NULL
      OR NEW.business_snapshot IS NULL OR NEW.customer_snapshot IS NULL
      OR length(trim(COALESCE(NEW.invoice_number, ''))) = 0
      OR NEW.inventory_posting_status = 'LEGACY_UNVERIFIED'
    THEN RAISE(ABORT, 'A new invoice requires tax, identity and posting information.') END;

    SELECT CASE WHEN NOT (
      (NEW.source_type IS NULL AND NEW.source_id IS NULL) OR
      (NEW.source_type IS NOT NULL AND NEW.source_type = 'DELIVERY_CHALLAN'
        AND NEW.source_id IS NOT NULL)
    ) THEN RAISE(ABORT, 'Invoice source type and ID must be supplied together.') END;

    SELECT CASE WHEN NEW.source_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sales_delivery_challans d
      WHERE d.business_id = NEW.business_id AND d.id = NEW.source_id
        AND d.customer_id IS NEW.customer_id AND d.document_date <= NEW.sale_date
    ) THEN RAISE(ABORT, 'Invoice source/customer/date does not match the delivery challan.') END;
  `;

  const itemValidation = `
    SELECT CASE WHEN NOT EXISTS (
      SELECT 1 FROM sales s JOIN products p ON p.business_id = s.business_id
      WHERE s.id = NEW.sale_id AND p.id = NEW.product_id
        AND s.snapshot_status = 'SAVED'
    ) THEN RAISE(ABORT, 'Invoice line does not match its business or saved invoice.') END;

    SELECT CASE WHEN NEW.product_name IS NULL OR length(trim(NEW.product_name)) = 0
      OR NEW.item_kind IS NULL OR NEW.taxable_amount IS NULL
      OR NEW.cgst_amount IS NULL OR NEW.sgst_amount IS NULL OR NEW.igst_amount IS NULL
      OR NEW.quantity <= 0 OR NEW.unit_price < 0
      OR NEW.gst_rate < 0 OR NEW.gst_rate > 100 OR NEW.discount < 0
      OR NEW.total_amount < 0 OR NEW.gst_amount < 0
    THEN RAISE(ABORT, 'A new invoice line requires valid amounts and item snapshots.') END;

    SELECT CASE WHEN NOT (
      (NEW.source_document_id IS NULL AND NEW.source_item_id IS NULL) OR
      (NEW.source_document_id IS NOT NULL AND NEW.source_item_id IS NOT NULL)
    ) THEN RAISE(ABORT, 'Invoice source document and line must be supplied together.') END;

    SELECT CASE WHEN NEW.source_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sales s JOIN sales_delivery_challan_items i
        ON i.business_id = s.business_id AND i.document_id = s.source_id
      WHERE s.id = NEW.sale_id AND s.source_type = 'DELIVERY_CHALLAN'
        AND i.document_id = NEW.source_document_id
        AND i.id = NEW.source_item_id AND i.product_id = NEW.product_id
    ) THEN RAISE(ABORT, 'Invoice line does not match its source delivery line.') END;
  `;

  for (const operation of ["INSERT", "UPDATE"] as const) {
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS sales_invoice_workflow_${operation.toLowerCase()}
      BEFORE ${operation} ON sales WHEN NEW.snapshot_status = 'SAVED'
      BEGIN
        ${invoiceValidation}
      END;

      CREATE TRIGGER IF NOT EXISTS sales_invoice_line_${operation.toLowerCase()}
      BEFORE ${operation} ON sale_items WHEN NEW.snapshot_status = 'SAVED'
      BEGIN
        ${itemValidation}
      END;
    `);
  }

  // Each source/target pairing must exist and agree with the target header.
  const conversionChecks = [
    {
      source: "sales_quotations",
      target: "sales_orders",
      from: "QUOTATION",
      to: "SALES_ORDER",
      date: "document_date",
    },
    {
      source: "sales_orders",
      target: "sales_delivery_challans",
      from: "SALES_ORDER",
      to: "DELIVERY_CHALLAN",
      date: "document_date",
    },
    {
      source: "sales_delivery_challans",
      target: "sales",
      from: "DELIVERY_CHALLAN",
      to: "SALES_INVOICE",
      date: "sale_date",
    },
    {
      source: "sales",
      target: "sales_returns",
      from: "SALES_INVOICE",
      to: "SALES_RETURN",
      date: "document_date",
    },
  ];

  const existingPair = conversionChecks
    .map(
      (pair) => `
    SELECT 1 FROM ${pair.source} s JOIN ${pair.target} t
      ON t.business_id = s.business_id
    WHERE NEW.source_type = '${pair.from}' AND NEW.target_type = '${pair.to}'
      AND s.business_id = NEW.business_id
      AND s.id = NEW.source_id AND t.id = NEW.target_id
      AND t.source_type = NEW.source_type AND t.source_id = NEW.source_id
      AND t.customer_id IS s.customer_id
      AND t.${pair.date} >= s.${pair.source === "sales" ? "sale_date" : "document_date"}
  `,
    )
    .join(" UNION ALL ");

  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS sales_document_link_insert
    BEFORE INSERT ON sales_document_links
    BEGIN
      SELECT CASE WHEN NOT EXISTS (${existingPair})
        THEN RAISE(ABORT, 'Sales conversion link does not match its saved documents.') END;
    END;

    CREATE TRIGGER IF NOT EXISTS sales_document_link_immutable
    BEFORE UPDATE ON sales_document_links
    BEGIN
      SELECT RAISE(ABORT, 'Sales conversion links cannot be rewritten.');
    END;
  `);
}

async function seedSalesDocumentSequences(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const definitions = [
    {
      documentType: "SALES_INVOICE",
      table: "sales",
      numberColumn: "invoice_number",
      prefix: "INV",
    },
    ...SALES_SCHEMA_TABLES.map((entry) => ({
      documentType: entry.documentType,
      table: entry.table,
      numberColumn: "document_number",
      prefix: entry.prefix,
    })),
  ];

  for (const entry of definitions) {
    const rows = await db.getAllAsync<{
      business_id: string;
      saved_number: string;
    }>(`
      SELECT d.business_id, d.${entry.numberColumn} AS saved_number
      FROM ${entry.table} d JOIN businesses b ON b.id = d.business_id
      WHERE length(trim(COALESCE(d.${entry.numberColumn}, ''))) > 0
    `);

    const maximumByBusiness = new Map<string, number>();
    const expression = new RegExp(`^${entry.prefix}-(\\d+)$`, "i");

    for (const row of rows) {
      const match = expression.exec(row.saved_number.trim());
      if (!match) continue;
      const serial = Number(match[1]);
      // A custom/unparseable/unsafe legacy number is preserved, not renumbered.
      if (!Number.isSafeInteger(serial) || serial < 0) continue;
      maximumByBusiness.set(
        row.business_id,
        Math.max(maximumByBusiness.get(row.business_id) ?? 1000, serial),
      );
    }

    for (const [businessId, lastNumber] of maximumByBusiness) {
      await db.runAsync(
        `INSERT INTO sales_document_sequences
          (business_id, document_type, last_number, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (business_id, document_type) DO UPDATE SET
           last_number = MAX(sales_document_sequences.last_number, excluded.last_number),
           updated_at = excluded.updated_at`,
        businessId,
        entry.documentType,
        lastNumber,
        new Date().toISOString(),
      );
    }
  }
  // The repository must still allocate inside withSalesTransaction and check
  // live numbers. A legacy POS writer may add invoices after this migration.
}
