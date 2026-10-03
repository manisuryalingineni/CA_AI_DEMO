/* =========================================================

   EXISTING POS CONTRACTS

   Kept unchanged so current POS/service/repository callers

   continue to compile while the workflow is introduced.

========================================================= */



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



/* =========================================================

   SALES WORKFLOW IDENTIFIERS

   These names match the reference APK.

   Receipts are settlements, not a sixth sales document type.

========================================================= */



export const SALES_DOCUMENT_TYPES = [

  'QUOTATION',

  'SALES_ORDER',

  'DELIVERY_CHALLAN',

  'SALES_INVOICE',

  'SALES_RETURN',

] as const;



export type SalesDocumentType =

  (typeof SALES_DOCUMENT_TYPES)[number];



export const SALES_DOCUMENT_LABELS: Readonly<

  Record<SalesDocumentType, string>

> = {

  QUOTATION: 'Quotation',

  SALES_ORDER: 'Sales order',

  DELIVERY_CHALLAN: 'Delivery challan',

  SALES_INVOICE: 'Tax invoice',

  SALES_RETURN: 'Sales return',

};



export const SALES_DOCUMENT_PREFIXES: Readonly<

  Record<SalesDocumentType, string>

> = {

  QUOTATION: 'QT',

  SALES_ORDER: 'SO',

  DELIVERY_CHALLAN: 'DC',

  SALES_INVOICE: 'INV',

  SALES_RETURN: 'SR',

};



export const SALES_NEXT_DOCUMENT: Readonly<

  Partial<Record<SalesDocumentType, SalesDocumentType>>

> = {

  QUOTATION: 'SALES_ORDER',

  SALES_ORDER: 'DELIVERY_CHALLAN',

  DELIVERY_CHALLAN: 'SALES_INVOICE',

};



export const SALES_NEXT_ACTION_LABELS: Readonly<

  Partial<Record<SalesDocumentType, string>>

> = {

  QUOTATION: 'Create order',

  SALES_ORDER: 'Delivery',

  DELIVERY_CHALLAN: 'Invoice',

};



export function isSalesDocumentType(

  value: unknown,

): value is SalesDocumentType {

  return (

    typeof value === 'string' &&

    Object.prototype.hasOwnProperty.call(

      SALES_DOCUMENT_LABELS,

      value,

    )

  );

}



/* =========================================================

   COMMON WORKFLOW TYPES

========================================================= */



export type SalesSupplyType =

  | 'WITHIN_STATE'

  | 'OTHER_STATE';



// A zero-stock product is still a product, not a service.

export type SalesItemKind = 'PRODUCT' | 'SERVICE';



export type SalesDocumentState =

  | 'WORKFLOW'

  | 'ISSUED'

  | 'PART_PAID'

  | 'PAID';



// Preserve the original PaymentMethod union above.

// CREDIT is not an actual receipt/refund method.

export type SalesSettlementMethod =

  | Exclude<PaymentMethod, 'CREDIT'>

  | 'BANK';



export type SalesSnapshotStatus =

  | 'SAVED'

  | 'LEGACY_FALLBACK';



export type SalesInventoryPostingStatus =

  | 'POSTED'

  | 'NOT_APPLICABLE'

  | 'LEGACY_UNVERIFIED';



export interface SalesDocumentReference<

  T extends SalesDocumentType = SalesDocumentType,

> {

  documentType: T;

  id: string;

  documentNumber?: string;

}



// Store the field label as well as its value so an old PDF

// does not change when the business's form configuration changes.

export interface SalesCustomField {

  key: string;

  label: string;

  value: string;

}



export interface SalesPartySnapshot {

  id?: string;

  name: string;

  gstin?: string;

  pan?: string;

  address?: string;

  state?: string;

  mobile?: string;

  email?: string;

  businessType?: string;

}



/* =========================================================

   PDF SETTINGS

   Missing values must not be replaced by APK sample data.

   These fields describe settings; this file does not save them.

========================================================= */



export interface SalesPdfSettings {

  legalName?: string;

  gstin?: string;

  pan?: string;

  address?: string;

  phone?: string;

  email?: string;



  // Embedded image data URI, not an untrusted remote URL.

  logo?: string;

  accentColor?: string;

  template?: 'STANDARD' | 'COMPACT';



  bankName?: string;

  branch?: string;

  accountName?: string;

  accountNo?: string;

  ifsc?: string;

  upi?: string;



  chequePayee?: string;

  chequeInstructions?: string;

  terms?: string;

  footer?: string;

  signatureName?: string;



  showLogo?: boolean;

  showBank?: boolean;

  showCheque?: boolean;

  showHsn?: boolean;

  showGstBreakup?: boolean;

  showSignature?: boolean;

}



/* =========================================================

   LINE INPUT AND CALCULATED AMOUNTS

========================================================= */



export interface SalesWorkflowLineInput {

  productId: string;

  quantity: number;

  unitPrice: number;

  gstRate: number;



  // Fixed monetary discount for this whole line, not a percent.

  discount?: number;



  // Immediate source document's line ID during conversion.

  sourceItemId?: string;

}



// Return amounts and product identity must come from the

// original invoice, not prices supplied by the return form.

export interface SalesReturnLineInput {

  sourceItemId: string;

  quantity: number;

}



export interface SalesCalculatedLine {

  productId: string;

  sourceItemId?: string;

  quantity: number;

  unitPrice: number;

  gstRate: number;

  discount: number;

  taxableAmount: number;

  gstAmount: number;

  cgstAmount: number;

  sgstAmount: number;

  igstAmount: number;

  totalAmount: number;

}



export interface SalesCalculatedTotals {

  items: SalesCalculatedLine[];

  subtotal: number;

  discount: number;

  gstAmount: number;

  cgstAmount: number;

  sgstAmount: number;

  igstAmount: number;

  totalAmount: number;

}



/* =========================================================

   SETTLEMENT INPUT

   Dates use YYYY-MM-DD. Repository validation is still needed.

========================================================= */



export interface SalesSettlementInput {

  amount: number;

  paymentDate: string;

  method: SalesSettlementMethod;

  reference?: string;

  chequeNumber?: string;

  chequeBank?: string;

  chequeDate?: string;

}



/* =========================================================

   CREATE WORKFLOW DOCUMENT

   New API only; the existing CreateSaleInput remains unchanged.

========================================================= */



export interface SalesWorkflowInputBase {

  // Reuse the same ID for retries of the same submission.

  id?: string;



  // Service must verify this matches the active business.

  businessId: string;



  // Omitted customer represents a walk-in sale.

  customerId?: string;

  documentDate: string;

  dueDate?: string;

  supplyType: SalesSupplyType;

  referenceNumber?: string;

  customFields?: SalesCustomField[];

  notes?: string;

}



export type CreateSalesWorkflowInput =

  | (SalesWorkflowInputBase & {

      documentType: 'QUOTATION';

      source?: never;

      items: SalesWorkflowLineInput[];

      payment?: never;

      refund?: never;

    })

  | (SalesWorkflowInputBase & {

      documentType: 'SALES_ORDER';

      source?: SalesDocumentReference<'QUOTATION'>;

      items: SalesWorkflowLineInput[];

      payment?: never;

      refund?: never;

    })

  | (SalesWorkflowInputBase & {

      documentType: 'DELIVERY_CHALLAN';

      source?: SalesDocumentReference<'SALES_ORDER'>;

      items: SalesWorkflowLineInput[];

      payment?: never;

      refund?: never;

    })

  | (SalesWorkflowInputBase & {

      documentType: 'SALES_INVOICE';

      source?: SalesDocumentReference<'DELIVERY_CHALLAN'>;

      items: SalesWorkflowLineInput[];

      payment?: SalesSettlementInput;

      refund?: never;

    })

  | (SalesWorkflowInputBase & {

      documentType: 'SALES_RETURN';

      source: SalesDocumentReference<'SALES_INVOICE'>;

      items: SalesReturnLineInput[];

      payment?: never;

      refund?: SalesSettlementInput;

    });



/* =========================================================

   LOADED DOCUMENTS AND SAVED LINE SNAPSHOTS

========================================================= */



export interface SalesWorkflowDocument {

  id: string;

  businessId: string;

  documentType: SalesDocumentType;

  documentNumber: string;

  customerId?: string;

  customerName: string;

  documentDate: string;

  dueDate?: string;

  referenceNumber?: string;



  // Old sales never stored supply type or component tax values.

  // Null means unknown; do not invent a historical GST split.

  supplyType: SalesSupplyType | null;

  subtotal: number;

  gstAmount: number;

  cgstAmount: number | null;

  sgstAmount: number | null;

  igstAmount: number | null;

  discount: number;

  totalAmount: number;



  // Invoice balances; non-financial documents use zero balances.

  paidAmount: number;

  dueAmount: number;

  returnAmount: number;

  refundedAmount: number;

  customerCredit: number;



  // Null for documents without an invoice payment status.

  paymentStatus: PaymentStatus | null;

  state: SalesDocumentState;



  source: SalesDocumentReference | null;

  nextDocument: SalesDocumentReference | null;

  lineCount: number;



  business: SalesPartySnapshot;

  customer: SalesPartySnapshot;

  customFields: SalesCustomField[];

  pdfSettingsSnapshot: SalesPdfSettings | null;

  snapshotStatus: SalesSnapshotStatus;

  inventoryPostingStatus: SalesInventoryPostingStatus;



  notes?: string;

  createdAt: string;

  updatedAt: string;

}



export interface SalesWorkflowLine {

  id: string;

  documentId: string;

  productId: string;

  productName: string;

  hsn?: string;

  unit?: string;

  itemKind: SalesItemKind | null;

  quantity: number;

  unitPrice: number;

  gstRate: number;

  discount: number;

  taxableAmount: number;

  gstAmount: number;

  cgstAmount: number | null;

  sgstAmount: number | null;

  igstAmount: number | null;

  totalAmount: number;

  sourceItemId?: string;

  position: number;



  // For original invoice lines, these include previous returns.

  returnedQuantity: number;

  returnableQuantity: number;

  snapshotStatus: SalesSnapshotStatus;

  createdAt: string;

}



/* =========================================================

   RECEIPTS AND CUSTOMER REFUNDS

========================================================= */



export type CreateSalesPaymentInput =

  SalesSettlementInput & {

    id?: string;

    businessId: string;

    invoiceId: string;

  } & (

    | {

        direction: 'RECEIPT';

        returnId?: never;

      }

    | {

        direction: 'REFUND';

        returnId: string;

      }

  );



export interface SalesPayment {

  id: string;

  businessId: string;

  invoiceId: string;

  invoiceNumber: string;

  customerId?: string;

  customerName: string;

  direction: 'RECEIPT' | 'REFUND';

  returnId?: string;

  amount: number;

  method: SalesSettlementMethod;

  paymentDate: string;

  reference?: string;

  chequeNumber?: string;

  chequeBank?: string;

  chequeDate?: string;

  createdAt: string;

}



export interface SalesWorkflowDetail {

  document: SalesWorkflowDocument;

  items: SalesWorkflowLine[];

  payments: SalesPayment[];

}



export interface SalesWorkflowSummary {

  invoiceCount: number;

  workflowCount: number;

  grossSales: number;

  returns: number;

  netSales: number;

  received: number;

  refunded: number;

  due: number;

  customerCredit: number;

}
