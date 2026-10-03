import * as SQLite from "expo-sqlite";

const DATABASE_NAME =
  "ca_ai_retail.db";

let database:
  SQLite.SQLiteDatabase | null =
  null;

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
    row =>
      row.name ===
      columnName,
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

export async function getDatabase():
  Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database =
    await SQLite.openDatabaseAsync(
      DATABASE_NAME,
    );

  /* =======================================================
     CREATE TABLES
  ======================================================= */

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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
      ON customers (
        business_id
      );

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
      ON products (
        business_id
      );

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
      ON vendors (
        business_id
      );

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
      ON vendor_products (
        vendor_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_vendor_products_product_id
      ON vendor_products (
        product_id
      );

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
      ON purchases (
        business_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_purchases_vendor_id
      ON purchases (
        vendor_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_purchases_date
      ON purchases (
        purchase_date
      );

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
      ON purchase_items (
        purchase_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_purchase_items_product_id
      ON purchase_items (
        product_id
      );

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
      ON inventory_movements (
        business_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_inventory_movements_product_id
      ON inventory_movements (
        product_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_inventory_movements_reference_id
      ON inventory_movements (
        reference_id
      );

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
      ON sales (
        business_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_sales_customer_id
      ON sales (
        customer_id
      );

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
      ON sale_items (
        sale_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_sale_items_product_id
      ON sale_items (
        product_id
      );

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
      ON payments (
        business_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_payments_document
      ON payments (
        document_type,
        document_id
      );

    CREATE INDEX IF NOT EXISTS
      idx_payments_created_at
      ON payments (
        created_at
      );
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

  if (
    stockQuantityAdded
  ) {
    await database.execAsync(`
      UPDATE products

      SET
        stock_quantity =
          opening_stock;
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

  /* =======================================================
     RETAIL POC SEED DATA
  ======================================================= */

  const now =
    new Date().toISOString();

  /* =======================================================
     FIND / CREATE BUSINESS
  ======================================================= */

  let businessId:
    string;

  const existingBusiness =
    await database.getFirstAsync<{
      id: string;
    }>(
      `
        SELECT id

        FROM businesses

        ORDER BY
          created_at ASC

        LIMIT 1
      `,
    );

  if (
    existingBusiness
  ) {
    businessId =
      existingBusiness.id;
  } else {
    businessId =
      "business_retail_poc";

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

        VALUES (
          ?, ?, ?, ?, ?, ?
        )
      `,
      [
        businessId,

        "Retail Shop",

        "",

        "RETAIL",

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

      VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
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

      VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
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

  /*
   * Keep older seeded vendor attached to
   * the active business.
   */

  await database.runAsync(
    `
      UPDATE vendors

      SET
        business_id = ?,

        updated_at = ?

      WHERE
        id =
        'vendor_sri_lakshmi'
    `,
    [
      businessId,

      now,
    ],
  );

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

  /*
   * Make sure older seeded products belong
   * to the active business.
   */

  await database.runAsync(
    `
      UPDATE products

      SET
        business_id = ?,

        updated_at = ?

      WHERE id IN (
        'product_premium_rice_5kg',

        'product_groundnut_oil_1l',

        'product_bath_soap'
      )
    `,
    [
      businessId,

      now,
    ],
  );

  /* =======================================================
     VENDOR -> PRODUCT RELATIONSHIP 1
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

      VALUES (
        ?, ?, ?, ?, ?, ?, ?
      )
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
     VENDOR -> PRODUCT RELATIONSHIP 2
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

      VALUES (
        ?, ?, ?, ?, ?, ?, ?
      )
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
     VENDOR -> PRODUCT RELATIONSHIP 3
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

      VALUES (
        ?, ?, ?, ?, ?, ?, ?
      )
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

  return database;
}