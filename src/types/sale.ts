export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'CHEQUE'
  | 'CREDIT';

export type PaymentStatus =
  | 'PAID'
  | 'PARTIAL'
  | 'DUE';

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
}

export interface CreateSaleInput {
  customerId?: string;
  invoiceNumber?: string;
  saleDate: string;
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  items: CreateSaleItemInput[];
}

export interface Sale {
  id: string;
  businessId: string;
  customerId?: string;
  invoiceNumber?: string;
  saleDate: string;
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
}

export interface SaleWithItems {
  sale: Sale;
  items: SaleItem[];
}