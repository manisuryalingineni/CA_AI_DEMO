import { getBusiness } from '../repositories/businessRepository';
import {
  createProduct as insertProduct,
  getProducts as findProducts,
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

export async function saveProduct(
  input: CreateProductInput,
): Promise<Product> {
  const name = input.name.trim();
  const unit = input.unit.trim();
  const hsn = input.hsn?.trim() || undefined;
  const barcode = input.barcode?.trim() || undefined;
  const brand = input.brand?.trim() || undefined;
  const rack = input.rack?.trim() || undefined;

  if (!name) {
    throw new Error('Product name is required.');
  }

  if (!unit) {
    throw new Error('Unit is required.');
  }

  if (input.salePrice < 0) {
    throw new Error('Sale price cannot be negative.');
  }

  if (input.purchasePrice < 0) {
    throw new Error('Purchase price cannot be negative.');
  }

  if (input.gstRate < 0) {
    throw new Error('GST rate cannot be negative.');
  }

  if (input.openingStock < 0) {
    throw new Error('Opening stock cannot be negative.');
  }

  const business = await getBusiness();

  if (!business) {
    throw new Error('Please complete business setup first.');
  }

  const now = new Date().toISOString();

  const product: Product = {
    id: generateProductId(),
    businessId: business.id,
    name,
    hsn,
    unit,
    salePrice: input.salePrice,
    purchasePrice: input.purchasePrice,
    gstRate: input.gstRate,
    openingStock: input.openingStock,
    barcode,
    brand,
    rack,
    createdAt: now,
    updatedAt: now,
  };

  await insertProduct(product);

  return product;
}

export async function loadProducts(): Promise<Product[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return findProducts(business.id);
}