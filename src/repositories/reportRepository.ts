import {
  getDatabase,
} from "../database/database";

import {
  getBusiness,
} from "./businessRepository";

import type {
  ReportData,
  ReportId,
  ReportRow,
  ReportsDashboardSummary,
} from "../types/report";

/* =========================================================
   HELPERS
========================================================= */

function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function textValue(
  value: unknown,
  fallback = "-",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function createRows(
  rows: Record<
    string,
    unknown
  >[],
): ReportRow[] {
  return rows.map(
    (
      row,
      index,
    ) => ({
      id:
        textValue(
          row.id,
          `row_${index}`,
        ),

      values:
        row as Record<
          string,
          string | number | null
        >,
    }),
  );
}

/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

export async function getReportsDashboardSummary():
  Promise<ReportsDashboardSummary> {
  const business =
    await getBusiness();

  if (!business) {
    return {
      netSales: 0,

      netPurchases: 0,

      bookResult: 0,

      stockValue: 0,
    };
  }

  const db =
    await getDatabase();

  const sales =
    await db.getFirstAsync<{
      total: number;
    }>(
      `
        SELECT
          COALESCE(
            SUM(total_amount),
            0
          ) AS total

        FROM sales

        WHERE
          business_id = ?
      `,
      [
        business.id,
      ],
    );

  const purchases =
    await db.getFirstAsync<{
      total: number;
    }>(
      `
        SELECT
          COALESCE(
            SUM(total_amount),
            0
          ) AS total

        FROM purchases

        WHERE
          business_id = ?
      `,
      [
        business.id,
      ],
    );

  const stock =
    await db.getFirstAsync<{
      total: number;
    }>(
      `
        SELECT
          COALESCE(
            SUM(
              stock_quantity *
              purchase_price
            ),
            0
          ) AS total

        FROM products

        WHERE
          business_id = ?
      `,
      [
        business.id,
      ],
    );

  const netSales =
    numberValue(
      sales?.total,
    );

  const netPurchases =
    numberValue(
      purchases?.total,
    );

  return {
    netSales,

    netPurchases,

    bookResult:
      netSales -
      netPurchases,

    stockValue:
      numberValue(
        stock?.total,
      ),
  };
}

/* =========================================================
   SALES REGISTER
========================================================= */

async function salesRegister(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          s.id,

          s.sale_date
            AS date,

          COALESCE(
            NULLIF(
              s.invoice_number,
              ''
            ),
            'Invoice'
          )
            AS invoice,

          COALESCE(
            NULLIF(
              c.name,
              ''
            ),
            'Walk-in Customer'
          )
            AS customer,

          s.subtotal
            AS taxable,

          s.gst_amount
            AS gst,

          s.total_amount
            AS total,

          s.paid_amount
            AS received,

          s.due_amount
            AS balance,

          s.payment_status
            AS status

        FROM sales s

        LEFT JOIN customers c
          ON c.id =
             s.customer_id

        WHERE
          s.business_id = ?

        ORDER BY
          s.sale_date DESC,
          s.created_at DESC
      `,
      [
        businessId,
      ],
    );

  const summary =
    result.reduce(
      (
        total,
        row,
      ) =>
        total +
        numberValue(
          row.total,
        ),
      0,
    );

  return {
    id:
      "sales-register",

    title:
      "Sales register",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "invoice",
        label: "Invoice",
      },
      {
        key: "customer",
        label: "Customer",
      },
      {
        key: "taxable",
        label: "Taxable value",
        format: "money",
      },
      {
        key: "gst",
        label: "GST",
        format: "money",
      },
      {
        key: "total",
        label: "Invoice total",
        format: "money",
      },
      {
        key: "received",
        label: "Received",
        format: "money",
      },
      {
        key: "balance",
        label: "Balance",
        format: "money",
      },
      {
        key: "status",
        label: "Status",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Total sales",

    summaryValue:
      summary,

    emptyMessage:
      "No saved sales found.",
  };
}

/* =========================================================
   PURCHASE REGISTER
========================================================= */

async function purchaseRegister(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          p.id,

          p.purchase_date
            AS date,

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
            AS bill,

          COALESCE(
            NULLIF(
              v.name,
              ''
            ),
            'Vendor'
          )
            AS vendor,

          p.subtotal
            AS taxable,

          p.gst_amount
            AS gst,

          p.total_amount
            AS total,

          p.paid_amount
            AS paid,

          p.due_amount
            AS balance,

          p.payment_status
            AS status

        FROM purchases p

        LEFT JOIN vendors v
          ON v.id =
             p.vendor_id

        WHERE
          p.business_id = ?

        ORDER BY
          p.purchase_date DESC,
          p.created_at DESC
      `,
      [
        businessId,
      ],
    );

  const total =
    result.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        numberValue(
          row.total,
        ),
      0,
    );

  return {
    id:
      "purchase-register",

    title:
      "Purchase register",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "bill",
        label: "Bill",
      },
      {
        key: "vendor",
        label: "Vendor",
      },
      {
        key: "taxable",
        label: "Taxable value",
        format: "money",
      },
      {
        key: "gst",
        label: "GST",
        format: "money",
      },
      {
        key: "total",
        label: "Bill total",
        format: "money",
      },
      {
        key: "paid",
        label: "Paid",
        format: "money",
      },
      {
        key: "balance",
        label: "Balance",
        format: "money",
      },
      {
        key: "status",
        label: "Status",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Total purchases",

    summaryValue:
      total,

    emptyMessage:
      "No saved purchase bills found.",
  };
}

/* =========================================================
   STOCK REPORT
========================================================= */

async function stockReport(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          p.id,

          p.id
            AS sku,

          p.name
            AS item,

          COALESCE(
            NULLIF(
              p.hsn,
              ''
            ),
            '-'
          )
            AS hsn,

          p.stock_quantity
            AS quantity,

          p.unit
            AS unit,

          p.purchase_price
            AS cost,

          (
            p.stock_quantity *
            p.purchase_price
          )
            AS stock_value,

          COALESCE(
            NULLIF(
              p.brand,
              ''
            ),
            '-'
          )
            AS brand,

          COALESCE(
            NULLIF(
              p.rack,
              ''
            ),
            '-'
          )
            AS rack

        FROM products p

        WHERE
          p.business_id = ?

        ORDER BY
          p.name ASC
      `,
      [
        businessId,
      ],
    );

  const stockValue =
    result.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        numberValue(
          row.stock_value,
        ),
      0,
    );

  return {
    id:
      "stock-report",

    title:
      "Stock report",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "sku",
        label: "SKU",
      },
      {
        key: "item",
        label: "Item",
      },
      {
        key: "hsn",
        label: "HSN",
      },
      {
        key: "quantity",
        label: "Quantity",
        format: "number",
      },
      {
        key: "unit",
        label: "Unit",
      },
      {
        key: "cost",
        label: "Cost",
        format: "money",
      },
      {
        key: "stock_value",
        label: "Stock value",
        format: "money",
      },
      {
        key: "brand",
        label: "Brand",
      },
      {
        key: "rack",
        label: "Rack",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Stock value",

    summaryValue:
      stockValue,

    emptyMessage:
      "No products found.",
  };
}

/* =========================================================
   RECEIVABLES
========================================================= */

async function receivables(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          s.id,

          COALESCE(
            NULLIF(
              c.name,
              ''
            ),
            'Walk-in Customer'
          )
            AS customer,

          COALESCE(
            NULLIF(
              s.invoice_number,
              ''
            ),
            'Invoice'
          )
            AS invoice,

          s.sale_date
            AS invoice_date,

          s.total_amount
            AS invoice_total,

          s.paid_amount
            AS received,

          s.due_amount
            AS balance,

          s.payment_status
            AS status

        FROM sales s

        LEFT JOIN customers c
          ON c.id =
             s.customer_id

        WHERE
          s.business_id = ?

          AND
          s.due_amount > 0

        ORDER BY
          s.sale_date ASC
      `,
      [
        businessId,
      ],
    );

  const total =
    result.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        numberValue(
          row.balance,
        ),
      0,
    );

  return {
    id:
      "receivables",

    title:
      "Receivables",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "customer",
        label: "Customer",
      },
      {
        key: "invoice",
        label: "Invoice",
      },
      {
        key: "invoice_date",
        label: "Invoice date",
        format: "date",
      },
      {
        key: "invoice_total",
        label: "Invoice total",
        format: "money",
      },
      {
        key: "received",
        label: "Received",
        format: "money",
      },
      {
        key: "balance",
        label: "Balance",
        format: "money",
      },
      {
        key: "status",
        label: "Status",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Total receivable",

    summaryValue:
      total,

    emptyMessage:
      "No customer balances are outstanding.",
  };
}

/* =========================================================
   PAYABLES
========================================================= */

async function payables(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          p.id,

          COALESCE(
            NULLIF(
              v.name,
              ''
            ),
            'Vendor'
          )
            AS vendor,

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
            AS bill,

          p.purchase_date
            AS bill_date,

          p.total_amount
            AS bill_total,

          p.paid_amount
            AS paid,

          p.due_amount
            AS balance,

          p.payment_status
            AS status

        FROM purchases p

        LEFT JOIN vendors v
          ON v.id =
             p.vendor_id

        WHERE
          p.business_id = ?

          AND
          p.due_amount > 0

        ORDER BY
          p.purchase_date ASC
      `,
      [
        businessId,
      ],
    );

  const total =
    result.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        numberValue(
          row.balance,
        ),
      0,
    );

  return {
    id: "payables",

    title: "Payables",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "vendor",
        label: "Vendor",
      },
      {
        key: "bill",
        label: "Bill",
      },
      {
        key: "bill_date",
        label: "Bill date",
        format: "date",
      },
      {
        key: "bill_total",
        label: "Bill total",
        format: "money",
      },
      {
        key: "paid",
        label: "Paid",
        format: "money",
      },
      {
        key: "balance",
        label: "Balance",
        format: "money",
      },
      {
        key: "status",
        label: "Status",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Total payable",

    summaryValue:
      total,

    emptyMessage:
      "No vendor balances are outstanding.",
  };
}

/* =========================================================
   PAYMENT REGISTER
========================================================= */

async function paymentRegister(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          id,

          payment_date
            AS date,

          party_name
            AS party,

          document_number
            AS document,

          direction,

          mode,

          amount,

          COALESCE(
            NULLIF(
              reference,
              ''
            ),
            '-'
          )
            AS reference,

          COALESCE(
            NULLIF(
              cheque_number,
              ''
            ),
            '-'
          )
            AS cheque_number,

          COALESCE(
            NULLIF(
              cheque_bank,
              ''
            ),
            '-'
          )
            AS bank,

          COALESCE(
            NULLIF(
              cheque_date,
              ''
            ),
            '-'
          )
            AS cheque_date

        FROM payments

        WHERE
          business_id = ?

        ORDER BY
          created_at DESC
      `,
      [
        businessId,
      ],
    );

  const total =
    result.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        numberValue(
          row.amount,
        ),
      0,
    );

  return {
    id:
      "payment-register",

    title:
      "Payment & cheque register",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "party",
        label: "Party",
      },
      {
        key: "document",
        label: "Document",
      },
      {
        key: "direction",
        label: "Type",
      },
      {
        key: "mode",
        label: "Mode",
      },
      {
        key: "amount",
        label: "Amount",
        format: "money",
      },
      {
        key: "reference",
        label: "Reference",
      },
      {
        key: "cheque_number",
        label: "Cheque no.",
      },
      {
        key: "bank",
        label: "Bank",
      },
      {
        key: "cheque_date",
        label: "Cheque date",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Total recorded",

    summaryValue:
      total,

    emptyMessage:
      "No payments have been recorded.",
  };
}

/* =========================================================
   CASH FLOW
========================================================= */

async function cashFlow(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          id,

          payment_date
            AS date,

          CASE
            WHEN direction = 'RECEIPT'
              THEN 'Money in'
            ELSE
              'Money out'
          END
            AS flow,

          party_name
            AS party,

          document_number
            AS document,

          mode,

          amount,

          COALESCE(
            NULLIF(
              reference,
              ''
            ),
            '-'
          )
            AS reference

        FROM payments

        WHERE
          business_id = ?

        ORDER BY
          created_at DESC
      `,
      [
        businessId,
      ],
    );

  const moneyIn =
    result
      .filter(
        row =>
          row.flow ===
          "Money in",
      )
      .reduce(
        (
          sum,
          row,
        ) =>
          sum +
          numberValue(
            row.amount,
          ),
        0,
      );

  const moneyOut =
    result
      .filter(
        row =>
          row.flow ===
          "Money out",
      )
      .reduce(
        (
          sum,
          row,
        ) =>
          sum +
          numberValue(
            row.amount,
          ),
        0,
      );

  return {
    id:
      "cash-flow",

    title:
      "Cash-flow register",

    subtitle:
      "Retail Shop • live saved data",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "flow",
        label: "Flow",
      },
      {
        key: "party",
        label: "Party",
      },
      {
        key: "document",
        label: "Document",
      },
      {
        key: "mode",
        label: "Mode",
      },
      {
        key: "amount",
        label: "Amount",
        format: "money",
      },
      {
        key: "reference",
        label: "Reference",
      },
    ],

    rows:
      createRows(
        result,
      ),

    summaryLabel:
      "Net cash flow",

    summaryValue:
      moneyIn -
      moneyOut,

    emptyMessage:
      "No cash-flow entries found.",
  };
}

/* =========================================================
   BANK RECONCILIATION
========================================================= */

async function bankReconciliation(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          id,

          payment_date
            AS date,

          party_name
            AS party,

          document_number
            AS document,

          direction,

          mode,

          amount,

          COALESCE(
            NULLIF(
              reference,
              ''
            ),
            'No reference'
          )
            AS reference,

          CASE
            WHEN reference IS NOT NULL
              AND TRIM(reference) <> ''
              THEN 'Reference available'
            ELSE
              'Review required'
          END
            AS reconciliation_status

        FROM payments

        WHERE
          business_id = ?

          AND
          mode = 'BANK'

        ORDER BY
          created_at DESC
      `,
      [
        businessId,
      ],
    );

  return {
    id:
      "bank-reconciliation",

    title:
      "Bank reconciliation",

    subtitle:
      "Bank transactions • live saved data",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "party",
        label: "Party",
      },
      {
        key: "document",
        label: "Document",
      },
      {
        key: "direction",
        label: "Type",
      },
      {
        key: "amount",
        label: "Amount",
        format: "money",
      },
      {
        key: "reference",
        label: "Reference",
      },
      {
        key: "reconciliation_status",
        label: "Status",
      },
    ],

    rows:
      createRows(
        result,
      ),

    emptyMessage:
      "No bank transactions are available for reconciliation.",
  };
}

/* =========================================================
   GST WORKING
========================================================= */

async function gstWorking(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const sales =
    await db.getFirstAsync<{
      taxable: number;

      gst: number;
    }>(
      `
        SELECT
          COALESCE(
            SUM(subtotal),
            0
          ) AS taxable,

          COALESCE(
            SUM(gst_amount),
            0
          ) AS gst

        FROM sales

        WHERE
          business_id = ?
      `,
      [
        businessId,
      ],
    );

  const purchases =
    await db.getFirstAsync<{
      taxable: number;

      gst: number;
    }>(
      `
        SELECT
          COALESCE(
            SUM(subtotal),
            0
          ) AS taxable,

          COALESCE(
            SUM(gst_amount),
            0
          ) AS gst

        FROM purchases

        WHERE
          business_id = ?
      `,
      [
        businessId,
      ],
    );

  const outputGst =
    numberValue(
      sales?.gst,
    );

  const inputGst =
    numberValue(
      purchases?.gst,
    );

  return {
    id:
      "gst-working",

    title:
      "GST working",

    subtitle:
      "Output, ITC and net GST",

    fields: [
      {
        key: "sales_taxable",
        label: "Sales taxable",
        format: "money",
      },
      {
        key: "output_gst",
        label: "Output GST",
        format: "money",
      },
      {
        key: "purchase_taxable",
        label: "Purchase taxable",
        format: "money",
      },
      {
        key: "input_gst",
        label: "Input GST / ITC",
        format: "money",
      },
      {
        key: "net_gst",
        label: "Net GST",
        format: "money",
      },
    ],

    rows: [
      {
        id:
          "gst_summary",

        values: {
          sales_taxable:
            numberValue(
              sales?.taxable,
            ),

          output_gst:
            outputGst,

          purchase_taxable:
            numberValue(
              purchases?.taxable,
            ),

          input_gst:
            inputGst,

          net_gst:
            outputGst -
            inputGst,
        },
      },
    ],

    summaryLabel:
      "Net GST",

    summaryValue:
      outputGst -
      inputGst,
  };
}

/* =========================================================
   GST READINESS
========================================================= */

async function gstReadiness(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const sales =
    await db.getFirstAsync<{
      documents: number;

      gst: number;
    }>(
      `
        SELECT
          COUNT(*) AS documents,

          COALESCE(
            SUM(gst_amount),
            0
          ) AS gst

        FROM sales

        WHERE
          business_id = ?
      `,
      [
        businessId,
      ],
    );

  const purchases =
    await db.getFirstAsync<{
      documents: number;

      gst: number;
    }>(
      `
        SELECT
          COUNT(*) AS documents,

          COALESCE(
            SUM(gst_amount),
            0
          ) AS gst

        FROM purchases

        WHERE
          business_id = ?
      `,
      [
        businessId,
      ],
    );

  return {
    id:
      "gst-readiness",

    title:
      "GST readiness",

    subtitle:
      "GST preparation checklist",

    fields: [
      {
        key: "sales_documents",
        label: "Sales documents",
        format: "number",
      },
      {
        key: "purchase_documents",
        label: "Purchase documents",
        format: "number",
      },
      {
        key: "output_gst",
        label: "Output GST",
        format: "money",
      },
      {
        key: "input_gst",
        label: "Input GST",
        format: "money",
      },
      {
        key: "status",
        label: "Review",
      },
    ],

    rows: [
      {
        id:
          "gst_readiness",

        values: {
          sales_documents:
            numberValue(
              sales?.documents,
            ),

          purchase_documents:
            numberValue(
              purchases?.documents,
            ),

          output_gst:
            numberValue(
              sales?.gst,
            ),

          input_gst:
            numberValue(
              purchases?.gst,
            ),

          status:
            "Verify GSTIN, tax rates and filing data before submission.",
        },
      },
    ],
  };
}

/* =========================================================
   PROFIT & LOSS
========================================================= */

async function profitLoss(
  businessId: string,
): Promise<ReportData> {
  const summary =
    await getReportsDashboardSummary();

  return {
    id:
      "profit-loss",

    title:
      "Profit & loss",

    subtitle:
      "Book-level trading result",

    fields: [
      {
        key: "sales",
        label: "Net sales",
        format: "money",
      },
      {
        key: "purchases",
        label: "Net purchases",
        format: "money",
      },
      {
        key: "result",
        label: "Book result",
        format: "money",
      },
      {
        key: "note",
        label: "Note",
      },
    ],

    rows: [
      {
        id:
          "profit_loss",

        values: {
          sales:
            summary.netSales,

          purchases:
            summary.netPurchases,

          result:
            summary.bookResult,

          note:
            "Expenses are not included because no expense ledger is currently available in this database.",
        },
      },
    ],

    summaryLabel:
      "Book result",

    summaryValue:
      summary.bookResult,
  };
}

/* =========================================================
   DAY BOOK
========================================================= */

async function dayBook(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          id,

          sale_date
            AS date,

          'SALE'
            AS type,

          COALESCE(
            NULLIF(
              invoice_number,
              ''
            ),
            'Invoice'
          )
            AS document,

          total_amount
            AS amount

        FROM sales

        WHERE
          business_id = ?


        UNION ALL


        SELECT
          id,

          purchase_date
            AS date,

          'PURCHASE'
            AS type,

          COALESCE(
            NULLIF(
              invoice_number,
              ''
            ),
            NULLIF(
              purchase_number,
              ''
            ),
            'Purchase bill'
          )
            AS document,

          total_amount
            AS amount

        FROM purchases

        WHERE
          business_id = ?


        UNION ALL


        SELECT
          id,

          payment_date
            AS date,

          direction
            AS type,

          document_number
            AS document,

          amount

        FROM payments

        WHERE
          business_id = ?

        ORDER BY
          date DESC
      `,
      [
        businessId,

        businessId,

        businessId,
      ],
    );

  return {
    id:
      "day-book",

    title:
      "Day book",

    subtitle:
      "All dated transactions",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "type",
        label: "Type",
      },
      {
        key: "document",
        label: "Document",
      },
      {
        key: "amount",
        label: "Amount",
        format: "money",
      },
    ],

    rows:
      createRows(
        result,
      ),

    emptyMessage:
      "No transactions found.",
  };
}

/* =========================================================
   PAYROLL
========================================================= */

async function payrollSummary():
  Promise<ReportData> {
  return {
    id:
      "payroll-summary",

    title:
      "Payroll summary",

    subtitle:
      "Salary, labour and deductions",

    fields: [],

    rows: [],

    emptyMessage:
      "Payroll data is not available yet because the current database does not contain payroll or employee salary tables.",
  };
}

/* =========================================================
   BUSINESS INCOME TAX
========================================================= */

async function businessIncomeTax():
  Promise<ReportData> {
  const summary =
    await getReportsDashboardSummary();

  return {
    id:
      "business-income-tax",

    title:
      "Business income tax",

    subtitle:
      "Book closure and IT working",

    fields: [
      {
        key: "sales",
        label: "Sales",
        format: "money",
      },
      {
        key: "purchases",
        label: "Purchases",
        format: "money",
      },
      {
        key: "book_result",
        label: "Book result",
        format: "money",
      },
      {
        key: "note",
        label: "Tax note",
      },
    ],

    rows: [
      {
        id:
          "income_tax",

        values: {
          sales:
            summary.netSales,

          purchases:
            summary.netPurchases,

          book_result:
            summary.bookResult,

          note:
            "This is a book-level summary only. Taxable income requires expenses, depreciation and other tax adjustments.",
        },
      },
    ],

    summaryLabel:
      "Book result",

    summaryValue:
      summary.bookResult,
  };
}

/* =========================================================
   DOCUMENT INDEX
========================================================= */

async function documentIndex(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          id,

          sale_date
            AS date,

          'Tax invoice'
            AS document_type,

          COALESCE(
            NULLIF(
              invoice_number,
              ''
            ),
            'Invoice'
          )
            AS document_number,

          total_amount
            AS amount

        FROM sales

        WHERE
          business_id = ?


        UNION ALL


        SELECT
          id,

          purchase_date
            AS date,

          'Purchase bill'
            AS document_type,

          COALESCE(
            NULLIF(
              invoice_number,
              ''
            ),
            NULLIF(
              purchase_number,
              ''
            ),
            'Purchase bill'
          )
            AS document_number,

          total_amount
            AS amount

        FROM purchases

        WHERE
          business_id = ?


        UNION ALL


        SELECT
          id,

          payment_date
            AS date,

          CASE
            WHEN direction = 'RECEIPT'
              THEN 'Receipt'
            ELSE
              'Payment'
          END
            AS document_type,

          document_number,

          amount

        FROM payments

        WHERE
          business_id = ?

        ORDER BY
          date DESC
      `,
      [
        businessId,

        businessId,

        businessId,
      ],
    );

  return {
    id:
      "document-index",

    title:
      "Document index",

    subtitle:
      "Accounting and tax evidence",

    fields: [
      {
        key: "date",
        label: "Date",
        format: "date",
      },
      {
        key: "document_type",
        label: "Document type",
      },
      {
        key: "document_number",
        label: "Document number",
      },
      {
        key: "amount",
        label: "Amount",
        format: "money",
      },
    ],

    rows:
      createRows(
        result,
      ),

    emptyMessage:
      "No documents found.",
  };
}

/* =========================================================
   COUNTER / PRODUCT / BRANCH SALES
========================================================= */

async function productSales(
  businessId: string,
): Promise<ReportData> {
  const db =
    await getDatabase();

  const result =
    await db.getAllAsync<
      Record<
        string,
        unknown
      >
    >(
      `
        SELECT
          si.product_id
            AS id,

          p.name
            AS product,

          SUM(
            si.quantity
          )
            AS quantity,

          p.unit
            AS unit,

          SUM(
            si.total_amount
          )
            AS sales_value,

          'Not captured'
            AS counter_branch

        FROM sale_items si

        INNER JOIN sales s
          ON s.id =
             si.sale_id

        LEFT JOIN products p
          ON p.id =
             si.product_id

        WHERE
          s.business_id = ?

        GROUP BY
          si.product_id,
          p.name,
          p.unit

        ORDER BY
          sales_value DESC
      `,
      [
        businessId,
      ],
    );

  return {
    id:
      "counter-product-branch",

    title:
      "Counter, product and branch sales",

    subtitle:
      "Product sales analysis",

    fields: [
      {
        key: "product",
        label: "Product",
      },
      {
        key: "quantity",
        label: "Quantity sold",
        format: "number",
      },
      {
        key: "unit",
        label: "Unit",
      },
      {
        key: "sales_value",
        label: "Sales value",
        format: "money",
      },
      {
        key: "counter_branch",
        label: "Counter / branch",
      },
    ],

    rows:
      createRows(
        result,
      ),

    emptyMessage:
      "No product sales found.",
  };
}

/* =========================================================
   GET REPORT
========================================================= */

export async function getReportById(
  reportId: ReportId,
): Promise<ReportData> {
  const business =
    await getBusiness();

  if (!business) {
    throw new Error(
      "Business setup is required.",
    );
  }

  switch (
    reportId
  ) {
    case "sales-register":
      return salesRegister(
        business.id,
      );

    case "purchase-register":
      return purchaseRegister(
        business.id,
      );

    case "stock-report":
      return stockReport(
        business.id,
      );

    case "receivables":
      return receivables(
        business.id,
      );

    case "payables":
      return payables(
        business.id,
      );

    case "payment-register":
      return paymentRegister(
        business.id,
      );

    case "cash-flow":
      return cashFlow(
        business.id,
      );

    case "bank-reconciliation":
      return bankReconciliation(
        business.id,
      );

    case "gst-working":
      return gstWorking(
        business.id,
      );

    case "gst-readiness":
      return gstReadiness(
        business.id,
      );

    case "profit-loss":
      return profitLoss(
        business.id,
      );

    case "day-book":
      return dayBook(
        business.id,
      );

    case "payroll-summary":
      return payrollSummary();

    case "business-income-tax":
      return businessIncomeTax();

    case "document-index":
      return documentIndex(
        business.id,
      );

    case "counter-product-branch":
      return productSales(
        business.id,
      );

    default:
      throw new Error(
        "Unknown report.",
      );
  }
}