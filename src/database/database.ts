import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'ca_ai_retail.db';

let database: SQLite.SQLiteDatabase | null = null;

type TableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
};

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
  const exists = await hasColumn(
    db,
    tableName,
    columnName,
  );

  if (exists) {
    return false;
  }

  await db.execAsync(
    `ALTER TABLE ${tableName}
     ADD COLUMN ${columnName} ${definition};`,
  );

  return true;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database =
    await SQLite.openDatabaseAsync(
      DATABASE_NAME,
    );

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    /* =========================================
       BUSINESSES
    ========================================= */

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      gstin TEXT,
      business_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );


    /* =========================================
       CUSTOMERS
    ========================================= */

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


    /* =========================================
       PRODUCTS
    ========================================= */

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hsn TEXT,
      unit TEXT NOT NULL,
      sale_price REAL NOT NULL,
      purchase_price REAL NOT NULL,
      gst_rate REAL NOT NULL,

      /* Initial stock entered during setup */
      opening_stock REAL NOT NULL DEFAULT 0,

      /* Running stock after purchases / sales */
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


    /* =========================================
       VENDORS
    ========================================= */

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


    /* =========================================
       SALES
    ========================================= */

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
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
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


    /* =========================================
       SALE ITEMS
    ========================================= */

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY NOT NULL,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL NOT NULL,
      gst_amount REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS
      idx_sale_items_sale_id
      ON sale_items (sale_id);

    CREATE INDEX IF NOT EXISTS
      idx_sale_items_product_id
      ON sale_items (product_id);


    /* =========================================
       PURCHASES
    ========================================= */

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY NOT NULL,

      business_id TEXT NOT NULL,

      /* Our internal purchase bill number */
      purchase_number TEXT NOT NULL,

      vendor_id TEXT,

      /* Vendor invoice/reference number */
      invoice_number TEXT,

      purchase_date TEXT NOT NULL,

      due_date TEXT,

      /* WITHIN_STATE / OTHER_STATE */
      supply_type TEXT NOT NULL
        DEFAULT 'WITHIN_STATE',

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

      payment_status TEXT NOT NULL,

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


    /* =========================================
       PURCHASE ITEMS
    ========================================= */

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY NOT NULL,

      purchase_id TEXT NOT NULL,

      product_id TEXT NOT NULL,

      /*
       * Snapshot values.
       *
       * These preserve old purchase/PDF data
       * even if the product is edited later.
       */
      product_name TEXT NOT NULL,

      hsn TEXT,

      unit TEXT,

      quantity REAL NOT NULL,

      unit_price REAL NOT NULL,

      gst_rate REAL NOT NULL,

      gst_amount REAL NOT NULL DEFAULT 0,

      discount REAL NOT NULL DEFAULT 0,

      total_amount REAL NOT NULL,

      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS
      idx_purchase_items_purchase_id
      ON purchase_items (purchase_id);

    CREATE INDEX IF NOT EXISTS
      idx_purchase_items_product_id
      ON purchase_items (product_id);
  `);


  /* =========================================
     MIGRATIONS FOR EXISTING INSTALLATIONS
  ========================================= */

  /*
   * Products created with an older version
   * won't have stock_quantity.
   */

  const stockColumnAdded =
    await addColumnIfMissing(
      database,
      'products',
      'stock_quantity',
      'REAL NOT NULL DEFAULT 0',
    );

  /*
   * Only when the column is first created,
   * initialise current stock from opening stock.
   *
   * We must NOT do this every startup,
   * otherwise sold-out products would reset.
   */
  if (stockColumnAdded) {
    await database.execAsync(`
      UPDATE products
      SET stock_quantity = opening_stock;
    `);
  }


  /*
   * Purchase migrations.
   *
   * These matter if purchases existed in an
   * earlier development database.
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
   * Purchase-item snapshots.
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


  return database;
}