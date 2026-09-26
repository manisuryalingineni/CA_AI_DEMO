import { getBusiness } from '../repositories/businessRepository';
import {
  createCustomer as insertCustomer,
  getCustomers as findCustomers,
} from '../repositories/customerRepository';
import type {
  CreateCustomerInput,
  Customer,
} from '../types/customer';

function generateCustomerId(): string {
  return `customer_${Date.now()}`;
}

export async function saveCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const name = input.name.trim();
  const mobile = input.mobile.trim();
  const gstin = input.gstin?.trim().toUpperCase() || undefined;

  if (!name) {
    throw new Error('Customer name is required.');
  }

  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }

  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    throw new Error('GSTIN must contain 15 letters/numbers.');
  }

  if (input.creditDays < 0) {
    throw new Error('Credit days cannot be negative.');
  }

  const business = await getBusiness();

  if (!business) {
    throw new Error('Please complete business setup first.');
  }

  const now = new Date().toISOString();

  const customer: Customer = {
    id: generateCustomerId(),
    businessId: business.id,
    name,
    mobile,
    gstin,
    state: input.state,
    address: input.address?.trim() || undefined,
    creditDays: input.creditDays,
    openingBalance: input.openingBalance,
    businessDetail: input.businessDetail?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await insertCustomer(customer);

  return customer;
}

export async function loadCustomers(): Promise<Customer[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return findCustomers(business.id);
}
