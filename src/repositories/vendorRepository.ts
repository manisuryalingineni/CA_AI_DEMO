import { getDatabase } from '../database/database';
import type { Vendor } from '../types/vendor';

type VendorRow = {
  id: string;
  business_id: string;
  name: string;
  mobile: string;
  gstin: string | null;
  state: string;
  address: string | null;
  credit_days: number;
  opening_balance: number;
  business_detail: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToVendor(
  row: VendorRow,
): Vendor {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    mobile: row.mobile,
    gstin: row.gstin ?? undefined,
    state: row.state,
    address: row.address ?? undefined,
    creditDays: row.credit_days,
    openingBalance: row.opening_balance,
    businessDetail:
      row.business_detail ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createVendor(
  vendor: Vendor,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO vendors (
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
    vendor.id,
    vendor.businessId,
    vendor.name,
    vendor.mobile,
    vendor.gstin ?? null,
    vendor.state,
    vendor.address ?? null,
    vendor.creditDays,
    vendor.openingBalance,
    vendor.businessDetail ?? null,
    vendor.createdAt,
    vendor.updatedAt,
  );
}

export async function getVendors(
  businessId: string,
): Promise<Vendor[]> {
  const db = await getDatabase();

  const rows =
    await db.getAllAsync<VendorRow>(
      `
        SELECT
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
        FROM vendors
        WHERE business_id = ?
        ORDER BY name COLLATE NOCASE ASC
      `,
      businessId,
    );

  return rows.map(mapRowToVendor);
}

export async function getVendorById(
  vendorId: string,
): Promise<Vendor | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<VendorRow>(
      `
        SELECT
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
        FROM vendors
        WHERE id = ?
        LIMIT 1
      `,
      vendorId,
    );

  return row
    ? mapRowToVendor(row)
    : null;
}

export async function updateVendor(
  vendor: Vendor,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE vendors
      SET
        name = ?,
        mobile = ?,
        gstin = ?,
        state = ?,
        address = ?,
        credit_days = ?,
        opening_balance = ?,
        business_detail = ?,
        updated_at = ?
      WHERE id = ?
        AND business_id = ?
    `,
    vendor.name,
    vendor.mobile,
    vendor.gstin ?? null,
    vendor.state,
    vendor.address ?? null,
    vendor.creditDays,
    vendor.openingBalance,
    vendor.businessDetail ?? null,
    vendor.updatedAt,
    vendor.id,
    vendor.businessId,
  );
}

export async function deleteVendor(
  vendorId: string,
  businessId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM vendors
      WHERE id = ?
        AND business_id = ?
    `,
    vendorId,
    businessId,
  );
}