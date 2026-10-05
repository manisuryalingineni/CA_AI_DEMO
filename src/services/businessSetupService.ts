
import {
  getBusiness,
} from "../repositories/businessRepository";

import {
  deleteBusinessSetupRecord,
  getBusinessSetupRecord,
  saveBusinessSetupRecord,
} from "../repositories/businessSetupRepository";

import type {
  BusinessSetup,
} from "../types/businessSetup";

/* =========================================================
   HELPERS
========================================================= */

function text(
  input: unknown,
): string {
  return typeof input === "string"
    ? input.trim()
    : "";
}

function currentFinancialYear(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const start =
    now.getMonth() >= 3
      ? year
      : year - 1;

  return `${start}-${String(
    start + 1,
  ).slice(-2)}`;
}

/* =========================================================
   DEFAULT BUSINESS SETUP
========================================================= */

export async function createDefaultBusinessSetup(): Promise<BusinessSetup> {
  const business =
    await getBusiness();

  if (!business?.id) {
    throw new Error(
      "Select a business before configuring Business Setup.",
    );
  }

  const businessName =
    text(
      business.name,
    ) ||
    "Business";

  const businessGstin =
    text(
      business.gstin,
    );

  return {
    businessId:
      String(
        business.id,
      ),

    /* =====================================================
       BUSINESS LOGO
    ===================================================== */

    logoDataUri:
      "",

    /* =====================================================
       BUSINESS IDENTITY
    ===================================================== */

    legalBusinessName:
      businessName,

    displayBusinessName:
      businessName,

    gstin:
      businessGstin,

    pan:
      "",

    phone:
      "",

    email:
      "",

    address:
      "",

    /* =====================================================
       NUMBERING & DESIGN
    ===================================================== */

    invoicePrefix:
      "INV-",

    nextInvoiceNumber:
      1001,

    purchaseBillPrefix:
      "PB-",

    quotationPrefix:
      "QT-",

    financialYear:
      currentFinancialYear(),

    accentColor:
      "#07867D",

    pdfLayout:
      "STANDARD",

    /* =====================================================
       BANK / UPI
    ===================================================== */

    bankName:
      "",

    bankBranch:
      "",

    accountName:
      "",

    accountNumber:
      "",

    ifsc:
      "",

    upi:
      "",

    /* =====================================================
       CHEQUE
    ===================================================== */

    chequePayee:
      "Account Payee only",

    chequeInstructions:
      "Cheque payable to the business legal name. Mention invoice number behind the cheque.",

    /* =====================================================
       TERMS / FOOTER / SIGNATURE
    ===================================================== */

    terms:
      "Payment due as stated. Goods once sold are subject to the stated return policy.",

    footerMessage:
      "Thank you for your business.",

    signatureName:
      "Authorised Signatory",

    /* =====================================================
       PDF VISIBILITY
    ===================================================== */

    showBusinessLogo:
      true,

    showBankUpi:
      true,

    showCheque:
      true,

    showHsnSac:
      true,

    showGstBreakup:
      true,

    showSignatureBlock:
      true,

    updatedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   LOAD
========================================================= */

export async function loadBusinessSetup(): Promise<BusinessSetup> {
  const defaults =
    await createDefaultBusinessSetup();

  const existing =
    await getBusinessSetupRecord(
      defaults.businessId,
    );

  if (!existing) {
    return defaults;
  }

  return {
    ...defaults,

    ...existing,

    /*
     * Always keep the currently selected
     * business as the owner of these settings.
     */

    businessId:
      defaults.businessId,
  };
}

/* =========================================================
   SAVE
========================================================= */

export async function saveBusinessSetup(
  input: BusinessSetup,
): Promise<void> {
  const legalBusinessName =
    input.legalBusinessName.trim();

  const displayBusinessName =
    input.displayBusinessName.trim();

  const invoicePrefix =
    input.invoicePrefix.trim();

  if (!legalBusinessName) {
    throw new Error(
      "Legal business name is required.",
    );
  }

  if (!displayBusinessName) {
    throw new Error(
      "Display business name is required.",
    );
  }

  if (!invoicePrefix) {
    throw new Error(
      "Invoice prefix is required.",
    );
  }

  if (
    !Number.isFinite(
      input.nextInvoiceNumber,
    ) ||
    input.nextInvoiceNumber < 1
  ) {
    throw new Error(
      "Next invoice number must be greater than zero.",
    );
  }

  await saveBusinessSetupRecord({
    ...input,

    legalBusinessName,

    displayBusinessName,

    gstin:
      input.gstin
        .trim()
        .toUpperCase(),

    pan:
      input.pan
        .trim()
        .toUpperCase(),

    phone:
      input.phone.trim(),

    email:
      input.email.trim(),

    address:
      input.address.trim(),

    invoicePrefix,

    purchaseBillPrefix:
      input.purchaseBillPrefix.trim(),

    quotationPrefix:
      input.quotationPrefix.trim(),

    financialYear:
      input.financialYear.trim(),

    accentColor:
      input.accentColor.trim(),

    bankName:
      input.bankName.trim(),

    bankBranch:
      input.bankBranch.trim(),

    accountName:
      input.accountName.trim(),

    accountNumber:
      input.accountNumber.trim(),

    ifsc:
      input.ifsc
        .trim()
        .toUpperCase(),

    upi:
      input.upi.trim(),

    chequePayee:
      input.chequePayee.trim(),

    chequeInstructions:
      input.chequeInstructions.trim(),

    terms:
      input.terms.trim(),

    footerMessage:
      input.footerMessage.trim(),

    signatureName:
      input.signatureName.trim(),

    updatedAt:
      new Date().toISOString(),
  });
}

/* =========================================================
   RESET
========================================================= */

export async function resetBusinessSetup(): Promise<BusinessSetup> {
  const defaults =
    await createDefaultBusinessSetup();

  await deleteBusinessSetupRecord(
    defaults.businessId,
  );

  return defaults;
}
