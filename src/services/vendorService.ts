import { getBusiness } from '../repositories/businessRepository';

import {
  createVendor as insertVendor,
  getVendors as findVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from '../repositories/vendorRepository';

import type {
  CreateVendorInput,
  Vendor,
} from '../types/vendor';


function generateVendorId(): string {
  return `vendor_${Date.now()}`;
}


function validateVendorInput(
  input: CreateVendorInput,
): void {

  if (!input.name.trim()) {
    throw new Error(
      'Vendor name is required.',
    );
  }

  if (!input.mobile.trim()) {
    throw new Error(
      'Mobile number is required.',
    );
  }

  if (
    !/^\d{10}$/.test(
      input.mobile.trim(),
    )
  ) {
    throw new Error(
      'Mobile number must contain exactly 10 digits.',
    );
  }

  if (input.creditDays < 0) {
    throw new Error(
      'Credit days cannot be negative.',
    );
  }

  if (input.openingBalance < 0) {
    throw new Error(
      'Opening balance cannot be negative.',
    );
  }
}


function normalizeVendorInput(
  input: CreateVendorInput,
): CreateVendorInput {

  return {
    name: input.name.trim(),

    mobile: input.mobile.trim(),

    gstin:
      input.gstin?.trim() ||
      undefined,

    state:
      input.state.trim(),

    address:
      input.address?.trim() ||
      undefined,

    creditDays:
      Number(input.creditDays) || 0,

    openingBalance:
      Number(input.openingBalance) || 0,

    businessDetail:
      input.businessDetail?.trim() ||
      undefined,
  };
}


/*     =====
   CREATE VENDOR
    ===== */

export async function saveVendor(
  input: CreateVendorInput,
): Promise<Vendor> {

  const normalized =
    normalizeVendorInput(input);

  validateVendorInput(normalized);

  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required before creating a vendor.',
    );
  }

  const now =
    new Date().toISOString();

  const vendor: Vendor = {
    id: generateVendorId(),

    businessId:
      business.id,

    name:
      normalized.name,

    mobile:
      normalized.mobile,

    gstin:
      normalized.gstin,

    state:
      normalized.state,

    address:
      normalized.address,

    creditDays:
      normalized.creditDays,

    openingBalance:
      normalized.openingBalance,

    businessDetail:
      normalized.businessDetail,

    createdAt:
      now,

    updatedAt:
      now,
  };

  await insertVendor(vendor);

  return vendor;
}


/*     =====
   LOAD ALL VENDORS
    ===== */

export async function loadVendors(): Promise<Vendor[]> {

  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  return findVendors(
    business.id,
  );
}


/*     =====
   LOAD SINGLE VENDOR
    ===== */

export async function loadVendor(
  vendorId: string,
): Promise<Vendor | null> {

  if (!vendorId) {
    return null;
  }

  return getVendorById(
    vendorId,
  );
}


/*     =====
   UPDATE VENDOR
    ===== */

export async function editVendor(
  vendor: Vendor,
): Promise<Vendor> {

  const input: CreateVendorInput = {
    name:
      vendor.name,

    mobile:
      vendor.mobile,

    gstin:
      vendor.gstin,

    state:
      vendor.state,

    address:
      vendor.address,

    creditDays:
      vendor.creditDays,

    openingBalance:
      vendor.openingBalance,

    businessDetail:
      vendor.businessDetail,
  };

  const normalized =
    normalizeVendorInput(input);

  validateVendorInput(normalized);

  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }

  const updatedVendor: Vendor = {
    ...vendor,

    businessId:
      business.id,

    name:
      normalized.name,

    mobile:
      normalized.mobile,

    gstin:
      normalized.gstin,

    state:
      normalized.state,

    address:
      normalized.address,

    creditDays:
      normalized.creditDays,

    openingBalance:
      normalized.openingBalance,

    businessDetail:
      normalized.businessDetail,

    updatedAt:
      new Date().toISOString(),
  };

  await updateVendor(
    updatedVendor,
  );

  return updatedVendor;
}


/*     =====
   DELETE VENDOR
    ===== */

export async function removeVendor(
  vendorId: string,
): Promise<void> {

  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      'Business setup is required.',
    );
  }

  await deleteVendor(
    vendorId,
    business.id,
  );
}