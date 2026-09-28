
import { getBusiness } from '../repositories/businessRepository';
import {
  createProduct as insertProduct,
  getProducts as findProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../repositories/productRepository';

import type { Product } from '../types/product';

export interface CreateProductInput {
  name: string;
  hsn?: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  gstRate: number;
  openingStock: number;
  barcode?: string;
  brand?: string;
  rack?: string;
}

function generateProductId(): string {
  return `product_${Date.now()}`;
}

/**
 * Validate product input
 */
function validateProductInput(
  input: CreateProductInput,
): void {
  if (!input.name.trim()) {
    throw new Error('Product name is required.');
  }

  if (!input.unit.trim()) {
    throw new Error('Unit is required.');
  }

  if (input.salePrice < 0) {
    throw new Error(
      'Sale price cannot be negative.',
    );
  }

  if (input.purchasePrice < 0) {
    throw new Error(
      'Purchase price cannot be negative.',
    );
  }

  if (input.gstRate < 0) {
    throw new Error(
      'GST rate cannot be negative.',
    );
  }

  if (input.openingStock < 0) {
    throw new Error(
      'Opening stock cannot be negative.',
    );
  }
}

/**
 * Normalize product input
 */
function normalizeProductInput(
  input: CreateProductInput,
): CreateProductInput {
  return {
    name: input.name.trim(),
    hsn: input.hsn?.trim() || undefined,
    unit: input.unit.trim(),
    salePrice: input.salePrice,
    purchasePrice: input.purchasePrice,
    gstRate: input.gstRate,
    openingStock: input.openingStock,
    barcode:
      input.barcode?.trim() || undefined,
    brand:
      input.brand?.trim() || undefined,
    rack:
      input.rack?.trim() || undefined,
  };
}

/**
 * Create a new product
 */
export async function saveProduct(
  input: CreateProductInput,
): Promise<Product> {
  const normalizedInput =
    normalizeProductInput(input);

  validateProductInput(normalizedInput);

  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  const now = new Date().toISOString();

  const product: Product = {
    id: generateProductId(),
    businessId: business.id,
    name: normalizedInput.name,
    hsn: normalizedInput.hsn,
    unit: normalizedInput.unit,
    salePrice: normalizedInput.salePrice,
    purchasePrice:
      normalizedInput.purchasePrice,
    gstRate: normalizedInput.gstRate,
    openingStock:
      normalizedInput.openingStock,
    barcode: normalizedInput.barcode,
    brand: normalizedInput.brand,
    rack: normalizedInput.rack,
    createdAt: now,
    updatedAt: now,
  };

  await insertProduct(product);

  return product;
}

/**
 * Load all products for the current business
 */
export async function loadProducts(): Promise<Product[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return findProducts(business.id);
}

/**
 * Load a single product
 */
export async function loadProduct(
  productId: string,
): Promise<Product | null> {
  const business = await getBusiness();

  if (!business) {
    return null;
  }

  const product =
    await getProductById(productId);

  if (!product) {
    return null;
  }

  // Make sure the product belongs
  // to the current business.
  if (product.businessId !== business.id) {
    return null;
  }

  return product;
}

/**
 * Edit an existing product
 */
export async function editProduct(
  product: Product,
): Promise<Product> {
  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  if (product.businessId !== business.id) {
    throw new Error(
      'You cannot edit a product from another business.',
    );
  }

  const input: CreateProductInput = {
    name: product.name,
    hsn: product.hsn,
    unit: product.unit,
    salePrice: product.salePrice,
    purchasePrice: product.purchasePrice,
    gstRate: product.gstRate,
    openingStock: product.openingStock,
    barcode: product.barcode,
    brand: product.brand,
    rack: product.rack,
  };

  const normalizedInput =
    normalizeProductInput(input);

  validateProductInput(normalizedInput);

  const updatedProduct: Product = {
    ...product,

    name: normalizedInput.name,
    hsn: normalizedInput.hsn,
    unit: normalizedInput.unit,
    salePrice: normalizedInput.salePrice,
    purchasePrice:
      normalizedInput.purchasePrice,
    gstRate: normalizedInput.gstRate,
    openingStock:
      normalizedInput.openingStock,
    barcode: normalizedInput.barcode,
    brand: normalizedInput.brand,
    rack: normalizedInput.rack,

    updatedAt: new Date().toISOString(),
  };

  await updateProduct(updatedProduct);

  return updatedProduct;
}

/**
 * Delete an existing product
 */
export async function removeProduct(
  productId: string,
): Promise<void> {
  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  const product =
    await getProductById(productId);

  if (!product) {
    throw new Error(
      'Product not found.',
    );
  }

  if (product.businessId !== business.id) {
    throw new Error(
      'You cannot delete a product from another business.',
    );
  }

  await deleteProduct(
    productId,
    business.id,
  );
}
