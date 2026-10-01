import { getDatabase } from "../database/database";

import { getBusiness } from "../repositories/businessRepository";

/* =========================================================
   TYPES
========================================================= */

export type DashboardSummary = {
  sales: number;
  purchases: number;
  toReceive: number;
  toPay: number;
};

export type RecentDocumentType =
  | "SALE"
  | "PURCHASE";

export type RecentDocument = {
  id: string;

  type: RecentDocumentType;

  documentNumber: string;

  partyName: string;

  documentDate: string;

  lineCount: number;

  totalAmount: number;

  dueAmount: number;

  status: string;

  createdAt: string;
};

export type DashboardData = {
  summary: DashboardSummary;

  recentDocuments:
    RecentDocument[];
};

/* =========================================================
   DATABASE ROWS
========================================================= */

type DashboardSummaryRow = {
  total_sales: number | null;

  total_purchases:
    number | null;

  total_receivable:
    number | null;

  total_payable:
    number | null;
};

type RecentDocumentRow = {
  id: string;

  type: string;

  document_number:
    string | null;

  party_name:
    string | null;

  document_date:
    string;

  line_count:
    number;

  total_amount:
    number;

  due_amount:
    number;

  status:
    string;

  created_at:
    string;
};

/* =========================================================
   EMPTY DASHBOARD
========================================================= */

function emptyDashboard(): DashboardData {
  return {
    summary: {
      sales: 0,

      purchases: 0,

      toReceive: 0,

      toPay: 0,
    },

    recentDocuments: [],
  };
}

/* =========================================================
   LOAD DASHBOARD
========================================================= */

export async function loadDashboardData(): Promise<DashboardData> {
  const business =
    await getBusiness();

  if (!business) {
    return emptyDashboard();
  }

  const db =
    await getDatabase();

  /* =======================================================
     KPI SUMMARY
  ======================================================= */

  const summary =
    await db.getFirstAsync<DashboardSummaryRow>(
      `
        SELECT

          (
            SELECT
              COALESCE(
                SUM(total_amount),
                0
              )

            FROM sales

            WHERE business_id = ?
          ) AS total_sales,

          (
            SELECT
              COALESCE(
                SUM(total_amount),
                0
              )

            FROM purchases

            WHERE business_id = ?
          ) AS total_purchases,

          (
            SELECT
              COALESCE(
                SUM(due_amount),
                0
              )

            FROM sales

            WHERE business_id = ?
          ) AS total_receivable,

          (
            SELECT
              COALESCE(
                SUM(due_amount),
                0
              )

            FROM purchases

            WHERE business_id = ?
          ) AS total_payable
      `,
      [
        business.id,

        business.id,

        business.id,

        business.id,
      ],
    );

  /* =======================================================
     RECENT DOCUMENTS
  ======================================================= */

  const rows =
    await db.getAllAsync<RecentDocumentRow>(
      `
        SELECT
          id,
          type,
          document_number,
          party_name,
          document_date,
          line_count,
          total_amount,
          due_amount,
          status,
          created_at

        FROM (

          /* =============================================
             SALES
          ============================================= */

          SELECT

            s.id
              AS id,

            'SALE'
              AS type,

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

            s.sale_date
              AS document_date,

            (
              SELECT
                COUNT(*)

              FROM
                sale_items si

              WHERE
                si.sale_id =
                s.id
            )
              AS line_count,

            s.total_amount
              AS total_amount,

            s.due_amount
              AS due_amount,

            s.payment_status
              AS status,

            s.created_at
              AS created_at

          FROM sales s

          LEFT JOIN customers c
            ON c.id =
               s.customer_id

          WHERE
            s.business_id = ?

          UNION ALL

          /* =============================================
             PURCHASES
          ============================================= */

          SELECT

            p.id
              AS id,

            'PURCHASE'
              AS type,

            COALESCE(
              NULLIF(
                p.invoice_number,
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

            p.purchase_date
              AS document_date,

            (
              SELECT
                COUNT(*)

              FROM
                purchase_items pi

              WHERE
                pi.purchase_id =
                p.id
            )
              AS line_count,

            p.total_amount
              AS total_amount,

            p.due_amount
              AS due_amount,

            p.payment_status
              AS status,

            p.created_at
              AS created_at

          FROM purchases p

          LEFT JOIN vendors v
            ON v.id =
               p.vendor_id

          WHERE
            p.business_id = ?
        )

        ORDER BY
          created_at DESC

        LIMIT 6
      `,
      [
        business.id,
        business.id,
      ],
    );

  return {
    summary: {
      sales:
        Number(
          summary?.total_sales,
        ) || 0,

      purchases:
        Number(
          summary?.total_purchases,
        ) || 0,

      toReceive:
        Number(
          summary?.total_receivable,
        ) || 0,

      toPay:
        Number(
          summary?.total_payable,
        ) || 0,
    },

    recentDocuments:
      rows.map(
        (row) => ({
          id:
            row.id,

          type:
            row.type ===
            "PURCHASE"
              ? "PURCHASE"
              : "SALE",

          documentNumber:
            row.document_number ||
            (row.type ===
            "PURCHASE"
              ? "Purchase bill"
              : "Invoice"),

          partyName:
            row.party_name ||
            (row.type ===
            "PURCHASE"
              ? "Vendor"
              : "Walk-in Customer"),

          documentDate:
            row.document_date,

          lineCount:
            Number(
              row.line_count,
            ) || 0,

          totalAmount:
            Number(
              row.total_amount,
            ) || 0,

          dueAmount:
            Number(
              row.due_amount,
            ) || 0,

          status:
            row.status ||
            "ISSUED",

          createdAt:
            row.created_at,
        }),
      ),
  };
}