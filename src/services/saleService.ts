import { getBusiness } from "../repositories/businessRepository";

import {
  createSale,
  getSales,
  getSaleById,
  getSaleItems,
  deleteSale,
} from "../repositories/saleRepository";

import type {
  CreateSaleInput,
  Sale,
  SaleItem,
  SaleWithItems,
} from "../types/sale";

/* =========================================================
   IDS
========================================================= */

function generateSaleId(): string {
  return `sale_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function generateSaleItemId(): string {
  return `sale_item_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* =========================================================
   VALIDATION
========================================================= */

function validateSaleInput(
  input: CreateSaleInput,
): void {
  if (!input.saleDate.trim()) {
    throw new Error(
      "Sale date is required.",
    );
  }

  if (!input.items.length) {
    throw new Error(
      "Add at least one product to the sale.",
    );
  }

  if (input.subtotal < 0) {
    throw new Error(
      "Subtotal cannot be negative.",
    );
  }

  if (input.gstAmount < 0) {
    throw new Error(
      "GST amount cannot be negative.",
    );
  }

  if (input.discount < 0) {
    throw new Error(
      "Discount cannot be negative.",
    );
  }

  if (input.totalAmount < 0) {
    throw new Error(
      "Total amount cannot be negative.",
    );
  }

  if (input.paidAmount < 0) {
    throw new Error(
      "Paid amount cannot be negative.",
    );
  }

  if (input.dueAmount < 0) {
    throw new Error(
      "Due amount cannot be negative.",
    );
  }

  if (
    input.paidAmount >
    input.totalAmount
  ) {
    throw new Error(
      "Paid amount cannot be greater than total amount.",
    );
  }

  for (const item of input.items) {
    if (!item.productId.trim()) {
      throw new Error(
        "Every sale item must have a product.",
      );
    }

    if (item.quantity <= 0) {
      throw new Error(
        "Product quantity must be greater than zero.",
      );
    }

    if (item.unitPrice < 0) {
      throw new Error(
        "Product price cannot be negative.",
      );
    }

    if (item.gstRate < 0) {
      throw new Error(
        "GST rate cannot be negative.",
      );
    }

    if (item.gstAmount < 0) {
      throw new Error(
        "GST amount cannot be negative.",
      );
    }

    if (item.discount < 0) {
      throw new Error(
        "Item discount cannot be negative.",
      );
    }

    if (item.totalAmount < 0) {
      throw new Error(
        "Item total cannot be negative.",
      );
    }
  }
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalizeSaleInput(
  input: CreateSaleInput,
): CreateSaleInput {
  return {
    customerId:
      input.customerId?.trim() ||
      undefined,

    invoiceNumber:
      input.invoiceNumber?.trim() ||
      undefined,

    saleDate:
      input.saleDate.trim(),

    subtotal:
      Number(input.subtotal) || 0,

    gstAmount:
      Number(input.gstAmount) || 0,

    discount:
      Number(input.discount) || 0,

    totalAmount:
      Number(input.totalAmount) ||
      0,

    paidAmount:
      Number(input.paidAmount) || 0,

    dueAmount:
      Number(input.dueAmount) || 0,

    paymentMethod:
      input.paymentMethod,

    paymentStatus:
      input.paymentStatus,

    notes:
      input.notes?.trim() ||
      undefined,

    items:
      input.items.map((item) => ({
        productId:
          item.productId.trim(),

        quantity:
          Number(item.quantity) || 0,

        unitPrice:
          Number(item.unitPrice) || 0,

        gstRate:
          Number(item.gstRate) || 0,

        gstAmount:
          Number(item.gstAmount) || 0,

        discount:
          Number(item.discount) || 0,

        totalAmount:
          Number(item.totalAmount) ||
          0,
      })),
  };
}

/* =========================================================
   INVOICE NUMBER
========================================================= */

async function generateInvoiceNumber(
  businessId: string,
): Promise<string> {
  const sales =
    await getSales(businessId);

  let maxNumber = 1000;

  for (const sale of sales) {
    const invoice =
      sale.invoiceNumber;

    if (!invoice) {
      continue;
    }

    const match =
      invoice.match(
        /^INV-(\d+)$/,
      );

    if (!match) {
      continue;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > maxNumber
    ) {
      maxNumber = number;
    }
  }

  return `INV-${maxNumber + 1}`;
}

/* =========================================================
   SAVE SALE
========================================================= */

export async function saveSale(
  input: CreateSaleInput,
): Promise<Sale> {
  const normalized =
    normalizeSaleInput(input);

  validateSaleInput(
    normalized,
  );

  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      "Business setup is required before creating a sale.",
    );
  }

  const now =
    new Date().toISOString();

  const saleId =
    generateSaleId();

  const invoiceNumber =
    normalized.invoiceNumber ||
    (await generateInvoiceNumber(
      business.id,
    ));

  const sale: Sale = {
    id:
      saleId,

    businessId:
      business.id,

    customerId:
      normalized.customerId,

    invoiceNumber,

    saleDate:
      normalized.saleDate,

    subtotal:
      normalized.subtotal,

    gstAmount:
      normalized.gstAmount,

    discount:
      normalized.discount,

    totalAmount:
      normalized.totalAmount,

    paidAmount:
      normalized.paidAmount,

    dueAmount:
      normalized.dueAmount,

    paymentMethod:
      normalized.paymentMethod,

    paymentStatus:
      normalized.paymentStatus,

    notes:
      normalized.notes,

    createdAt:
      now,

    updatedAt:
      now,
  };

  const items: SaleItem[] =
    normalized.items.map(
      (item) => ({
        id:
          generateSaleItemId(),

        saleId,

        productId:
          item.productId,

        quantity:
          item.quantity,

        unitPrice:
          item.unitPrice,

        gstRate:
          item.gstRate,

        gstAmount:
          item.gstAmount,

        discount:
          item.discount,

        totalAmount:
          item.totalAmount,

        createdAt:
          now,
      }),
    );

  await createSale(
    sale,
    items,
  );

  return sale;
}

/* =========================================================
   LOAD SALES
========================================================= */

export async function loadSales(): Promise<
  Sale[]
> {
  const business =
    await getBusiness();

  if (!business) {
    return [];
  }

  return getSales(
    business.id,
  );
}

/* =========================================================
   LOAD SINGLE SALE
========================================================= */

export async function loadSale(
  saleId: string,
): Promise<Sale | null> {
  if (!saleId) {
    return null;
  }

  const business =
    await getBusiness();

  if (!business) {
    return null;
  }

  const sale =
    await getSaleById(
      saleId,
    );

  if (!sale) {
    return null;
  }

  if (
    sale.businessId !==
    business.id
  ) {
    return null;
  }

  return sale;
}

/* =========================================================
   LOAD ITEMS
========================================================= */

export async function loadSaleItems(
  saleId: string,
): Promise<SaleItem[]> {
  const sale =
    await loadSale(
      saleId,
    );

  if (!sale) {
    return [];
  }

  return getSaleItems(
    saleId,
  );
}

/* =========================================================
   LOAD SALE WITH ITEMS
========================================================= */

export async function loadSaleWithItems(
  saleId: string,
): Promise<SaleWithItems | null> {
  const sale =
    await loadSale(
      saleId,
    );

  if (!sale) {
    return null;
  }

  const items =
    await getSaleItems(
      saleId,
    );

  return {
    sale,
    items,
  };
}

/* =========================================================
   DELETE SALE
========================================================= */

export async function removeSale(
  saleId: string,
): Promise<void> {
  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      "Business setup is required.",
    );
  }

  const sale =
    await getSaleById(
      saleId,
    );

  if (!sale) {
    throw new Error(
      "Sale not found.",
    );
  }

  if (
    sale.businessId !==
    business.id
  ) {
    throw new Error(
      "You cannot delete a sale from another business.",
    );
  }

  await deleteSale(
    saleId,
  );
}