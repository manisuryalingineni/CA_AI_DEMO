import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'ca_ai_retail.db';

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

    initialization = initializeDatabase().then(db => {

      database = db;

      return db;

    }).catch(error => {

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

    if (Platform.OS === 'web') {

      let value!: T;

      await db.withTransactionAsync(async () => { value = await task(db); });

      return value;

    }

    const connection = await SQLite.openDatabaseAsync(DATABASE_NAME, {

      useNewConnection: true,

    });

    let started = false;

    try {

      await connection.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

      await connection.execAsync('BEGIN IMMEDIATE;');

      started = true;

      const value = await task(connection);

      await connection.execAsync('COMMIT;');

      started = false;

      return value;

    } catch (error) {

      if (started) await connection.execAsync('ROLLBACK;').catch(() => undefined);

      throw error;

    } finally {

      // A close failure must not turn a successful commit into a failed save.

      await connection.closeAsync().catch(error => console.warn('Closing purchase connection', error));

    }

  });

  writeQueue = result.then(() => undefined, () => undefined);

  return result;

}

/* =========================================================

   MIGRATION HELPERS

========================================================= */

async function hasColumn(

  db: SQLite.SQLiteDatabase,

  tableName: string,

  columnName: string,

): Promise<boolean> {

  const rows =

    await db.getAllAsync<TableInfoRow>(

      `PRAGMA table_info(${tableName});`,

    );

  return rows.some(

    row => row.name === columnName,

  );

}

async function addColumnIfMissing(

  db: SQLite.SQLiteDatabase,

  tableName: string,

  columnName: string,

  definition: string,

): Promise<boolean> {

  const exists =

    await hasColumn(

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

    await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

    await database.execAsync('BEGIN IMMEDIATE;');

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

  `);

  /* =======================================================

     MIGRATIONS FOR EXISTING INSTALLS

  ======================================================= */

  /*

   * PRODUCT CURRENT STOCK

   */

  const stockQuantityAdded =

    await addColumnIfMissing(

      database,

      'products',

      'stock_quantity',

      'REAL NOT NULL DEFAULT 0',

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

    'purchases',

    'purchase_number',

    "TEXT NOT NULL DEFAULT ''",

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'due_date',

    'TEXT',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'supply_type',

    "TEXT NOT NULL DEFAULT 'WITHIN_STATE'",

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'counter_branch',

    'TEXT',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'salesperson',

    'TEXT',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'delivery_method',

    'TEXT',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'cgst_amount',

    'REAL NOT NULL DEFAULT 0',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'sgst_amount',

    'REAL NOT NULL DEFAULT 0',

  );

  await addColumnIfMissing(

    database,

    'purchases',

    'igst_amount',

    'REAL NOT NULL DEFAULT 0',

  );

  /*

   * PURCHASE ITEM SNAPSHOTS

   */

  await addColumnIfMissing(

    database,

    'purchase_items',

    'product_name',

    "TEXT NOT NULL DEFAULT ''",

  );

  await addColumnIfMissing(

    database,

    'purchase_items',

    'hsn',

    'TEXT',

  );

  await addColumnIfMissing(

    database,

    'purchase_items',

    'unit',

    'TEXT',

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

  'purchase_rfqs',

  'rfq_number',

  "TEXT NOT NULL DEFAULT ''",

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'vendor_id',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'rfq_date',

  "TEXT NOT NULL DEFAULT ''",

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'valid_until',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'supply_type',

  "TEXT NOT NULL DEFAULT 'WITHIN_STATE'",

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'counter_branch',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'salesperson',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'delivery_method',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'subtotal',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'gst_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'cgst_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'sgst_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'igst_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'discount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'total_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfqs',

  'notes',

  'TEXT',

);

/*

 * PURCHASE RFQ ITEM FIELDS

 *

 * Protect existing installations in case an older

 * purchase_rfq_items table is missing newer columns.

 */

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'product_id',

  "TEXT NOT NULL DEFAULT ''",

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'product_name',

  "TEXT NOT NULL DEFAULT ''",

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'hsn',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'unit',

  'TEXT',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'quantity',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'unit_price',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'gst_rate',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'gst_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'discount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'total_amount',

  'REAL NOT NULL DEFAULT 0',

);

await addColumnIfMissing(

  database,

  'purchase_rfq_items',

  'created_at',

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

  for (const table of ['purchases', 'purchase_rfqs']) {

    for (const column of ['source_type', 'source_id', 'vendor_snapshot', 'business_snapshot']) {

      await addColumnIfMissing(database, table, column, 'TEXT');

    }

  }

  await addColumnIfMissing(database, 'purchases', 'return_amount', 'REAL NOT NULL DEFAULT 0');

  await addColumnIfMissing(database, 'purchases', 'refunded_amount', 'REAL NOT NULL DEFAULT 0');

  await addColumnIfMissing(database, 'purchases', 'vendor_credit', 'REAL NOT NULL DEFAULT 0');

  await addColumnIfMissing(database, 'purchases', 'match_status', "TEXT NOT NULL DEFAULT 'NOT_CHECKED'");

  for (const table of ['purchase_items', 'purchase_rfq_items']) {

    await addColumnIfMissing(database, table, 'position', 'INTEGER NOT NULL DEFAULT 0');

    await addColumnIfMissing(database, table, 'source_item_id', 'TEXT');

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

  /* =======================================================

     RETAIL POC SEED DATA

  ======================================================= */

  const now =

    new Date().toISOString();

  /* =======================================================

     FIND / CREATE BUSINESS

  ======================================================= */

  let businessId: string;

  const existingBusiness =

    await database.getFirstAsync<{

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

    businessId =

      existingBusiness.id;

  } else {

    businessId =

      'business_retail_poc';

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

      [

        businessId,

        'Retail Shop',

        '',

        'RETAIL',

        now,

        now,

      ],

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

      'customer_walk_in',

      businessId,

      'Walk-in Customer',

      '',

      '',

      'Andhra Pradesh',

      '',

      0,

      0,

      'Retail counter customer',

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

      'vendor_sri_lakshmi',

      businessId,

      'Sri Lakshmi Distributors',

      '9876543210',

      '',

      'Andhra Pradesh',

      '',

      15,

      0,

      'Retail stock supplier',

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

      'product_premium_rice_5kg',

      businessId,

      'Premium Rice 5kg',

      '100630',

      'Bag',

      650,

      570,

      5,

      24,

      24,

      '',

      '',

      'A1',

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

      'product_groundnut_oil_1l',

      businessId,

      'Groundnut Oil 1L',

      '151550',

      'Bottle',

      190,

      168,

      5,

      36,

      36,

      '',

      '',

      'A2',

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

      'product_bath_soap',

      businessId,

      'Bath Soap',

      '340111',

      'Piece',

      42,

      34,

      18,

      60,

      60,

      '',

      '',

      'A3',

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

      'vendor_product_rice',

      'vendor_sri_lakshmi',

      'product_premium_rice_5kg',

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

      'vendor_product_oil',

      'vendor_sri_lakshmi',

      'product_groundnut_oil_1l',

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

      'vendor_product_soap',

      'vendor_sri_lakshmi',

      'product_bath_soap',

      34,

      60,

      now,

      now,

    ],

  );

    await database.execAsync('COMMIT;');

    return database;

  } catch (error) {

    await database.execAsync('ROLLBACK;').catch(() => undefined);

    await database.closeAsync().catch(() => undefined);

    throw error;

  }

}
