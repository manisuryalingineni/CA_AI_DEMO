import { getBusiness } from '../repositories/businessRepository';

import {
  saveVendorProduct,
  getVendorProduct,
  getVendorProducts,
  getProductVendors,
  updateVendorProductStock,
  reduceVendorProductStock,
  deleteVendorProduct,
  deleteVendorProducts,
} from '../repositories/vendorProductRepository';

import type {
  VendorProductRow,
  VendorProductWithDetailsRow,
} from '../repositories/vendorProductRepository';

/*        ====
   INPUT TYPES
       ==== */

export interface SaveVendorProductInput {
  vendorId: string;
  productId: string;
  purchasePrice: number;
  availableStock: number;
}

/*        ====
   ID GENERATOR
       ==== */

function generateVendorProductId(): string {
  return `vendor_product_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/*        ====
   VALIDATION
       ==== */

function validateVendorProductInput(
  input: SaveVendorProductInput,
): void {
  if (!input.vendorId.trim()) {
    throw new Error('Vendor is required.');
  }

  if (!input.productId.trim()) {
    throw new Error('Product is required.');
  }

  if (input.purchasePrice < 0) {
    throw new Error(
      'Purchase price cannot be negative.',
    );
  }

  if (input.availableStock < 0) {
    throw new Error(
      'Available stock cannot be negative.',
    );
  }
}

/*        ====
   NORMALIZE
       ==== */

function normalizeVendorProductInput(
  input: SaveVendorProductInput,
): SaveVendorProductInput {
  return {
    vendorId: input.vendorId.trim(),

    productId: input.productId.trim(),

    purchasePrice:
      Number(input.purchasePrice) || 0,

    availableStock:
      Number(input.availableStock) || 0,
  };
}

/*        ====
   SAVE VENDOR PRODUCT
       ==== */

export async function saveVendorProductDetails(
  input: SaveVendorProductInput,
): Promise<VendorProductRow> {
  const normalized =
    normalizeVendorProductInput(input);

  validateVendorProductInput(normalized);

  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }

  const existing =
    await getVendorProduct(
      normalized.vendorId,
      normalized.productId,
    );

  const now =
    new Date().toISOString();

  const vendorProduct: VendorProductRow = {
    id:
      existing?.id ??
      generateVendorProductId(),

    vendor_id:
      normalized.vendorId,

    product_id:
      normalized.productId,

    purchase_price:
      normalized.purchasePrice,

    available_stock:
      normalized.availableStock,

    created_at:
      existing?.created_at ?? now,

    updated_at:
      now,
  };

  await saveVendorProduct(
    vendorProduct,
  );

  return vendorProduct;
}

/*        ====
   LOAD ONE VENDOR PRODUCT
       ==== */

export async function loadVendorProduct(
  vendorId: string,
  productId: string,
): Promise<VendorProductRow | null> {
  if (!vendorId || !productId) {
    return null;
  }

  return getVendorProduct(
    vendorId,
    productId,
  );
}

/*        ====
   LOAD PRODUCTS FOR VENDOR
       ==== */

export async function loadVendorProducts(
  vendorId: string,
): Promise<VendorProductWithDetailsRow[]> {
  if (!vendorId) {
    return [];
  }

  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  return getVendorProducts(
    vendorId,
  );
}

/*        ====
   LOAD VENDORS FOR PRODUCT
       ==== */

export async function loadProductVendors(
  productId: string,
): Promise<VendorProductRow[]> {
  if (!productId) {
    return [];
  }

  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  return getProductVendors(
    productId,
  );
}

/*        ====
   UPDATE VENDOR STOCK
       ==== */

export async function setVendorStock(
  vendorId: string,
  productId: string,
  availableStock: number,
): Promise<void> {
  if (!vendorId) {
    throw new Error(
      'Vendor is required.',
    );
  }

  if (!productId) {
    throw new Error(
      'Product is required.',
    );
  }

  if (availableStock < 0) {
    throw new Error(
      'Available stock cannot be negative.',
    );
  }

  const existing =
    await getVendorProduct(
      vendorId,
      productId,
    );

  if (!existing) {
    throw new Error(
      'Vendor product was not found.',
    );
  }

  await updateVendorProductStock(
    vendorId,
    productId,
    availableStock,
  );
}

/*        ====
   REDUCE VENDOR STOCK
       ==== */

export async function consumeVendorStock(
  vendorId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  if (!vendorId) {
    throw new Error(
      'Vendor is required.',
    );
  }

  if (!productId) {
    throw new Error(
      'Product is required.',
    );
  }

  if (quantity <= 0) {
    throw new Error(
      'Quantity must be greater than zero.',
    );
  }

  await reduceVendorProductStock(
    vendorId,
    productId,
    quantity,
  );
}

/*        ====
   DELETE ONE VENDOR PRODUCT
       ==== */

export async function removeVendorProduct(
  vendorId: string,
  productId: string,
): Promise<void> {
  if (!vendorId || !productId) {
    throw new Error(
      'Vendor and product are required.',
    );
  }

  await deleteVendorProduct(
    vendorId,
    productId,
  );
}

/*        ====
   DELETE ALL PRODUCTS FOR VENDOR
       ==== */

export async function removeVendorProducts(
  vendorId: string,
): Promise<void> {
  if (!vendorId) {
    throw new Error(
      'Vendor is required.',
    );
  }

  await deleteVendorProducts(
    vendorId,
  );
}