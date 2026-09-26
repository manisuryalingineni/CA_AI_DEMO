import type { Business } from '../types/business';
import {
  createBusiness,
  getBusiness,
} from '../repositories/businessRepository';

interface CreateBusinessInput {
  name: string;
  gstin?: string;
}

function generateBusinessId(): string {
  return `business_${Date.now()}`;
}

export async function saveBusiness(
  input: CreateBusinessInput,
): Promise<Business> {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Business name is required.');
  }

  const existingBusiness = await getBusiness();

  const now = new Date().toISOString();

  if (existingBusiness) {
    return existingBusiness;
  }

  const business: Business = {
    id: generateBusinessId(),
    name,
    businessType: 'RETAIL',
    gstin: input.gstin?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await createBusiness(business);

  return business;
}

export async function loadBusiness(): Promise<Business | null> {
  return getBusiness();
}