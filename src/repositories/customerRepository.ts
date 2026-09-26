import { getDatabase } from '../database/database';
import type { Customer } from '../types/customer';

type CustomerRow = {
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

function mapRowToCustomer(row: CustomerRow): Customer {
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
    businessDetail: row.business_detail ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createCustomer(customer: Customer): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO customers (
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    customer.id,
    customer.businessId,
    customer.name,
    customer.mobile,
    customer.gstin ?? null,
    customer.state,
    customer.address ?? null,
    customer.creditDays,
    customer.openingBalance,
    customer.businessDetail ?? null,
    customer.createdAt,
    customer.updatedAt,
  );
}

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<CustomerRow>(
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
      FROM customers
      WHERE business_id = ?
      ORDER BY created_at DESC;
    `,
    businessId,
  );

  return rows.map(mapRowToCustomer);
}
