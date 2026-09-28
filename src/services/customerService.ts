import { getBusiness } from '../repositories/businessRepository';

import {
  createCustomer as insertCustomer,
  getCustomerById as findCustomerById,
  getCustomers as findCustomers,
  updateCustomer as updateCustomerRecord,
  deleteCustomer as deleteCustomerRecord,
} from '../repositories/customerRepository';

import type {
  CreateCustomerInput,
  Customer,
} from '../types/customer';

/* ================================
   ID GENERATOR
================================ */

function generateCustomerId(): string {
  return `customer_${Date.now()}`;
}

/* ================================
   VALIDATION
================================ */

function validateCustomerInput(
  input: CreateCustomerInput,
): {
  name: string;
  mobile: string;
  gstin?: string;
  state: string;
  creditDays: number;
  openingBalance: number;
  businessDetail?: string;
  address?: string;
} {
  const name = input.name.trim();
  const mobile = input.mobile.trim();
  const gstin =
    input.gstin?.trim().toUpperCase() || undefined;

  const state = input.state.trim();

  const creditDays = Number(input.creditDays) || 0;

  const openingBalance =
    Number(input.openingBalance) || 0;

  const businessDetail =
    input.businessDetail?.trim() || undefined;

  const address =
    input.address?.trim() || undefined;

  if (!name) {
    throw new Error('Customer name is required.');
  }

  if (!/^\d{10}$/.test(mobile)) {
    throw new Error(
      'Enter a valid 10-digit mobile number.',
    );
  }

  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    throw new Error(
      'GSTIN must contain 15 letters/numbers.',
    );
  }

  if (creditDays < 0) {
    throw new Error(
      'Credit days cannot be negative.',
    );
  }

  if (openingBalance < 0) {
    throw new Error(
      'Opening balance cannot be negative.',
    );
  }

  if (!state) {
    throw new Error('Please select a state.');
  }

  return {
    name,
    mobile,
    gstin,
    state,
    creditDays,
    openingBalance,
    businessDetail,
    address,
  };
}

/* ================================
   CREATE CUSTOMER
================================ */

export async function saveCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const validated =
    validateCustomerInput(input);

  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  const now = new Date().toISOString();

  const customer: Customer = {
    id: generateCustomerId(),

    businessId: business.id,

    name: validated.name,

    mobile: validated.mobile,

    gstin: validated.gstin,

    state: validated.state,

    address: validated.address,

    creditDays: validated.creditDays,

    openingBalance:
      validated.openingBalance,

    businessDetail:
      validated.businessDetail,

    createdAt: now,

    updatedAt: now,
  };

  await insertCustomer(customer);

  return customer;
}

/* ================================
   LOAD CUSTOMERS
================================ */

export async function loadCustomers(): Promise<Customer[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  return findCustomers(business.id);
}

/* ================================
   LOAD ONE CUSTOMER
================================ */

export async function loadCustomer(
  customerId: string,
): Promise<Customer | null> {
  return findCustomerById(customerId);
}

/* ================================
   UPDATE CUSTOMER
================================ */

export async function editCustomer(
  customer: Customer,
): Promise<Customer> {
  const validated = validateCustomerInput({
    name: customer.name,
    mobile: customer.mobile,
    gstin: customer.gstin,
    state: customer.state,
    creditDays: customer.creditDays,
    openingBalance: customer.openingBalance,
    businessDetail: customer.businessDetail,
    address: customer.address,
  });

  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  if (customer.businessId !== business.id) {
    throw new Error(
      'Customer does not belong to the current business.',
    );
  }

  const updatedCustomer: Customer = {
    ...customer,

    name: validated.name,

    mobile: validated.mobile,

    gstin: validated.gstin,

    state: validated.state,

    address: validated.address,

    creditDays: validated.creditDays,

    openingBalance:
      validated.openingBalance,

    businessDetail:
      validated.businessDetail,

    updatedAt: new Date().toISOString(),
  };

  await updateCustomerRecord(
    updatedCustomer,
  );

  return updatedCustomer;
}

/* ================================
   DELETE CUSTOMER
================================ */

export async function removeCustomer(
  customerId: string,
): Promise<void> {
  const business = await getBusiness();

  if (!business) {
    throw new Error(
      'Please complete business setup first.',
    );
  }

  const customer =
    await findCustomerById(customerId);

  if (!customer) {
    throw new Error(
      'Customer not found.',
    );
  }

  if (customer.businessId !== business.id) {
    throw new Error(
      'Customer does not belong to the current business.',
    );
  }

  await deleteCustomerRecord(
    customerId,
    business.id,
  );
}