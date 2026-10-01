export interface Purchase {
  id: string;
  businessId: string;

  vendorId?: string;
  invoiceNumber?: string;
  purchaseDate: string;

  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;

  paidAmount: number;
  dueAmount: number;

  paymentStatus:
    | 'UNPAID'
    | 'PARTIAL'
    | 'PAID';

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;

  productId: string;

  quantity: number;
  unitPrice: number;

  gstRate: number;
  gstAmount: number;

  discount: number;
  totalAmount: number;

  createdAt: string;
}