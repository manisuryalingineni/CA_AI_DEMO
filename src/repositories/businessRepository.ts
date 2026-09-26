import { getDatabase } from '../database/database';
import type { Business } from '../types/business';

function mapRowToBusiness(row: any): Business {
  return {
    id: row.id,
    name: row.name,
    businessType: row.business_type,
    gstin: row.gstin ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBusiness(
  business: Business,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO businesses (
        id,
        name,
        gstin,
        business_type,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    business.id,
    business.name,
    business.gstin ?? null,
    business.businessType,
    business.createdAt,
    business.updatedAt,
  );
}

export async function getBusiness(): Promise<Business | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync(
    `
      SELECT
        id,
        name,
        gstin,
        business_type,
        created_at,
        updated_at
      FROM businesses
      ORDER BY created_at ASC
      LIMIT 1;
    `,
  );

  if (!row) {
    return null;
  }

  return mapRowToBusiness(row);
}