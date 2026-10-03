export type PaymentDocumentType =
  | "SALE"
  | "PURCHASE";

export type PaymentDirection =
  | "RECEIPT"
  | "PAYMENT";

export type PaymentMode =
  | "CASH"
  | "UPI"
  | "BANK"
  | "CARD"
  | "CHEQUE";

export type OpenPaymentDocument = {
  id: string;

  documentType:
    PaymentDocumentType;

  documentNumber:
    string;

  partyName:
    string;

  totalAmount:
    number;

  paidAmount:
    number;

  dueAmount:
    number;
};

export type PaymentRecord = {
  id: string;

  businessId:
    string;

  documentType:
    PaymentDocumentType;

  documentId:
    string;

  documentNumber:
    string;

  partyName:
    string;

  direction:
    PaymentDirection;

  amount:
    number;

  mode:
    PaymentMode;

  paymentDate:
    string;

  reference?: string;

  chequeNumber?: string;

  chequeBank?: string;

  chequeDate?: string;

  createdAt:
    string;
};

export type SavePaymentInput = {
  documentType:
    PaymentDocumentType;

  documentId:
    string;

  amount:
    number;

  mode:
    PaymentMode;

  paymentDate:
    string;

  reference?: string;

  chequeNumber?: string;

  chequeBank?: string;

  chequeDate?: string;
};