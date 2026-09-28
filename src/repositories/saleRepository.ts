import { getDatabase } from '../database/database';
import type {
  Sale,
  SaleItem,
} from '../types/sale';

type SaleRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  invoice_number: string | null;
  sale_date: string;
  subtotal: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  created_at: string;
};

function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    saleDate: row.sale_date,
    subtotal: row.subtotal,
    gstAmount: row.gst_amount,
    discount: row.discount,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    dueAmount: row.due_amount,
    paymentMethod: row.payment_method as Sale['paymentMethod'],
    paymentStatus: row.payment_status as Sale['paymentStatus'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSaleItem(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    gstRate: row.gst_rate,
    gstAmount: row.gst_amount,
    discount: row.discount,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
  };
}

export async function createSale(
  sale: Sale,
  items: SaleItem[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT INTO sales (
          id,
          business_id,
          customer_id,
          invoice_number,
          sale_date,
          subtotal,
          gst_amount,
          discount,
          total_amount,
          paid_amount,
          due_amount,
          payment_method,
          payment_status,
          notes,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      sale.id,
      sale.businessId,
      sale.customerId ?? null,
      sale.invoiceNumber ?? null,
      sale.saleDate,
      sale.subtotal,
      sale.gstAmount,
      sale.discount,
      sale.totalAmount,
      sale.paidAmount,
      sale.dueAmount,
      sale.paymentMethod,
      sale.paymentStatus,
      sale.notes ?? null,
      sale.createdAt,
      sale.updatedAt,
    );

    for (const item of items) {
      await db.runAsync(
        `
          INSERT INTO sale_items (
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            gst_rate,
            gst_amount,
            discount,
            total_amount,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        item.id,
        item.saleId,
        item.productId,
        item.quantity,
        item.unitPrice,
        item.gstRate,
        item.gstAmount,
        item.discount,
        item.totalAmount,
        item.createdAt,
      );
    }
  });
}

export async function getSales(
  businessId: string,
): Promise<Sale[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<SaleRow>(
    `
      SELECT
        id,
        business_id,
        customer_id,
        invoice_number,
        sale_date,
        subtotal,
        gst_amount,
        discount,
        total_amount,
        paid_amount,
        due_amount,
        payment_method,
        payment_status,
        notes,
        created_at,
        updated_at
      FROM sales
      WHERE business_id = ?
      ORDER BY sale_date DESC, created_at DESC
    `,
    businessId,
  );

  return rows.map(mapSale);
}

export async function getSaleById(
  saleId: string,
): Promise<Sale | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<SaleRow>(
    `
      SELECT
        id,
        business_id,
        customer_id,
        invoice_number,
        sale_date,
        subtotal,
        gst_amount,
        discount,
        total_amount,
        paid_amount,
        due_amount,
        payment_method,
        payment_status,
        notes,
        created_at,
        updated_at
      FROM sales
      WHERE id = ?
      LIMIT 1
    `,
    saleId,
  );

  return row ? mapSale(row) : null;
}

export async function getSaleItems(
  saleId: string,
): Promise<SaleItem[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<SaleItemRow>(
    `
      SELECT
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        gst_rate,
        gst_amount,
        discount,
        total_amount,
        created_at
      FROM sale_items
      WHERE sale_id = ?
      ORDER BY created_at ASC
    `,
    saleId,
  );

  return rows.map(mapSaleItem);
}

export async function deleteSale(
  saleId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        DELETE FROM sale_items
        WHERE sale_id = ?
      `,
      saleId,
    );

    await db.runAsync(
      `
        DELETE FROM sales
        WHERE id = ?
      `,
      saleId,
    );
  });
}