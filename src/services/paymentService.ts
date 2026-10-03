import {
  getOpenPaymentDocuments,
  getPayments,
  insertPayment,
} from "../repositories/paymentRepository";

import type {
  OpenPaymentDocument,
  PaymentMode,
  PaymentRecord,
  SavePaymentInput,
} from "../types/payment";

/* =========================================================
   IDS
========================================================= */

function generatePaymentId():
  string {
  return `payment_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalizePayment(
  input: SavePaymentInput,
): SavePaymentInput {
  return {
    documentType:
      input.documentType,

    documentId:
      input.documentId,

    amount:
      Number(
        input.amount,
      ) || 0,

    mode:
      input.mode,

    paymentDate:
      input.paymentDate.trim(),

    reference:
      input.reference
        ?.trim() ||
      undefined,

    chequeNumber:
      input.chequeNumber
        ?.trim() ||
      undefined,

    chequeBank:
      input.chequeBank
        ?.trim() ||
      undefined,

    chequeDate:
      input.chequeDate
        ?.trim() ||
      undefined,
  };
}

/* =========================================================
   VALIDATION
========================================================= */

function validateMode(
  mode: PaymentMode,
): void {
  const supported:
    PaymentMode[] = [
      "CASH",
      "UPI",
      "BANK",
      "CARD",
      "CHEQUE",
    ];

  if (
    !supported.includes(
      mode,
    )
  ) {
    throw new Error(
      "Invalid payment mode.",
    );
  }
}

/* =========================================================
   LOAD OPEN DOCUMENTS
========================================================= */

export async function loadOpenPaymentDocuments():
  Promise<OpenPaymentDocument[]> {
  return getOpenPaymentDocuments();
}

/* =========================================================
   LOAD PAYMENT HISTORY
========================================================= */

export async function loadPayments():
  Promise<PaymentRecord[]> {
  return getPayments();
}

/* =========================================================
   SAVE
========================================================= */

export async function savePayment(
  input: SavePaymentInput,
): Promise<PaymentRecord> {
  const normalized =
    normalizePayment(
      input,
    );

  if (
    !normalized.documentId
  ) {
    throw new Error(
      "Select an open invoice or bill.",
    );
  }

  if (
    !normalized.paymentDate
  ) {
    throw new Error(
      "Payment date is required.",
    );
  }

  if (
    normalized.amount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero.",
    );
  }

  validateMode(
    normalized.mode,
  );

  if (
    normalized.mode ===
    "CHEQUE"
  ) {
    if (
      !normalized.chequeNumber
    ) {
      throw new Error(
        "Cheque number is required.",
      );
    }

    if (
      !normalized.chequeBank
    ) {
      throw new Error(
        "Cheque bank and branch are required.",
      );
    }

    if (
      !normalized.chequeDate
    ) {
      throw new Error(
        "Cheque date is required.",
      );
    }
  }

  return insertPayment(
    normalized,

    generatePaymentId(),

    new Date().toISOString(),
  );
}