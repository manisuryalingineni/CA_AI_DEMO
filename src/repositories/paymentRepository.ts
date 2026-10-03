import { getDatabase } from "../database/database";

import { getBusiness } from "./businessRepository";

import type {
  OpenPaymentDocument,
  PaymentRecord,
  SavePaymentInput,
} from "../types/payment";

/* =========================================================
   DATABASE ROW TYPES
========================================================= */

type OpenDocumentRow = {
  id: string;

  document_type: "SALE" | "PURCHASE";

  document_number: string | null;

  party_name: string | null;

  total_amount: number;

  paid_amount: number;

  due_amount: number;
};

type PaymentRow = {
  id: string;

  business_id: string;

  document_type: "SALE" | "PURCHASE";

  document_id: string;

  document_number: string;

  party_name: string;

  direction: "RECEIPT" | "PAYMENT";

  amount: number;

  mode: "CASH" | "UPI" | "BANK" | "CARD" | "CHEQUE";

  payment_date: string;

  reference: string | null;

  cheque_number: string | null;

  cheque_bank: string | null;

  cheque_date: string | null;

  created_at: string;
};

/* =========================================================
   MAPPERS
========================================================= */

function mapOpenDocument(row: OpenDocumentRow): OpenPaymentDocument {
  return {
    id: row.id,

    documentType: row.document_type,

    documentNumber:
      row.document_number ||
      (row.document_type === "SALE" ? "Invoice" : "Purchase bill"),

    partyName:
      row.party_name ||
      (row.document_type === "SALE" ? "Walk-in Customer" : "Vendor"),

    totalAmount: Number(row.total_amount) || 0,

    paidAmount: Number(row.paid_amount) || 0,

    dueAmount: Number(row.due_amount) || 0,
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,

    businessId: row.business_id,

    documentType: row.document_type,

    documentId: row.document_id,

    documentNumber: row.document_number,

    partyName: row.party_name,

    direction: row.direction,

    amount: Number(row.amount) || 0,

    mode: row.mode,

    paymentDate: row.payment_date,

    reference: row.reference || undefined,

    chequeNumber: row.cheque_number || undefined,

    chequeBank: row.cheque_bank || undefined,

    chequeDate: row.cheque_date || undefined,

    createdAt: row.created_at,
  };
}

/* =========================================================
   OPEN INVOICES / PURCHASE BILLS

   SALE:
   due amount = money we need to receive.

   PURCHASE:
   due amount = money we need to pay.
========================================================= */

export async function getOpenPaymentDocuments(): Promise<
  OpenPaymentDocument[]
> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  const db = await getDatabase();

  const rows = await db.getAllAsync<OpenDocumentRow>(
    `
        SELECT

          s.id
            AS id,

          'SALE'
            AS document_type,

          COALESCE(
            NULLIF(
              s.invoice_number,
              ''
            ),
            'Invoice'
          )
            AS document_number,

          COALESCE(
            NULLIF(
              c.name,
              ''
            ),
            'Walk-in Customer'
          )
            AS party_name,

          s.total_amount
            AS total_amount,

          s.paid_amount
            AS paid_amount,

          s.due_amount
            AS due_amount

        FROM sales s

        LEFT JOIN customers c
          ON c.id =
             s.customer_id

        WHERE
          s.business_id = ?

          AND
          s.due_amount > 0


        UNION ALL


        SELECT

          p.id
            AS id,

          'PURCHASE'
            AS document_type,

          COALESCE(
            NULLIF(
              p.invoice_number,
              ''
            ),

            NULLIF(
              p.purchase_number,
              ''
            ),

            'Purchase bill'
          )
            AS document_number,

          COALESCE(
            NULLIF(
              v.name,
              ''
            ),
            'Vendor'
          )
            AS party_name,

          p.total_amount
            AS total_amount,

          p.paid_amount
            AS paid_amount,

          p.due_amount
            AS due_amount

        FROM purchases p

        LEFT JOIN vendors v
          ON v.id =
             p.vendor_id

        WHERE
          p.business_id = ?

          AND
          p.due_amount > 0

        ORDER BY
          document_type ASC,

          document_number ASC
      `,
    [business.id, business.id],
  );

  return rows.map(mapOpenDocument);
}

/* =========================================================
   PAYMENT HISTORY
========================================================= */

export async function getPayments(): Promise<PaymentRecord[]> {
  const business = await getBusiness();

  if (!business) {
    return [];
  }

  const db = await getDatabase();

  const rows = await db.getAllAsync<PaymentRow>(
    `
        SELECT

          id,

          business_id,

          document_type,

          document_id,

          document_number,

          party_name,

          direction,

          amount,

          mode,

          payment_date,

          reference,

          cheque_number,

          cheque_bank,

          cheque_date,

          created_at

        FROM payments

        WHERE
          business_id = ?

        ORDER BY
          created_at DESC
      `,
    [business.id],
  );

  return rows.map(mapPayment);
}

/* =========================================================
   SAVE PAYMENT
========================================================= */

export async function insertPayment(
  input: SavePaymentInput,

  paymentId: string,

  createdAt: string,
): Promise<PaymentRecord> {
  const business = await getBusiness();

  if (!business) {
    throw new Error("Business setup is required before recording a payment.");
  }

  const db = await getDatabase();

  let result: PaymentRecord | null = null;

  /* =======================================================
     TRANSACTION

     Saving the payment and updating the linked
     sale/purchase happen together.
  ======================================================= */

  await db.withTransactionAsync(async () => {
    /* =====================================================
         SALE RECEIPT
      ===================================================== */

    if (input.documentType === "SALE") {
      const sale = await db.getFirstAsync<{
        id: string;

        invoice_number: string | null;

        customer_id: string | null;

        total_amount: number;

        paid_amount: number;

        due_amount: number;
      }>(
        `
              SELECT

                id,

                invoice_number,

                customer_id,

                total_amount,

                paid_amount,

                due_amount

              FROM sales

              WHERE
                id = ?

                AND
                business_id = ?

              LIMIT 1
            `,
        [input.documentId, business.id],
      );

      if (!sale) {
        throw new Error("Sale invoice not found.");
      }

      const amount = Number(input.amount) || 0;

      const currentDue = Number(sale.due_amount) || 0;

      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      if (currentDue <= 0) {
        throw new Error("This invoice is already fully paid.");
      }

      if (amount > currentDue) {
        throw new Error("Payment amount cannot exceed invoice due amount.");
      }

      const currentPaid = Number(sale.paid_amount) || 0;

      const totalAmount = Number(sale.total_amount) || 0;

      const newPaid = Math.min(
        currentPaid + amount,

        totalAmount,
      );

      const newDue = Math.max(
        totalAmount - newPaid,

        0,
      );

      const paymentStatus =
        newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

      /* ===================================================
           CUSTOMER NAME
        =================================================== */

      let partyName = "Walk-in Customer";

      if (sale.customer_id) {
        const customer = await db.getFirstAsync<{
          name: string;
        }>(
          `
                SELECT
                  name

                FROM customers

                WHERE
                  id = ?

                LIMIT 1
              `,
          [sale.customer_id],
        );

        if (customer?.name) {
          partyName = customer.name;
        }
      }

      const documentNumber = sale.invoice_number?.trim() || "Invoice";

      /* ===================================================
           UPDATE SALE
        =================================================== */

      await db.runAsync(
        `
            UPDATE sales

            SET
              paid_amount = ?,

              due_amount = ?,

              payment_status = ?,

              updated_at = ?

            WHERE
              id = ?

              AND
              business_id = ?
          `,
        [newPaid, newDue, paymentStatus, createdAt, sale.id, business.id],
      );

      /* ===================================================
           INSERT RECEIPT
        =================================================== */

      await db.runAsync(
        `
            INSERT INTO payments (

              id,

              business_id,

              document_type,

              document_id,

              document_number,

              party_name,

              direction,

              amount,

              mode,

              payment_date,

              reference,

              cheque_number,

              cheque_bank,

              cheque_date,

              created_at
            )

            VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?
            )
          `,
        [
          paymentId,

          business.id,

          "SALE",

          sale.id,

          documentNumber,

          partyName,

          "RECEIPT",

          amount,

          input.mode,

          input.paymentDate,

          input.reference || null,

          input.chequeNumber || null,

          input.chequeBank || null,

          input.chequeDate || null,

          createdAt,
        ],
      );

      result = {
        id: paymentId,

        businessId: business.id,

        documentType: "SALE",

        documentId: sale.id,

        documentNumber,

        partyName,

        direction: "RECEIPT",

        amount,

        mode: input.mode,

        paymentDate: input.paymentDate,

        reference: input.reference,

        chequeNumber: input.chequeNumber,

        chequeBank: input.chequeBank,

        chequeDate: input.chequeDate,

        createdAt,
      };

      return;
    }

    /* =====================================================
         PURCHASE PAYMENT
      ===================================================== */

    const purchase = await db.getFirstAsync<{
      id: string;

      purchase_number: string | null;

      invoice_number: string | null;

      vendor_id: string | null;

      total_amount: number;

      paid_amount: number;

      due_amount: number;
    }>(
      `
            SELECT

              id,

              purchase_number,

              invoice_number,

              vendor_id,

              total_amount,

              paid_amount,

              due_amount

            FROM purchases

            WHERE
              id = ?

              AND
              business_id = ?

            LIMIT 1
          `,
      [input.documentId, business.id],
    );

    if (!purchase) {
      throw new Error("Purchase bill not found.");
    }

    const amount = Number(input.amount) || 0;

    const currentDue = Number(purchase.due_amount) || 0;

    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    if (currentDue <= 0) {
      throw new Error("This purchase bill is already fully paid.");
    }

    if (amount > currentDue) {
      throw new Error("Payment amount cannot exceed purchase due amount.");
    }

    const currentPaid = Number(purchase.paid_amount) || 0;

    const totalAmount = Number(purchase.total_amount) || 0;

    const newPaid = Math.min(
      currentPaid + amount,

      totalAmount,
    );

    const newDue = Math.max(
      totalAmount - newPaid,

      0,
    );

    const paymentStatus =
      newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

    /* =====================================================
         VENDOR NAME
      ===================================================== */

    let partyName = "Vendor";

    if (purchase.vendor_id) {
      const vendor = await db.getFirstAsync<{
        name: string;
      }>(
        `
              SELECT
                name

              FROM vendors

              WHERE
                id = ?

              LIMIT 1
            `,
        [purchase.vendor_id],
      );

      if (vendor?.name) {
        partyName = vendor.name;
      }
    }

    /* =====================================================
         DOCUMENT NUMBER

         Prefer vendor invoice number.
         Otherwise use internal purchase number.
      ===================================================== */

    const documentNumber =
      purchase.invoice_number?.trim() ||
      purchase.purchase_number?.trim() ||
      "Purchase bill";

    /* =====================================================
         UPDATE PURCHASE
      ===================================================== */

    await db.runAsync(
      `
          UPDATE purchases

          SET
            paid_amount = ?,

            due_amount = ?,

            payment_status = ?,

            updated_at = ?

          WHERE
            id = ?

            AND
            business_id = ?
        `,
      [newPaid, newDue, paymentStatus, createdAt, purchase.id, business.id],
    );

    /* =====================================================
         INSERT VENDOR PAYMENT
      ===================================================== */

    await db.runAsync(
      `
          INSERT INTO payments (

            id,

            business_id,

            document_type,

            document_id,

            document_number,

            party_name,

            direction,

            amount,

            mode,

            payment_date,

            reference,

            cheque_number,

            cheque_bank,

            cheque_date,

            created_at
          )

          VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?
          )
        `,
      [
        paymentId,

        business.id,

        "PURCHASE",

        purchase.id,

        documentNumber,

        partyName,

        "PAYMENT",

        amount,

        input.mode,

        input.paymentDate,

        input.reference || null,

        input.chequeNumber || null,

        input.chequeBank || null,

        input.chequeDate || null,

        createdAt,
      ],
    );

    result = {
      id: paymentId,

      businessId: business.id,

      documentType: "PURCHASE",

      documentId: purchase.id,

      documentNumber,

      partyName,

      direction: "PAYMENT",

      amount,

      mode: input.mode,

      paymentDate: input.paymentDate,

      reference: input.reference,

      chequeNumber: input.chequeNumber,

      chequeBank: input.chequeBank,

      chequeDate: input.chequeDate,

      createdAt,
    };
  });

  if (!result) {
    throw new Error("Unable to save payment.");
  }

  return result;
}
