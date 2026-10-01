import { getBusiness } from '../repositories/businessRepository';

import {
  getProductStockForBusiness,
  increaseProductStock,
  decreaseProductStock,
  createInventoryMovement,
  getInventoryMovements,
} from '../repositories/inventoryRepository';

import type {
  InventoryMovementRow,
  ProductStockRow,
} from '../repositories/inventoryRepository';

/* =====================================================
   ID GENERATOR
===================================================== */

function generateInventoryMovementId(): string {
  return `inventory_movement_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* =====================================================
   LOAD PRODUCT STOCK
===================================================== */

export async function loadProductStock(
  productId: string,
): Promise<ProductStockRow | null> {
  if (!productId) {
    return null;
  }

  const business = await getBusiness();

  if (!business) {
    return null;
  }

  return getProductStockForBusiness(
    productId,
    business.id,
  );
}

/* =====================================================
   INCREASE STOCK
===================================================== */

export async function addInventoryStock(
  productId: string,
  quantity: number,
  referenceType?: string,
  referenceId?: string,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  if (!productId) {
    throw new Error('Product is required.');
  }

  if (quantity <= 0) {
    throw new Error(
      'Stock quantity must be greater than zero.',
    );
  }

  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }

  const product =
    await getProductStockForBusiness(
      productId,
      business.id,
    );

  if (!product) {
    throw new Error(
      'Product was not found for this business.',
    );
  }

  const result =
    await increaseProductStock(
      productId,
      quantity,
    );

  const movement: InventoryMovementRow = {
    id: generateInventoryMovementId(),

    business_id: business.id,

    product_id: productId,

    movement_type: 'IN',

    reference_type:
      referenceType ?? null,

    reference_id:
      referenceId ?? null,

    quantity,

    stock_before:
      result.stockBefore,

    stock_after:
      result.stockAfter,

    created_at:
      new Date().toISOString(),
  };

  await createInventoryMovement(
    movement,
  );

  return result;
}

/* =====================================================
   DECREASE STOCK
===================================================== */

export async function removeInventoryStock(
  productId: string,
  quantity: number,
  referenceType?: string,
  referenceId?: string,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  if (!productId) {
    throw new Error('Product is required.');
  }

  if (quantity <= 0) {
    throw new Error(
      'Stock quantity must be greater than zero.',
    );
  }

  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }

  const product =
    await getProductStockForBusiness(
      productId,
      business.id,
    );

  if (!product) {
    throw new Error(
      'Product was not found for this business.',
    );
  }

  const result =
    await decreaseProductStock(
      productId,
      quantity,
    );

  const movement: InventoryMovementRow = {
    id: generateInventoryMovementId(),

    business_id: business.id,

    product_id: productId,

    movement_type: 'OUT',

    reference_type:
      referenceType ?? null,

    reference_id:
      referenceId ?? null,

    quantity,

    stock_before:
      result.stockBefore,

    stock_after:
      result.stockAfter,

    created_at:
      new Date().toISOString(),
  };

  await createInventoryMovement(
    movement,
  );

  return result;
}

/* =====================================================
   RECORD PURCHASE STOCK
===================================================== */

export async function addPurchaseStock(
  productId: string,
  quantity: number,
  purchaseId: string,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  if (!purchaseId) {
    throw new Error(
      'Purchase ID is required.',
    );
  }

  return addInventoryStock(
    productId,
    quantity,
    'PURCHASE',
    purchaseId,
  );
}

/* =====================================================
   RECORD SALES STOCK
===================================================== */

export async function removeSalesStock(
  productId: string,
  quantity: number,
  saleId: string,
): Promise<{
  stockBefore: number;
  stockAfter: number;
}> {
  if (!saleId) {
    throw new Error(
      'Sale ID is required.',
    );
  }

  return removeInventoryStock(
    productId,
    quantity,
    'SALE',
    saleId,
  );
}

/* =====================================================
   LOAD INVENTORY HISTORY
===================================================== */

export async function loadInventoryMovements(
  productId?: string,
): Promise<InventoryMovementRow[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return getInventoryMovements(
    business.id,
    productId,
  );
}