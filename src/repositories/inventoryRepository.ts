import { getDatabase } from '../database/database';

export type InventoryMovementRow = {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: string;
  reference_type: string | null;
  reference_id: string | null;
  quantity: number;
  stock_before: number;
  stock_after: number;
  created_at: string;
};

export type ProductStockRow = {
  id: string;
  business_id: string;
  name: string;
  unit: string;
  opening_stock: number;
};

/* =====================================================
   GET CURRENT PRODUCT STOCK
===================================================== */

export async function getProductStock(
  productId: string,
): Promise<ProductStockRow | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<ProductStockRow>(
      `SELECT
        id,
        business_id,
        name,
        unit,
        opening_stock
       FROM products
       WHERE id = ?
       LIMIT 1`,
      productId,
    );

  return row ?? null;
}

/* =====================================================
   GET PRODUCT STOCK FOR BUSINESS
===================================================== */

export async function getProductStockForBusiness(
  productId: string,
  businessId: string,
): Promise<ProductStockRow | null> {
  const db = await getDatabase();

  const row =
    await db.getFirstAsync<ProductStockRow>(
      `SELECT
        id,
        business_id,
        name,
        unit,
        opening_stock
       FROM products
       WHERE id = ?
         AND business_id = ?
       LIMIT 1`,
      productId,
      businessId,
    );

  return row ?? null;
}

/* =====================================================
   UPDATE PRODUCT STOCK
===================================================== */

export async function updateProductStock(
  productId: string,
  stock: number,
): Promise<void> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE products
     SET
       opening_stock = ?,
       updated_at = ?
     WHERE id = ?`,
    stock,
    new Date().toISOString(),
    productId,
  );

  if (result.changes === 0) {
    throw new Error(
      'Product was not found.',
    );
  }
}

/* =====================================================
   INCREASE PRODUCT STOCK
===================================================== */

export async function increaseProductStock(
  productId: string,
  quantity: number,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  const db = await getDatabase();

  const product =
    await getProductStock(productId);

  if (!product) {
    throw new Error(
      'Product was not found.',
    );
  }

  const stockBefore =
    Number(product.opening_stock) || 0;

  const stockAfter =
    stockBefore + quantity;

  await db.runAsync(
    `UPDATE products
     SET
       opening_stock = ?,
       updated_at = ?
     WHERE id = ?`,
    stockAfter,
    new Date().toISOString(),
    productId,
  );

  return {
    stockBefore,
    stockAfter,
  };
}

/* =====================================================
   DECREASE PRODUCT STOCK
===================================================== */

export async function decreaseProductStock(
  productId: string,
  quantity: number,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  const db = await getDatabase();

  const product =
    await getProductStock(productId);

  if (!product) {
    throw new Error(
      'Product was not found.',
    );
  }

  const stockBefore =
    Number(product.opening_stock) || 0;

  if (quantity > stockBefore) {
    throw new Error(
      'Insufficient business stock.',
    );
  }

  const stockAfter =
    stockBefore - quantity;

  await db.runAsync(
    `UPDATE products
     SET
       opening_stock = ?,
       updated_at = ?
     WHERE id = ?`,
    stockAfter,
    new Date().toISOString(),
    productId,
  );

  return {
    stockBefore,
    stockAfter,
  };
}

/* =====================================================
   CREATE INVENTORY MOVEMENT
===================================================== */

export async function createInventoryMovement(
  movement: InventoryMovementRow,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO inventory_movements (
      id,
      business_id,
      product_id,
      movement_type,
      reference_type,
      reference_id,
      quantity,
      stock_before,
      stock_after,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    movement.id,
    movement.business_id,
    movement.product_id,
    movement.movement_type,
    movement.reference_type,
    movement.reference_id,
    movement.quantity,
    movement.stock_before,
    movement.stock_after,
    movement.created_at,
  );
}

/* =====================================================
   GET INVENTORY MOVEMENTS
===================================================== */

export async function getInventoryMovements(
  businessId: string,
  productId?: string,
): Promise<InventoryMovementRow[]> {
  const db = await getDatabase();

  if (productId) {
    return db.getAllAsync<InventoryMovementRow>(
      `SELECT
        id,
        business_id,
        product_id,
        movement_type,
        reference_type,
        reference_id,
        quantity,
        stock_before,
        stock_after,
        created_at
       FROM inventory_movements
       WHERE business_id = ?
         AND product_id = ?
       ORDER BY created_at DESC`,
      businessId,
      productId,
    );
  }

  return db.getAllAsync<InventoryMovementRow>(
    `SELECT
      id,
      business_id,
      product_id,
      movement_type,
      reference_type,
      reference_id,
      quantity,
      stock_before,
      stock_after,
      created_at
     FROM inventory_movements
     WHERE business_id = ?
     ORDER BY created_at DESC`,
    businessId,
  );
}

/* =====================================================
   DELETE INVENTORY MOVEMENTS BY REFERENCE
===================================================== */

export async function deleteInventoryMovementsByReference(
  referenceType: string,
  referenceId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `DELETE FROM inventory_movements
     WHERE reference_type = ?
       AND reference_id = ?`,
    referenceType,
    referenceId,
  );
}