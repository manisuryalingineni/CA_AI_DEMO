import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'ca_ai_retail.db';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
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
  `);

  return database;
}
