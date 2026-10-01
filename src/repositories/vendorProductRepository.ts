import { getDatabase } from '../database/database';

export type VendorProductRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  purchase_price: number;
  available_stock: number;
  created_at: string;
  updated_at: string;
};

export type VendorProductWithDetailsRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  purchase_price: number;
  available_stock: number;

  product_name: string;
  hsn: string | null;
  unit: string;
  sale_price: number;
  gst_rate: number;

  created_at: string;
  updated_at: string;
};

export async function saveVendorProduct(
  vendorProduct: VendorProductRow,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO vendor_products (
      id,
      vendor_id,
      product_id,
      purchase_price,
      available_stock,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vendor_id, product_id)
    DO UPDATE SET
      purchase_price = excluded.purchase_price,
      available_stock = excluded.available_stock,
      updated_at = excluded.updated_at`,
    vendorProduct.id,
    vendorProduct.vendor_id,
    vendorProduct.product_id,
    vendorProduct.purchase_price,
    vendorProduct.available_stock,
    vendorProduct.created_at,
    vendorProduct.updated_at,
  );
}

export async function getVendorProduct(
  vendorId: string,
  productId: string,
): Promise<VendorProductRow | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<VendorProductRow>(
      `SELECT
        id,
        vendor_id,
        product_id,
        purchase_price,
        available_stock,
        created_at,
        updated_at
       FROM vendor_products
       WHERE vendor_id = ?
         AND product_id = ?
       LIMIT 1`,
      vendorId,
      productId,
    );

  return row ?? null;
}

export async function getVendorProducts(
  vendorId: string,
): Promise<VendorProductWithDetailsRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<VendorProductWithDetailsRow>(
    `SELECT
      vp.id,
      vp.vendor_id,
      vp.product_id,
      vp.purchase_price,
      vp.available_stock,

      p.name AS product_name,
      p.hsn,
      p.unit,
      p.sale_price,
      p.gst_rate,

      vp.created_at,
      vp.updated_at

     FROM vendor_products vp

     INNER JOIN products p
       ON p.id = vp.product_id

     WHERE vp.vendor_id = ?

     ORDER BY p.name ASC`,
    vendorId,
  );
}

export async function getProductVendors(
  productId: string,
): Promise<VendorProductRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<VendorProductRow>(
    `SELECT
      id,
      vendor_id,
      product_id,
      purchase_price,
      available_stock,
      created_at,
      updated_at
     FROM vendor_products
     WHERE product_id = ?
     ORDER BY available_stock DESC`,
    productId,
  );
}

export async function updateVendorProductStock(
  vendorId: string,
  productId: string,
  availableStock: number,
): Promise<void> {
  if (availableStock < 0) {
    throw new Error(
      'Vendor stock cannot be negative.',
    );
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE vendor_products
     SET
       available_stock = ?,
       updated_at = ?
     WHERE vendor_id = ?
       AND product_id = ?`,
    availableStock,
    new Date().toISOString(),
    vendorId,
    productId,
  );

  if (result.changes === 0) {
    throw new Error(
      'Vendor product was not found.',
    );
  }
}

export async function reduceVendorProductStock(
  vendorId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    throw new Error(
      'Vendor stock reduction quantity must be greater than zero.',
    );
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE vendor_products
     SET
       available_stock = available_stock - ?,
       updated_at = ?
     WHERE vendor_id = ?
       AND product_id = ?
       AND available_stock >= ?`,
    quantity,
    new Date().toISOString(),
    vendorId,
    productId,
    quantity,
  );

  if (result.changes === 0) {
    throw new Error(
      'Insufficient vendor stock or vendor product was not found.',
    );
  }
}

export async function deleteVendorProduct(
  vendorId: string,
  productId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `DELETE FROM vendor_products
     WHERE vendor_id = ?
       AND product_id = ?`,
    vendorId,
    productId,
  );
}

export async function deleteVendorProducts(
  vendorId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `DELETE FROM vendor_products
     WHERE vendor_id = ?`,
    vendorId,
  );
}