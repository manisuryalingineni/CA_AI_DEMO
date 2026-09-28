import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'ca_ai_retail.db';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      gstin TEXT,
      business_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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

    CREATE INDEX IF NOT EXISTS idx_customers_business_id
      ON customers (business_id);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hsn TEXT,
      unit TEXT NOT NULL,
      sale_price REAL NOT NULL,
      purchase_price REAL NOT NULL,
      gst_rate REAL NOT NULL,
      opening_stock REAL NOT NULL DEFAULT 0,
      barcode TEXT,
      brand TEXT,
      rack TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_business_id
      ON products (business_id);


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

CREATE INDEX IF NOT EXISTS idx_vendors_business_id
  ON vendors (business_id);
  `);

  return database;
}