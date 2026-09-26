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
  `);

  return database;
}