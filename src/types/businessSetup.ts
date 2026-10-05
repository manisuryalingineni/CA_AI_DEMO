export type PdfLayout =
  | "STANDARD"
  | "COMPACT"
  | "CLASSIC";

export type BusinessSetup = {
  businessId: string;

  /* Business logo */

  logoDataUri: string;

  /* Business identity */

  legalBusinessName: string;

  displayBusinessName: string;

  gstin: string;

  pan: string;

  phone: string;

  email: string;

  address: string;

  /* Numbering & design */

  invoicePrefix: string;

  nextInvoiceNumber: number;

  purchaseBillPrefix: string;

  quotationPrefix: string;

  financialYear: string;

  accentColor: string;

  pdfLayout: PdfLayout;

  /* Bank / UPI */

  bankName: string;

  bankBranch: string;

  accountName: string;

  accountNumber: string;

  ifsc: string;

  upi: string;

  /* Cheque */

  chequePayee: string;

  chequeInstructions: string;

  /* Terms */

  terms: string;

  footerMessage: string;

  signatureName: string;

  /* PDF visibility */

  showBusinessLogo: boolean;

  showBankUpi: boolean;

  showCheque: boolean;

  showHsnSac: boolean;

  showGstBreakup: boolean;

  showSignatureBlock: boolean;

  updatedAt: string;
};