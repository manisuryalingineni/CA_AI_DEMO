import { getDatabase } from '../database/database';
import type { Product } from '../types/product';

type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  hsn: string | null;
  unit: string;
  sale_price: number;
  purchase_price: number;
  gst_rate: number;
  opening_stock: number;
  barcode: string | null;
  brand: string | null;
  rack: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    hsn: row.hsn ?? undefined,
    unit: row.unit,
    salePrice: row.sale_price,
    purchasePrice: row.purchase_price,
    gstRate: row.gst_rate,
    openingStock: row.opening_stock,
    barcode: row.barcode ?? undefined,
    brand: row.brand ?? undefined,
    rack: row.rack ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProduct(product: Product): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO products (
        id,
        business_id,
        name,
        hsn,
        unit,
        sale_price,
        purchase_price,
        gst_rate,
        opening_stock,
        barcode,
        brand,
        rack,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
        product.id,
        product.businessId,
        product.name,
        product.hsn ?? null,
        product.unit,
        product.salePrice,
        product.purchasePrice,
        product.gstRate,
        product.openingStock,
        product.barcode ?? null,
        product.brand ?? null,
        product.rack ?? null,
        product.createdAt,
        product.updatedAt,
      ],
    );
}

export async function getProducts(businessId: string): Promise<Product[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ProductRow>(
    `
      SELECT
        id,
        business_id,
        name,
        hsn,
        unit,
        sale_price,
        purchase_price,
        gst_rate,
        opening_stock,
        barcode,
        brand,
        rack,
        created_at,
        updated_at
      FROM products
      WHERE business_id = ?
      ORDER BY created_at DESC;
    `,
    businessId,
  );

  return rows.map(mapRowToProduct);
}