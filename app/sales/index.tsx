import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';

import { getBusiness } from '../../src/repositories/businessRepository';
import {
  loadSalesWorkflow,
  loadSalesWorkflowDocument,
  saveSalesPayment,
} from '../../src/services/saleService';
import {
  SALES_DOCUMENT_LABELS,
  SALES_DOCUMENT_TYPES,
  SALES_NEXT_ACTION_LABELS,
  SALES_NEXT_DOCUMENT,
  isSalesDocumentType,
} from '../../src/types/sale';
import type {
  SalesDocumentType,
  SalesPdfSettings,
  SalesSettlementMethod,
  SalesWorkflowDetail,
  SalesWorkflowDocument,
} from '../../src/types/sale';

/*
 * app/sales/index.tsx - complete single-file Sales screen.
 *
 * 01  Page configuration and helpers
 * 02  PDF data types, formatting and document HTML/CSS
 * 03  Active-business loading, Sales page and document cards
 * 04  Full-screen PDF preview and print controls
 * 05  Refund-only modal
 * 06  Page, preview and refund styles
 *
 * The create/convert form stays in app/sales/add.tsx.
 * Financial writes still go through saleService.ts -> saleRepository.ts.
 * No invoice-collection action is implemented on this page.
 * No imports from the previous three PDF/refund helper files are needed.
 */

/* =========================================================
   01. PAGE CONFIGURATION AND HELPERS
========================================================= */

const APP_LOGO = require('../../assets/ca-ai-business.png');

// Set false only when the parent navigator already supplies these tabs.
const SHOW_BOTTOM_NAV = true;
const C = {
  navy: '#08233d',
  navyEnd: '#145784',
  teal: '#07867d',
  background: '#f2f6f8',
  ink: '#12243a',
  muted: '#6b7c8d',
  border: '#dde6ec',
  white: '#fff',
  softTeal: '#e8f4f3',
  notice: '#eaf6ff',
  noticeBorder: '#b9d9ee',
  noticeText: '#164f76',
  green: '#087a59',
  softGreen: '#e4f6ed',
  orange: '#a85e00',
  softOrange: '#fff0d6',
};

const BUSINESS_NAMES: Record<string, string> = {
  RETAIL: 'Retail Shop',
  WHOLESALE: 'Wholesale & Distribution',
  SERVICE: 'Service Business',
  MANUFACTURING: 'Manufacturing',
  RESTAURANT: 'Restaurant & Food',
  CONSTRUCTION: 'Construction',
  TRANSPORT: 'Transport & Logistics',
  ECOMMERCE: 'E-commerce',
  PROFESSIONAL: 'Professional Services',
  HEALTHCARE: 'Healthcare Clinic',
  EDUCATION: 'Education & Training',
  HOTEL: 'Hotel & Hospitality',
  OTHER: 'Other MSME',
};

function businessIdentity(value: unknown): SalesBusinessIdentity | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id.trim()) {
    return null;
  }
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : 'Business',
    gstin: typeof row.gstin === 'string' ? row.gstin : '',
    businessType: String(row.business_type || row.businessType || 'OTHER'),
  };
}

function businessLabel(type: string): string {
  return BUSINESS_NAMES[type.toUpperCase().replace(/[^A-Z0-9]/g, '')] || type;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    const browser = globalThis as typeof globalThis & { alert?: (value: string) => void };
    browser.alert?.(`${title}\n\n${message}`);
  }
  else {
    Alert.alert(title, message);
  }
}

function documentIcon(type: SalesDocumentType): string {
  switch (type) {
    case 'QUOTATION': return '\uD83D\uDCC4';
    case 'SALES_ORDER': return '\uD83E\uDDFE';
    case 'DELIVERY_CHALLAN': return '\uD83D\uDE9A';
    case 'SALES_INVOICE': return '\uD83E\uDDFE';
    case 'SALES_RETURN': return '\u21A9\uFE0F';
  }
}

/* =========================================================
   02. PDF DATA, FORMATTERS, TEMPLATE AND PRINT CSS
========================================================= */

/*
 * Sales document rendering only. No database writes or payment operations.
 * All displayed amounts come from the saved document and saved item rows.
 */
type SalesBusinessIdentity = {
  id: string;
  name: string;
  gstin: string;
  businessType: string;
};

type SalesPdfPreviewData = {
  html: string;
  businessId: string;
  documentId: string;
  documentType: SalesDocumentType;
  documentNumber: string;
  title: string;
  subtitle: string;
};

function formatSalesMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '\u2014';
  }
  return `\u20B9${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isSalesDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatSalesDate(value?: string): string {
  if (!value) {
    return '\u2014';
  }
  if (!isSalesDate(value)) {
    return value;
  }
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function salesDocumentKey(document: SalesWorkflowDocument): string {
  return `${document.businessId}:${document.documentType}:${document.id}`;
}

function salesDocumentStatus(document: SalesWorkflowDocument): string {
  if (document.documentType === 'SALES_RETURN') {
    return 'RETURN';
  }
  if (document.documentType !== 'SALES_INVOICE') {
    return 'WORKFLOW';
  }
  if (document.customerCredit > 0) {
    return 'CUSTOMER CREDIT';
  }
  if (document.returnAmount > 0 && document.returnAmount >= document.totalAmount) {
    return 'RETURNED';
  }
  if (document.paymentStatus === 'PAID' || document.dueAmount === 0) {
    return 'PAID';
  }
  return document.paymentStatus === 'PARTIAL' ? 'PART PAID' : 'DUE';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function financialYear(value: string): string {
  if (!isSalesDate(value)) {
    return '\u2014';
  }
  const year = Number(value.slice(0, 4));
  const start = Number(value.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function amount(value: number | null | undefined): string {
  return escapeHtml(formatSalesMoney(value));
}

function quantity(value: number): string {
  return Number.isFinite(value)
    ? escapeHtml(value.toLocaleString('en-IN', { maximumFractionDigits: 6 }))
    : '&mdash;';
}

// Embedded, static SVG paths stay sharp in the preview and PDF.
function paymentIcon(kind: 'bank' | 'cheque'): string {
  const path = kind === 'bank'
    ? '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 14h4"/>'
    : '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function bankDetails(settings: SalesPdfSettings): string {
  const lines: string[] = [];
  if (text(settings.bankName)) {
    lines.push(escapeHtml(settings.bankName));
  }
  if (text(settings.branch)) {
    lines.push(escapeHtml(settings.branch));
  }
  if (text(settings.accountName)) {
    lines.push(`A/c name: ${escapeHtml(settings.accountName)}`);
  }
  if (text(settings.accountNo)) {
    lines.push(`A/c: ${escapeHtml(settings.accountNo)}`);
  }
  if (text(settings.ifsc)) {
    lines.push(`IFSC: ${escapeHtml(settings.ifsc)}`);
  }
  if (text(settings.upi)) {
    lines.push(`UPI: ${escapeHtml(settings.upi)}`);
  }
  return lines.length
    ? lines.join('<br>')
    : 'Add your business bank account and UPI details here.';
}

function settlementHtml(document: SalesWorkflowDocument): string {
  if (document.documentType === 'SALES_INVOICE') {
    const details = [
      `Paid <b>${amount(document.paidAmount)}</b>`,
      `Due <b class="${document.dueAmount > 0 ? 'due' : ''}">${amount(document.dueAmount)}</b>`,
    ];
    if (document.returnAmount > 0) {
      details.push(`Returned <b>${amount(document.returnAmount)}</b>`);
    }
    if (document.refundedAmount > 0) {
      details.push(`Refunded <b>${amount(document.refundedAmount)}</b>`);
    }
    if (document.customerCredit > 0) {
      details.push(`Customer credit <b>${amount(document.customerCredit)}</b>`);
    }
    return `<div class="settlement">${details.map(value => `<span>${value}</span>`).join('<span class="dot">&middot;</span>')}</div>`;
  }
  if (document.documentType === 'SALES_RETURN') {
    return `<div class="settlement"><span>Refunded <b>${amount(document.refundedAmount)}</b></span></div>`;
  }
  return '<div class="settlement">Workflow document</div>';
}

/* Document layout. Phone preview and print use the same structure, with
 * separate sizing rules for a narrow screen and a physical A4 page. */
const DOCUMENT_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
  }
  body {
    background: #edf4f6;
    color: #18313f;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    -webkit-text-size-adjust: 100%;
  }
  .page-background {
    padding: 10px;
  }
  .paper {
    max-width: 820px;
    margin: 0 auto;
    padding: 30px;
    background: #fff;
    border: 1px solid #d8e2e5;
    border-radius: 18px;
    box-shadow: 0 2px 9px #153b4c16;
  }
  .business-header {
    display: flex;
    align-items: flex-start;
    gap: 18px;
  }
  .business {
    flex: 1;
    min-width: 0;
  }
  .business-name {
    margin: 0;
    color: #113044;
    font-size: 36px;
    font-weight: 800;
    line-height: 1.12;
    overflow-wrap: anywhere;
  }
  .business-contact {
    margin-top: 13px;
    color: #66737a;
    overflow-wrap: anywhere;
  }
  .business-logo {
    max-width: 56px;
    max-height: 56px;
    margin-bottom: 8px;
  }
  .document-heading {
    flex: 0 1 38%;
    min-width: 0;
    text-align: right;
    padding-top: 2px;
  }
  .document-type {
    color: var(--accent);
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
  }
  .document-number {
    color: #113044;
    font-size: 24px;
    font-weight: 800;
    line-height: 1.2;
    margin-top: 6px;
    overflow-wrap: anywhere;
  }
  .rule {
    height: 4px;
    background: var(--accent);
    margin: 26px 0 22px;
  }
  .info-grid, .payment-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .info-grid {
    margin-bottom: 22px;
  }
  .info-card {
    background: #eff9f7;
    border: 1px solid #cae3de;
    border-radius: 13px;
    padding: 17px;
    min-height: 128px;
    min-width: 0;
  }
  .eyebrow {
    color: #74858b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .party-name {
    font-size: 17px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .party-detail {
    color: #6b787d;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }
  .detail-row {
    color: #6b787d;
    margin-top: 5px;
    overflow-wrap: anywhere;
  }
  .detail-row b {
    color: #213944;
  }
  .references {
    padding: 12px 15px;
    background: #f5faf9;
    border: 1px solid #dbe9e5;
    border-radius: 10px;
    margin: 0 0 20px;
    overflow-wrap: anywhere;
  }
  .reference-row + .reference-row {
    margin-top: 5px;
  }
  .items-wrap {
    border: 1px solid #d0d9dc;
    border-radius: 11px;
    overflow: hidden;
    margin-bottom: 22px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  thead {
    background: #edf7f5;
  }
  th {
    font-size: 11px;
    font-weight: 700;
    padding: 13px 9px;
    text-align: left;
  }
  td {
    border-top: 1px solid #dfe4e6;
    padding: 13px 9px;
    vertical-align: middle;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .center {
    text-align: center;
  }
  .right {
    text-align: right;
  }
  .item-name, .strong {
    font-weight: 700;
  }
  .item-sub, .unit {
    font-size: 10px;
    color: #849096;
    margin-top: 4px;
  }
  .unit {
    display: block;
  }
  .totals {
    background: #fcfdfd;
    border: 1px solid #dde2e5;
    border-radius: 13px;
    padding: 18px;
    margin-bottom: 24px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0;
    color: #6c7a80;
  }
  .total-row b {
    color: #263f4a;
    text-align: right;
    overflow-wrap: anywhere;
  }
  .total-rule {
    height: 1px;
    background: #d9dfe2;
    margin: 16px 0;
  }
  .grand-total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    color: #123044;
    font-size: 22px;
    font-weight: 800;
  }
  .grand-amount {
    text-align: right;
    font-size: 27px;
    overflow-wrap: anywhere;
  }
  .settlement {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 15px;
    color: #748088;
    font-size: 11px;
  }
  .settlement b {
    color: #2b414c;
  }
  .settlement b.due {
    color: #a17716;
  }
  .dot {
    color: #b3bbc0;
  }
  .payment-grid {
    margin-bottom: 26px;
  }
  .payment-grid.single {
    grid-template-columns: minmax(0, 1fr);
  }
  .payment-card {
    border: 1px solid #d2dadd;
    border-radius: 13px;
    padding: 14px;
    min-height: 130px;
    display: flex;
    gap: 11px;
    min-width: 0;
  }
  .payment-icon {
    flex: 0 0 34px;
    height: 34px;
    border-radius: 9px;
    background: #eaf7f3;
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .payment-icon svg {
    width: 21px;
    height: 21px;
  }
  .payment-copy {
    flex: 1;
    min-width: 0;
  }
  .payment-title {
    font-weight: 700;
    margin: 0 0 5px;
  }
  .payment-text {
    color: #7b858b;
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .business-note {
    margin: 0 0 20px;
    overflow-wrap: anywhere;
  }
  .section-title {
    color: #173343;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .terms {
    color: #69767c;
    overflow-wrap: anywhere;
  }
  .thanks {
    margin-top: 22px;
    font-weight: 700;
    color: #263e46;
  }
  .signature {
    margin-top: 64px;
    text-align: right;
    break-inside: avoid;
  }
  .signature strong {
    display: block;
  }
  .signature div {
    color: #7b8489;
    margin-top: 3px;
    overflow-wrap: anywhere;
  }
  .footer-note, .legacy-note {
    font-size: 9px;
    color: #818c91;
    margin-top: 18px;
    overflow-wrap: anywhere;
  }
  .legacy-note {
    padding: 10px;
    border: 1px solid #dfd6bb;
    background: #fffcf4;
    margin-bottom: 12px;
  }

  @media screen and (max-width: 560px) {
    body {
      font-size: 10px;
    }
    .page-background {
      padding: 0 9px 8px;
    }
    .paper {
      padding: 20px 14px 14px;
      border-radius: 13px;
    }
    .business-header {
      gap: 12px;
    }
    .business-name {
      font-size: 26px;
    }
    .business-contact {
      font-size: 10px;
      margin-top: 10px;
    }
    .document-type {
      font-size: 8px;
      letter-spacing: .7px;
    }
    .document-number {
      font-size: 17px;
      margin-top: 5px;
    }
    .rule {
      height: 3px;
      margin: 16px 0 13px;
    }
    .info-grid, .payment-grid {
      gap: 8px;
    }
    .info-grid {
      margin-bottom: 13px;
    }
    .info-card {
      min-height: 82px;
      padding: 10px;
      border-radius: 9px;
    }
    .eyebrow {
      font-size: 7.5px;
      letter-spacing: .8px;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 11px;
    }
    .party-detail, .detail-row {
      font-size: 9px;
      margin-top: 3px;
    }
    .items-wrap {
      margin-bottom: 14px;
      border-radius: 8px;
    }
    th {
      padding: 10px 6px;
      font-size: 7.5px;
    }
    td {
      padding: 9px 6px;
      font-size: 8px;
    }
    .item-name {
      font-size: 8.5px;
    }
    .item-sub, .unit {
      font-size: 7px;
      margin-top: 3px;
    }
    .totals {
      border-radius: 9px;
      padding: 10px;
      margin-bottom: 16px;
    }
    .total-row {
      margin: 6px 0;
    }
    .total-rule {
      margin: 10px 0;
    }
    .grand-total {
      font-size: 14px;
    }
    .grand-amount {
      font-size: 17px;
    }
    .settlement {
      font-size: 8px;
      gap: 6px;
      margin-top: 10px;
    }
    .payment-grid {
      margin-bottom: 17px;
    }
    .payment-card {
      min-height: 83px;
      padding: 9px;
      gap: 7px;
      border-radius: 9px;
    }
    .payment-icon {
      flex-basis: 25px;
      height: 25px;
      border-radius: 8px;
    }
    .payment-icon svg {
      width: 17px;
      height: 17px;
    }
    .payment-title {
      font-size: 9.5px;
      margin-bottom: 3px;
    }
    .payment-text {
      font-size: 8px;
    }
    .references {
      padding: 9px;
      margin-bottom: 13px;
    }
    .section-title, .thanks, .signature {
      font-size: 10px;
    }
    .thanks {
      margin-top: 13px;
    }
    .signature {
      margin-top: 40px;
    }
    .signature div {
      font-size: 9px;
    }
    .footer-note, .legacy-note {
      font-size: 6.5px;
    }
  }

  @media print {
    html, body {
      background: #fff;
    }
    body {
      font-size: 10.5pt;
    }
    .page-background {
      padding: 0;
    }
    .paper {
      max-width: none;
      padding: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .business-name {
      font-size: 27pt;
    }
    .document-number {
      font-size: 20pt;
    }
    .items-wrap {
      overflow: visible;
      border-radius: 0;
    }
    thead {
      display: table-header-group;
    }
    tr, .info-card, .totals, .payment-card, .signature {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .info-grid, .payment-grid {
      break-inside: avoid;
    }
    .signature {
      margin-top: 38px;
    }
    .rule, .info-card, thead, .payment-icon, .totals {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

function buildSalesDocumentPdf(detail: SalesWorkflowDetail, currentBusiness: SalesBusinessIdentity): SalesPdfPreviewData {
  const document = detail.document;
  if (document.businessId !== currentBusiness.id) {
    throw new Error('The sales document does not belong to the active business.');
  }
  const settings = document.pdfSettingsSnapshot ?? {};
  const legacy = document.snapshotStatus !== 'SAVED';
  const business = document.business;
  const customer = document.customer;
  const title = SALES_DOCUMENT_LABELS[document.documentType];
  const isInvoice = document.documentType === 'SALES_INVOICE';
  // Do not replace a saved snapshot with today's master data.
  const businessName = text(settings.legalName) ||
    (legacy && (!text(business.name) || business.name === 'Business')
      ? currentBusiness.name
      : text(business.name)) || 'Business';
  const gstin = text(settings.gstin) || text(business.gstin) ||
    (legacy ? currentBusiness.gstin : '');
  const customerName = text(document.customerName) || text(customer.name) || 'Walk-in Customer';
  const contact = [
    text(settings.address) || text(business.address),
    [gstin ? `GSTIN ${gstin}` : '', (text(settings.pan) || text(business.pan))
      ? `PAN ${text(settings.pan) || text(business.pan)}` : ''].filter(Boolean).join(' \u2022 '),
    [text(settings.phone) || text(business.mobile), text(settings.email) || text(business.email)]
      .filter(Boolean).join(' \u2022 '),
  ].filter(Boolean);
  const customerContact = [
    text(customer.gstin) ? `GSTIN ${text(customer.gstin)}` : '',
    text(customer.address), text(customer.state), text(customer.mobile),
  ].filter(Boolean);
  const rows = detail.items.map(line => `
    <tr>
      <td>
        <div class="item-name">${escapeHtml(line.productName)}</div>
        ${settings.showHsn !== false && line.hsn ? `<div class="item-sub">HSN: ${escapeHtml(line.hsn)}</div>` : ''}
        ${line.discount > 0 ? `<div class="item-sub">Discount: ${amount(line.discount)}</div>` : ''}
      </td>
      <td class="center">${quantity(line.quantity)}${line.unit ? `<span class="unit">${escapeHtml(line.unit)}</span>` : ''}</td>
      <td class="right">${amount(line.unitPrice)}</td>
      <td class="center">${quantity(line.gstRate)}%</td>
      <td class="right strong">${amount(line.totalAmount)}</td>
    </tr>`).join('');
  const details = [
    `<div class="detail-row">Date: <b>${escapeHtml(formatSalesDate(document.documentDate))}</b></div>`,
    document.dueDate ? `<div class="detail-row">${document.documentType === 'QUOTATION' ? 'Valid until' : 'Due'}: <b>${escapeHtml(formatSalesDate(document.dueDate))}</b></div>` : '',
    `<div class="detail-row">FY: <b>${escapeHtml(financialYear(document.documentDate))}</b></div>`,
    `<div class="detail-row">Status: <b>${escapeHtml(salesDocumentStatus(document))}</b></div>`,
  ].join('');
  const references = document.customFields.filter(field => text(field.value))
    .map(field => `<div class="reference-row"><b>${escapeHtml(field.label)}:</b> ${multiline(field.value)}</div>`);
  if (document.referenceNumber) {
    references.unshift(`<div class="reference-row"><b>Reference:</b> ${escapeHtml(document.referenceNumber)}</div>`);
  }
  if (document.source) {
    references.unshift(`<div class="reference-row"><b>${document.documentType === 'SALES_RETURN' ? 'Original invoice' : 'Source document'}:</b> ${escapeHtml(document.source.documentNumber || document.source.id)}</div>`);
  }
  // The combined GST row is the screenshot default. Split only known values
  // when the saved settings explicitly request a component breakdown.
  const taxRows: string[] = [];
  if (settings.showGstBreakup === true && document.supplyType === 'WITHIN_STATE' &&
    document.cgstAmount !== null && document.sgstAmount !== null) {
    taxRows.push(`<div class="total-row"><span>CGST</span><b>${amount(document.cgstAmount)}</b></div>`);
    taxRows.push(`<div class="total-row"><span>SGST</span><b>${amount(document.sgstAmount)}</b></div>`);
  }
  else {
    taxRows.push(`<div class="total-row"><span>${document.supplyType === 'OTHER_STATE' ? 'IGST' : 'GST'}</span><b>${amount(document.gstAmount)}</b></div>`);
  }
  const paymentCards: string[] = [];
  if (settings.showBank !== false) {
    paymentCards.push(`<div class="payment-card"><div class="payment-icon">${paymentIcon('bank')}</div><div class="payment-copy"><div class="payment-title">Bank / UPI payment</div><div class="payment-text">${bankDetails(settings)}</div></div></div>`);
  }
  if (settings.showCheque !== false) {
    paymentCards.push(`<div class="payment-card"><div class="payment-icon">${paymentIcon('cheque')}</div><div class="payment-copy"><div class="payment-title">Cheque information</div><div class="payment-text">Payee: ${escapeHtml(text(settings.chequePayee) || 'Account Payee only.')}<br>${multiline(text(settings.chequeInstructions) || 'Mention invoice number behind the cheque.')}</div></div></div>`);
  }
  const accent = /^#[0-9a-f]{6}$/i.test(text(settings.accentColor))
    ? text(settings.accentColor) : '#0b9388';
  const logo = settings.showLogo !== false &&
    /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(settings.logo ?? '') &&
    (settings.logo?.length ?? 0) <= 2000000
    ? `<img class="business-logo" alt="Business logo" src="${escapeHtml(settings.logo)}">` : '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(document.documentNumber)}</title>
  <style>:root { --accent: ${accent}; }${DOCUMENT_CSS}</style>
</head>
<body>
  <div class="page-background">
    <main class="paper">
      <section class="business-header">
        <div class="business">
          ${logo}
          <h1 class="business-name">${escapeHtml(businessName)}</h1>
          <div class="business-contact">${contact.map(multiline).join('<br>')}</div>
        </div>
        <div class="document-heading">
          <div class="document-type">${escapeHtml(title)}</div>
          <div class="document-number">${escapeHtml(document.documentNumber)}</div>
        </div>
      </section>
      <div class="rule"></div>
      <section class="info-grid">
        <div class="info-card">
          <div class="eyebrow">${isInvoice ? 'BILL TO' : 'CUSTOMER'}</div>
          <div class="party-name">${escapeHtml(customerName)}</div>
          <div class="party-detail">${customerContact.length ? customerContact.map(multiline).join('<br>') : 'Customer / Walk-in party'}</div>
        </div>
        <div class="info-card">
          <div class="eyebrow">${isInvoice ? 'INVOICE DETAILS' : 'DOCUMENT DETAILS'}</div>
          ${details}
        </div>
      </section>
      ${references.length ? `<section class="references">${references.join('')}</section>` : ''}
      <section class="items-wrap">
        <table>
          <colgroup><col style="width:40%"><col style="width:10%"><col style="width:18%"><col style="width:11%"><col style="width:21%"></colgroup>
          <thead><tr><th>Item / Service</th><th class="center">Qty</th><th class="right">Rate</th><th class="center">GST</th><th class="right">Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No saved item rows found.</td></tr>'}</tbody>
        </table>
      </section>
      <section class="totals">
        <div class="total-row"><span>Taxable value</span><b>${amount(document.subtotal)}</b></div>
        ${taxRows.join('')}
        ${document.discount > 0 ? `<div class="total-row"><span>Discount (included above)</span><b>${amount(document.discount)}</b></div>` : ''}
        <div class="total-rule"></div>
        <div class="grand-total"><span>Grand total</span><span class="grand-amount">${amount(document.totalAmount)}</span></div>
        ${settlementHtml(document)}
      </section>
      ${document.notes ? `<section class="business-note"><div class="section-title">Business note</div><div class="terms">${multiline(document.notes)}</div></section>` : ''}
      ${paymentCards.length ? `<section class="payment-grid ${paymentCards.length === 1 ? 'single' : ''}">${paymentCards.join('')}</section>` : ''}
      <section>
        <div class="section-title">Terms &amp; Conditions</div>
        <div class="terms">${multiline(text(settings.terms) || 'Payment due as stated. Goods once sold are subject to the stated return policy.')}</div>
        <div class="thanks">${multiline(text(settings.footer) || 'Thank you for your business.')}</div>
      </section>
      ${settings.showSignature !== false ? `<section class="signature"><strong>${escapeHtml(text(settings.signatureName) || 'Authorised Signatory')}</strong><div>For ${escapeHtml(businessName)}</div></section>` : ''}
      ${legacy ? '<div class="legacy-note">Legacy document: some historical identity, item or tax details were not saved. Current master details may be used where available; saved monetary amounts are unchanged.</div>' : ''}
      <div class="footer-note">Computer-generated document; verify legal and tax details before live use.</div>
    </main>
  </div>
</body>
</html>`;
  return {
    html,
    businessId: document.businessId,
    documentId: document.id,
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    title,
    subtitle: `${document.documentNumber} \u2022 ${customerName}`,
  };
}

/* =========================================================
   03. SALES DATA, PAGE AND WORKFLOW CARDS
========================================================= */

/* Loading is scoped to the active business. Late results are discarded
 * after navigation, a newer request, or an active-business change. */
function useSalesDocuments() {
  const [business, setBusiness] = useState<SalesBusinessIdentity | null>(null);
  const [documents, setDocuments] = useState<SalesWorkflowDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const request = useRef(0);
  const reload = useCallback(async (pullToRefresh = false) => {
    const token = ++request.current;
    const currentRequest = () => focused.current && token === request.current;
    setReady(false);
    setRefreshing(pullToRefresh);
    setError(null);
    try {
      const current = businessIdentity(await getBusiness());
      if (!currentRequest()) {
        return;
      }
      setBusiness(current);
      setDocuments(rows => current ? rows.filter(row => row.businessId === current.id) : []);
      if (!current) {
        return;
      }
      const rows = await loadSalesWorkflow();
      const stillActive = businessIdentity(await getBusiness());
      if (!currentRequest()) {
        return;
      }
      if (stillActive?.id !== current.id || rows.some(row => row.businessId !== current.id)) {
        setDocuments([]);
        throw new Error('The active business changed. Tap Retry to reload Sales.');
      }
      setDocuments(rows);
    } catch (loadError) {
      if (currentRequest()) {
        setError(errorText(loadError));
      }
    } finally {
      if (currentRequest()) {
        setReady(true);
        setRefreshing(false);
      }
    }
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void reload();
    return () => { focused.current = false; request.current += 1; };
  }, [reload]));
  return {
    business,
    documents,
    ready,
    refreshing,
    error,
    reload,
    focused
  };
}
/* =========================================================
   SALES SCREEN: list, navigation, PDF and refund actions
========================================================= */

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { business, documents, ready, refreshing, error, reload, focused } = useSalesDocuments();
  const params = useLocalSearchParams<{
    openPdfType?: string | string[];
    openPdfId?: string | string[];
  }>();
  const [preview, setPreview] = useState<SalesPdfPreviewData | null>(null);
  const [refundDocument, setRefundDocument] = useState<SalesWorkflowDocument | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const openRequest = useRef(0);
  const openLock = useRef(false);
  const autoOpened = useRef('');
  const canUsePage = ready && !!business && !error;
  useFocusEffect(useCallback(() => {
    setPreview(null);
    setRefundDocument(null);
    setOpeningKey(null);
    openLock.current = false;
    return () => { openRequest.current += 1; openLock.current = false; };
  }, []));
  const openForm = useCallback((type: SalesDocumentType, source?: SalesWorkflowDocument) => {
    if (!canUsePage || !business || (source && source.businessId !== business.id)) {
      return;
    }
    router.push({
      pathname: '/sales/add',
      params: source
        ? {
          type,
          sourceType: source.documentType,
          sourceId: source.id
        }
        : { type },
    });
  }, [canUsePage, business]);
  const openPdf = useCallback(async (type: SalesDocumentType, id: string) => {
    if (!canUsePage || !business || openLock.current) {
      return;
    }
    const token = ++openRequest.current;
    openLock.current = true;
    setOpeningKey(`${business.id}:${type}:${id}`);
    try {
      const detail = await loadSalesWorkflowDocument(type, id);
      const current = businessIdentity(await getBusiness());
      if (!focused.current || token !== openRequest.current) {
        return;
      }
      if (!current || current.id !== business.id) {
        throw new Error('The active business changed. Reopen the document.');
      }
      if (!detail || detail.document.businessId !== current.id ||
        detail.document.id !== id || detail.document.documentType !== type) {
        throw new Error('The saved sales document could not be loaded.');
      }
      setPreview(buildSalesDocumentPdf(detail, current));
    } catch (loadError) {
      if (focused.current && token === openRequest.current) {
        notify('Unable to open PDF', errorText(loadError));
      }
    } finally {
      if (token === openRequest.current) {
        openLock.current = false;
        setOpeningKey(null);
      }
    }
  }, [canUsePage, business, focused]);
  // Optional links from Dashboard can open a saved sales document directly.
  const rawPdfType = Array.isArray(params.openPdfType) ? params.openPdfType[0] : params.openPdfType;
  const rawPdfId = Array.isArray(params.openPdfId) ? params.openPdfId[0] : params.openPdfId;
  useEffect(() => {
    if (!rawPdfId) { autoOpened.current = ''; return; }
    if (!canUsePage || !business || openingKey || !rawPdfId || !isSalesDocumentType(rawPdfType)) {
      return;
    }
    const key = `${business.id}:${rawPdfType}:${rawPdfId}`;
    if (autoOpened.current === key) {
      return;
    }
    autoOpened.current = key;
    void openPdf(rawPdfType, rawPdfId);
    router.setParams({ openPdfType: '', openPdfId: '' });
  }, [canUsePage, business, openingKey, rawPdfType, rawPdfId, openPdf]);
  const invoiceById = useMemo(() => new Map(documents
    .filter(document => document.documentType === 'SALES_INVOICE')
    .map(document => [document.id, document])), [documents]);
  return (
    <View style={pageStyles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient
        colors={[C.navy, C.navyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[pageStyles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={pageStyles.headerInner}>
          <Image source={APP_LOGO} style={pageStyles.logo} resizeMode="contain" />
          <View style={pageStyles.headerText}>
            <Text style={pageStyles.appTitle} numberOfLines={1} adjustsFontSizeToFit>CA AI Business v4.2</Text>
            <Text style={pageStyles.appSubtitle} numberOfLines={1}>{business ? `${business.name} \u2022 ${businessLabel(business.businessType)}` : 'Select a business'}</Text>
          </View>
          <View style={pageStyles.rolePill}>
            <Text style={pageStyles.roleText} numberOfLines={1}>{'\uD83D\uDC64'} Business Owner</Text>
          </View>
        </View>
      </LinearGradient>
      <FlatList
        data={documents}
        keyExtractor={salesDocumentKey}
        renderItem={({ item }) => (<SalesDocumentCard
          document={item}
          originalInvoice={item.source ? invoiceById.get(item.source.id) : undefined}
          disabled={!canUsePage || openingKey !== null}
          opening={openingKey === salesDocumentKey(item)}
          onPdf={() => void openPdf(item.documentType, item.id)}
          onConvert={type => openForm(type, item)}
          onNext={() => {
            if (item.nextDocument) {
              void openPdf(item.nextDocument.documentType, item.nextDocument.id);
            }
          }}
          onRefund={() => { if (canUsePage && !openLock.current) setRefundDocument(item); }}
        />)}
        ItemSeparatorComponent={() => <View style={pageStyles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[pageStyles.content, { paddingBottom: insets.bottom + (SHOW_BOTTOM_NAV ? 110 : 28) }]}
        refreshControl={<RefreshControl
          refreshing={refreshing}
          onRefresh={() => void reload(true)}
          tintColor={C.teal}
        />}
        ListHeaderComponent={<View>
          <View style={pageStyles.flowHeader}>
            <View style={pageStyles.flowText}>
              <Text style={pageStyles.flowTitle} numberOfLines={1} adjustsFontSizeToFit>Complete sales flow</Text>
              <Text style={pageStyles.flowSubtitle}>{'Quotation \u2192 order \u2192 delivery \u2192 invoice'}</Text>
            </View>
            <Pressable
              style={[pageStyles.startButton, !canUsePage && pageStyles.disabled]}
              disabled={!canUsePage}
              onPress={() => openForm('QUOTATION')}
            >
              <Text style={pageStyles.startText}>Start flow</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pageStyles.documentActions}
          >
            {SALES_DOCUMENT_TYPES.map(type => (<Pressable
              key={type}
              style={pageStyles.documentAction}
              disabled={!canUsePage}
              onPress={() => openForm(type)}
            >
              <Text style={pageStyles.documentActionText}>+ {SALES_DOCUMENT_LABELS[type]}</Text>
            </Pressable>))}
          </ScrollView>
          <View style={pageStyles.notice}>
            <Text style={pageStyles.noticeText}>Only the final sales invoice posts receivable, output GST and stock. Earlier documents convert forward without re-entry.</Text>
          </View>

          {error && (<View style={pageStyles.notice}>
            <Text style={pageStyles.noticeText}>{error}</Text>
            <Pressable style={pageStyles.retryButton} onPress={() => void reload()}>
              <Text style={pageStyles.pdfButtonText}>Retry</Text>
            </Pressable>
          </View>)}
        </View>}
        ListEmptyComponent={ready && !error ? (<View style={pageStyles.emptyCard}>
          <Text style={pageStyles.emptyIcon}>{'\uD83E\uDDFE'}</Text>
          <Text style={pageStyles.emptyTitle}>{business ? 'No sales documents yet' : 'Business setup required'}</Text>
          <Text style={pageStyles.emptyText}>{business ? 'Start with a quotation or choose the document you need.' : 'Select your business before creating sales documents.'}</Text>
        </View>) : null}
      />
      {SHOW_BOTTOM_NAV && (<View style={[pageStyles.bottomNavigation, { bottom: Math.max(8, insets.bottom) }]}>
        <NavItem label="Home" icon={'\u2302'} onPress={() => router.replace('/dashboard')} />
        <NavItem
          label="Sales"
          icon={'\uD83E\uDDFE'}
          active
          onPress={() => { }}
        />
        <NavItem label="Purchases" icon={'\uD83D\uDCE5'} onPress={() => router.push('/purchases')} />
        <NavItem label="More" icon={'\u25A6'} onPress={() => router.push('/more')} />
      </View>)}

      {preview && <SalesPdfPreview
        key={`${preview.businessId}:${preview.documentType}:${preview.documentId}`}
        preview={preview}
        onClose={() => setPreview(null)}
      />}

      {refundDocument && <SalesRefundModal
        key={salesDocumentKey(refundDocument)}
        document={refundDocument}
        onClose={() => setRefundDocument(null)}
        onSaved={() => { setRefundDocument(null); void reload(); }}
      />}
    </View>);
}

/* Document cards and bottom navigation. */
const SalesDocumentCard = memo(function SalesDocumentCard({ document, originalInvoice, disabled, opening, onPdf, onConvert, onNext, onRefund }: {
  document: SalesWorkflowDocument;
  originalInvoice?: SalesWorkflowDocument;
  disabled: boolean;
  opening: boolean;
  onPdf: () => void;
  onConvert: (type: SalesDocumentType) => void;
  onNext: () => void;
  onRefund: () => void;
}) {
  const nextType = SALES_NEXT_DOCUMENT[document.documentType];
  const isInvoice = document.documentType === 'SALES_INVOICE';
  const isReturn = document.documentType === 'SALES_RETURN';
  const status = salesDocumentStatus(document);
  const badge = isInvoice
    ? (document.dueAmount > 0 ? `${formatSalesMoney(document.dueAmount)} DUE` : status)
    : isReturn
      ? (document.refundedAmount > 0 ? `${formatSalesMoney(document.refundedAmount)} REFUNDED` : 'RETURN RECORDED')
      : 'WORKFLOW DOCUMENT';
  const warning = isInvoice && document.dueAmount > 0;
  const canRefund = isReturn && document.source?.documentType === 'SALES_INVOICE' && !!originalInvoice &&
    originalInvoice.businessId === document.businessId &&
    originalInvoice.customerCredit > 0.005 &&
    document.totalAmount - document.refundedAmount > 0.005;
  return (
    <View style={pageStyles.documentCard}>
      <View style={pageStyles.documentIcon}>
        <Text style={pageStyles.documentIconText}>{documentIcon(document.documentType)}</Text>
      </View>
      <Pressable
        style={pageStyles.documentMain}
        disabled={disabled}
        onPress={onPdf}
        accessibilityRole="button"
        accessibilityLabel={`View ${document.documentNumber}`}
      >
        <Text style={pageStyles.documentNumber} numberOfLines={2}>{document.documentNumber} {'\u2022'} {document.customerName}</Text>
        <Text style={pageStyles.documentMeta} numberOfLines={2}>{SALES_DOCUMENT_LABELS[document.documentType]} {'\u2022'} {document.documentDate} {'\u2022'} {document.lineCount} line(s)</Text>
        <View style={[pageStyles.badge, warning ? pageStyles.badgeWarning : pageStyles.badgeGood]}>
          <Text style={[pageStyles.badgeText, warning ? pageStyles.badgeWarningText : pageStyles.badgeGoodText]}>{badge}</Text>
        </View>
      </Pressable>
      <View style={pageStyles.documentRight}>
        <Text style={pageStyles.documentAmount} numberOfLines={1} adjustsFontSizeToFit>{formatSalesMoney(document.totalAmount)}</Text>
        <Text style={pageStyles.documentState}>{isInvoice ? (status === 'DUE' ? 'ISSUED' : status) : isReturn ? 'ISSUED' : 'WORKFLOW'}</Text>
        <View style={pageStyles.cardActions}>
          <Pressable
            style={[pageStyles.pdfButton, opening && pageStyles.disabled]}
            onPress={onPdf}
            disabled={disabled}
          >
            <Text style={pageStyles.pdfButtonText}>{opening ? '...' : 'PDF'}</Text>
          </Pressable>

          {nextType && !document.nextDocument && <Pressable
            style={pageStyles.convertButton}
            disabled={disabled}
            onPress={() => onConvert(nextType)}
          >
            <Text style={pageStyles.convertText}>{SALES_NEXT_ACTION_LABELS[document.documentType]}</Text>
          </Pressable>}

          {document.nextDocument && <Pressable style={pageStyles.convertButton} disabled={disabled} onPress={onNext}>
            <Text style={pageStyles.convertText}>View next</Text>
          </Pressable>}

          {canRefund && <Pressable style={pageStyles.convertButton} disabled={disabled} onPress={onRefund}>
            <Text style={pageStyles.convertText}>Refund</Text>
          </Pressable>}
        </View>
      </View>
    </View>);
});

/* The same compact bottom-navigation dimensions as Purchases. */
function NavItem({ label, icon, active = false, onPress }: {
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[pageStyles.navButton, active && pageStyles.navButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={pageStyles.navIcon}>{icon}</Text>
      <Text style={active ? pageStyles.navActiveText : pageStyles.navText}>{label}</Text>
    </Pressable>);
}



/* =========================================================
   04. FULL-SCREEN PDF PREVIEW
========================================================= */

/* Full-screen document review. App navigation stays behind this modal.
 * Only the HTML document is printed; the app's toolbar is never printed. */
type PdfPreviewProps = {
  preview: SalesPdfPreviewData;
  onClose: () => void;
};

function SalesPdfPreview({ preview, onClose }: PdfPreviewProps) {
  const [ready, setReady] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const printLock = useRef(false);
  const alive = useRef(true);
  const source = useMemo(() => ({ html: preview.html }), [preview.html]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  function close() {
    if (!printLock.current) {
      onClose();
    }
  }
  function loadStarted() {
    setReady(false);
    setError(null);
  }
  function loadFinished() {
    setReady(true);
    setError(null);
  }
  function retry() {
    loadStarted();
    setVersion(value => value + 1);
  }
  async function savePdf() {
    if (printLock.current || !ready || error) {
      return;
    }
    printLock.current = true;
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
        const window = iframe.current?.contentWindow;
        if (!window) {
          throw new Error('The document preview is unavailable. Reopen it and try again.');
        }
        window.focus();
        window.print();
      }
      else {
        await Print.printAsync({ html: preview.html });
      }
      // Android resolves when the print dialog opens, not when a file is saved.
      // Do not display a misleading "PDF saved" message here.
    } catch (printError) {
      const message = printError instanceof Error ? printError.message : 'Please try again.';
      if (alive.current && !/cancel/i.test(message)) {
        notify('Unable to open PDF printing', message);
      }
    } finally {
      printLock.current = false;
      if (alive.current) {
        setPrinting(false);
      }
    }
  }
  const disabled = !ready || printing || Boolean(error);
  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={close}
    >
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaView style={pdfStyles.safeArea} edges={['top', 'left', 'right']}>
          <View style={pdfStyles.screen}>
            <View style={pdfStyles.header}>
              <Pressable
                style={pdfStyles.headerBack}
                onPress={close}
                disabled={printing}
                accessibilityRole="button"
                accessibilityLabel="Close PDF preview"
              >
                <Ionicons name="arrow-back" size={24} color="#183b4b" />
              </Pressable>
              <View style={pdfStyles.heading}>
                <Text
                  style={pdfStyles.title}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {preview.title}
                </Text>
                <Text style={pdfStyles.subtitle} numberOfLines={1}>{preview.subtitle}</Text>
              </View>
              <SavePdfButton
                disabled={disabled}
                printing={printing}
                compact
                onPress={() => void savePdf()}
              />
            </View>
            <View style={pdfStyles.preview}>
              {Platform.OS === 'web' ? React.createElement('iframe', {
                key: version,
                ref: iframe,
                title: `${preview.documentNumber} PDF preview`,
                srcDoc: preview.html,
                sandbox: 'allow-same-origin allow-modals',
                onLoad: loadFinished,
                onError: () => { setReady(false); setError('The document preview could not be loaded.'); },
                style: {
                  width: '100%',
                  height: '100%',
                  border: 0,
                  display: 'block',
                  background: '#edf4f6'
                },
              }) : (<WebView
                key={version}
                source={source}
                originWhitelist={['*']}
                style={pdfStyles.webview}
                javaScriptEnabled={false}
                domStorageEnabled={false}
                allowFileAccess={false}
                mixedContentMode="never"
                setSupportMultipleWindows={false}
                textZoom={100}
                overScrollMode="never"
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="never"
                showsHorizontalScrollIndicator={false}
                onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('data:text/html')}
                onLoadStart={loadStarted}
                onLoad={loadFinished}
                onError={event => {
                  setReady(false);
                  setError(event.nativeEvent.description || 'The document preview could not be loaded.');
                }}
                onContentProcessDidTerminate={() => {
                  setReady(false);
                  setError('The preview was closed by the system.');
                }}
                onRenderProcessGone={() => {
                  setReady(false);
                  setError('The preview was closed by the system.');
                }}
              />)}
            </View>
            {error && (<Pressable style={pdfStyles.errorBar} onPress={retry} accessibilityRole="button">
              <Text style={pdfStyles.errorText}>{error} Tap to retry.</Text>
            </Pressable>)}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>);
}

function SavePdfButton({ disabled, printing, onPress, compact = false }: {
  disabled: boolean;
  printing: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[pdfStyles.saveButton, compact && pdfStyles.saveButtonCompact, disabled && pdfStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Save PDF"
      accessibilityState={{ disabled, busy: printing }}
    >
      <Ionicons name="download-outline" size={compact ? 19 : 21} color="#fff" />
      <Text style={[pdfStyles.saveText, compact && pdfStyles.saveTextCompact]}>
        {printing ? 'Opening...' : 'Save PDF'}
      </Text>
    </Pressable>);
}


/* =========================================================
   05. REFUND-ONLY MODAL
========================================================= */

/* Refund-only dialog. It has no invoice-collection mode. */
type RefundModalProps = {
  document: SalesWorkflowDocument;
  onClose: () => void;
  onSaved: () => void;
};

type RefundDetails = {
  invoice: SalesWorkflowDocument;
  returnDocument: SalesWorkflowDocument;
  maximum: number;
  payments: SalesWorkflowDetail['payments'];
};

const METHODS: {
  value: SalesSettlementMethod;
  label: string;
}[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK', label: 'Bank transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
  ];

function todayLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}



async function loadRefundDetails(document: SalesWorkflowDocument): Promise<RefundDetails> {
  const activeBusiness = await getBusiness();
  if (activeBusiness?.id !== document.businessId) {
    throw new Error('The active business changed. Reopen the return.');
  }
  const original = await loadSalesWorkflowDocument('SALES_RETURN', document.id);
  if (!original || original.document.businessId !== document.businessId ||
    original.document.source?.documentType !== 'SALES_INVOICE') {
    throw new Error('The return or its original Tax invoice could not be found.');
  }
  const source = await loadSalesWorkflowDocument('SALES_INVOICE', original.document.source.id);
  if (!source || source.document.businessId !== document.businessId) {
    throw new Error('The original Tax invoice could not be loaded.');
  }
  const stillActive = await getBusiness();
  if (stillActive?.id !== document.businessId ||
    original.document.id !== document.id ||
    source.document.id !== original.document.source.id) {
    throw new Error('The business or selected document changed. Reopen the return.');
  }
  const availableReturn = Math.max(0, original.document.totalAmount - original.document.refundedAmount);
  const maximum = Math.round(Math.min(availableReturn, Math.max(0, source.document.customerCredit)) * 100) / 100;
  return {
    invoice: source.document,
    returnDocument: original.document,
    maximum,
    payments: source.payments,
  };
}

function SalesRefundModal({ document, onClose, onSaved }: RefundModalProps) {
  const [details, setDetails] = useState<RefundDetails | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [method, setMethod] = useState<SalesSettlementMethod>('CASH');
  const [reference, setReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [paymentId] = useState(() => `sales_refund_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const saveLock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setDetails(null);
    setError(null);
    void loadRefundDetails(document).then(result => {
      if (!active) {
        return;
      }
      setDetails(result);
      setAmount(result.maximum > 0 ? result.maximum.toFixed(2) : '0');
      setDate(current => current < result.returnDocument.documentDate
        ? result.returnDocument.documentDate : current);
    }).catch(loadError => {
      if (active) {
        setError(errorText(loadError));
      }
    });
    return () => { active = false; };
  }, [document, attempt]);
  function close() {
    if (!saveLock.current) {
      onClose();
    }
  }
  async function save() {
    if (saveLock.current || !details) {
      return;
    }
    const enteredAmount = amount.trim();
    const refundDate = date.trim();
    const normalizedChequeDate = chequeDate.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(enteredAmount) || !Number.isFinite(Number(enteredAmount)) || Number(enteredAmount) <= 0) {
      setError('Enter a refund greater than zero, with at most two decimal places.');
      return;
    }
    if (!isSalesDate(refundDate) || (method === 'CHEQUE' && normalizedChequeDate && !isSalesDate(normalizedChequeDate))) {
      setError('Enter valid dates in YYYY-MM-DD format.');
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
      // Reload balances immediately before saving; the repository validates again.
      const latest = await loadRefundDetails(document);
      if (!alive.current) {
        return;
      }
      setDetails(latest);
      // An earlier attempt may have committed before a connection error.
      // Reuse the stable ID and never send a second refund for that attempt.
      const existing = latest.payments.find(payment => payment.id === paymentId);
      if (existing) {
        if (existing.direction !== 'REFUND' || existing.returnId !== document.id) {
          throw new Error('The refund reference is already used by another payment.');
        }
        onSaved();
        return;
      }
      if (Number(enteredAmount) > latest.maximum) {
        throw new Error(`Refund cannot exceed ${formatSalesMoney(latest.maximum)} for this return.`);
      }
      if (refundDate < latest.returnDocument.documentDate || refundDate < latest.invoice.documentDate) {
        throw new Error('Refund date cannot be before the invoice or return date.');
      }
      await saveSalesPayment({
        id: paymentId,
        direction: 'REFUND',
        invoiceId: latest.invoice.id,
        returnId: latest.returnDocument.id,
        amount: Number(enteredAmount),
        paymentDate: refundDate,
        method,
        reference: reference.trim() || undefined,
        chequeNumber: method === 'CHEQUE' ? chequeNumber.trim() || undefined : undefined,
        chequeBank: method === 'CHEQUE' ? chequeBank.trim() || undefined : undefined,
        chequeDate: method === 'CHEQUE' ? normalizedChequeDate || undefined : undefined,
      });
      if (alive.current) {
        onSaved();
      }
    } catch (saveError) {
      if (alive.current) {
        setError(errorText(saveError));
      }
    } finally {
      saveLock.current = false;
      if (alive.current) {
        setSaving(false);
      }
    }
  }
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <SafeAreaProvider>
        <SafeAreaView style={refundStyles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={refundStyles.keyboard}
          >
            <View style={refundStyles.sheet}>
              <View style={refundStyles.header}>
                <View style={refundStyles.heading}>
                  <Text style={refundStyles.title}>Record refund</Text>
                  <Text style={refundStyles.subtitle}>{document.documentNumber} {'\u2022'} {document.customerName}</Text>
                </View>
                <Pressable
                  onPress={close}
                  disabled={saving}
                  style={refundStyles.close}
                  accessibilityRole="button"
                  accessibilityLabel="Close refund form"
                >
                  <Text style={refundStyles.closeText}>{'\u00d7'}</Text>
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={refundStyles.content}>
                <View style={refundStyles.notice}>
                  <Text style={refundStyles.noticeText}>{details
                    ? `Available refund: ${formatSalesMoney(details.maximum)}. This is limited by the original invoice's customer credit and the remaining return value.`
                    : 'Checking the original invoice and return balance...'}</Text>
                </View>

                {error && <Text style={refundStyles.error}>{error}</Text>}

                {!details && error && (<Pressable onPress={() => setAttempt(value => value + 1)} style={refundStyles.secondary}>
                  <Text style={refundStyles.secondaryText}>Retry</Text>
                </Pressable>)}
                <Text style={refundStyles.label}>REFUND AMOUNT</Text>
                <TextInput
                  value={amount}
                  onChangeText={value => {
                    if (/^\d*(\.\d{0,2})?$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  keyboardType="decimal-pad"
                  style={refundStyles.input}
                  editable={!!details && !saving}
                  placeholder="0.00"
                />
                <Text style={refundStyles.label}>DATE</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  style={refundStyles.input}
                  editable={!saving}
                  autoCapitalize="none"
                />
                <Text style={refundStyles.label}>METHOD</Text>
                <View style={refundStyles.picker}>
                  <Picker selectedValue={method} onValueChange={(value: SalesSettlementMethod) => setMethod(value)} enabled={!saving}>
                    {METHODS.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)}
                  </Picker>
                </View>
                <Text style={refundStyles.label}>REFERENCE</Text>
                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  style={refundStyles.input}
                  editable={!saving}
                  placeholder="Optional reference"
                />

                {method === 'CHEQUE' && (<>
                  <Text style={refundStyles.label}>CHEQUE NUMBER</Text>
                  <TextInput
                    value={chequeNumber}
                    onChangeText={setChequeNumber}
                    style={refundStyles.input}
                    editable={!saving}
                  />
                  <Text style={refundStyles.label}>CHEQUE BANK</Text>
                  <TextInput
                    value={chequeBank}
                    onChangeText={setChequeBank}
                    style={refundStyles.input}
                    editable={!saving}
                  />
                  <Text style={refundStyles.label}>CHEQUE DATE</Text>
                  <TextInput
                    value={chequeDate}
                    onChangeText={setChequeDate}
                    placeholder="YYYY-MM-DD"
                    style={refundStyles.input}
                    editable={!saving}
                  />
                </>)}
                <View style={refundStyles.actions}>
                  <Pressable style={refundStyles.secondary} onPress={close} disabled={saving}>
                    <Text style={refundStyles.secondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[refundStyles.primary, (!details || details.maximum <= 0 || saving) && refundStyles.disabled]}
                    onPress={() => void save()}
                    disabled={!details || details.maximum <= 0 || saving}
                  >
                    <Text style={refundStyles.primaryText}>{saving ? 'Saving...' : 'Save refund'}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>);
}


/* =========================================================
   06A. SALES PAGE STYLES
========================================================= */

const pageStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 9,
    shadowColor: '#001522',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 2
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center'
  },
  logo: { width: 42, height: 42 },
  headerText: { flex: 1, minWidth: 0 },
  appTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800'
  },
  appSubtitle: {
    color: '#d8e7ef',
    fontSize: 12,
    marginTop: 2
  },
  rolePill: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#ffffff24',
    backgroundColor: '#ffffff18'
  },
  roleText: { color: '#e2ebf1', fontSize: 10 },
  content: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 11,
    paddingTop: 26
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2
  },
  flowText: { flex: 1, minWidth: 0 },
  flowTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink
  },
  flowSubtitle: {
    fontSize: 10.5,
    color: C.muted,
    marginTop: 4,
    lineHeight: 16
  },
  startButton: {
    backgroundColor: C.teal,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center'
  },
  startText: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800'
  },
  documentActions: {
    gap: 6,
    paddingBottom: 11,
    paddingTop: 1
  },
  documentAction: {
    backgroundColor: '#e8edf1',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  documentActionText: {
    color: '#56697a',
    fontSize: 11,
    fontWeight: '800'
  },
  notice: {
    backgroundColor: C.notice,
    borderColor: C.noticeBorder,
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    marginBottom: 11
  },
  noticeText: {
    color: C.noticeText,
    fontSize: 11.5,
    lineHeight: 18
  },
  separator: { height: 9 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 15,
    minHeight: 110
  },
  documentIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e9f5f3',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  documentIconText: { fontSize: 24 },
  documentMain: { flex: 1, minWidth: 0 },
  documentNumber: {
    color: C.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800'
  },
  documentMeta: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
    marginTop: 6
  },
  badgeGood: { backgroundColor: C.softGreen },
  badgeWarning: { backgroundColor: C.softOrange },
  badgeText: { fontSize: 8, fontWeight: '900' },
  badgeGoodText: { color: C.green },
  badgeWarningText: { color: C.orange },
  documentRight: {
    alignItems: 'flex-end',
    maxWidth: 154,
    flexShrink: 0
  },
  documentAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: C.ink
  },
  documentState: {
    color: C.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6
  },
  pdfButton: {
    backgroundColor: C.softTeal,
    minWidth: 40,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pdfButtonText: {
    color: '#08736c',
    fontSize: 10,
    fontWeight: '900'
  },
  convertButton: {
    backgroundColor: C.teal,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  convertText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800'
  },
  disabled: { opacity: 0.45 },
  bottomNavigation: {
    position: 'absolute',
    left: 9,
    right: 9,
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10
  },
  navButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonActive: { backgroundColor: '#e5f5f2' },
  navIcon: {
    color: C.muted,
    fontSize: 19,
    marginBottom: 2
  },
  navText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '800'
  },
  navActiveText: {
    color: C.teal,
    fontSize: 9,
    fontWeight: '800'
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center'
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    marginTop: 8
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    marginTop: 5,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.softTeal,
    alignSelf: 'flex-start'
  },
});

/* =========================================================
   06B. FULL-SCREEN PDF PREVIEW STYLES
========================================================= */

const pdfStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  screen: { flex: 1, backgroundColor: '#edf4f6' },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#d9e3e6',
  },
  headerBack: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf3f5',
  },
  heading: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    color: '#16313f'
  },
  subtitle: {
    color: '#808b90',
    fontSize: 10,
    marginTop: 3
  },
  preview: { flex: 1, minHeight: 0 },
  webview: { flex: 1, backgroundColor: '#edf4f6' },
  errorBar: { padding: 10, backgroundColor: '#fff0ed' },
  errorText: {
    color: '#b43a33',
    fontSize: 11,
    textAlign: 'center'
  },

  saveButton: {
    minHeight: 42,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: '#07998e',
  },
  saveButtonCompact: {
    minHeight: 36,
    minWidth: 85,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },
  saveTextCompact: { fontSize: 11 },
  disabled: { opacity: 0.5 },
});

/* =========================================================
   06C. REFUND MODAL STYLES
========================================================= */

const refundStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#04192baa',
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  keyboard: {
    width: '100%',
    maxHeight: '94%',
    maxWidth: 560,
    alignSelf: 'center'
  },
  sheet: {
    backgroundColor: '#f2f6f8',
    borderRadius: 22,
    overflow: 'hidden',
    maxHeight: '100%'
  },
  header: {
    padding: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  heading: { flex: 1 },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#173042'
  },
  subtitle: {
    marginTop: 5,
    fontSize: 11,
    color: '#6e7e88'
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e7edef',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: { fontSize: 24, color: '#173042' },
  content: { padding: 18, paddingTop: 5 },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eaf6ff',
    borderWidth: 1,
    borderColor: '#bddbea'
  },
  noticeText: {
    color: '#245b78',
    fontSize: 11,
    lineHeight: 17
  },
  label: {
    fontSize: 10,
    color: '#536975',
    fontWeight: '800',
    marginTop: 13,
    marginBottom: 5
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#d6e0e5',
    borderRadius: 12,
    color: '#173042',
    backgroundColor: '#fff',
    fontSize: 15
  },
  picker: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d6e0e5',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 20
  },
  primary: {
    minHeight: 45,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#07867d',
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800'
  },
  secondary: {
    minHeight: 45,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#e5f4f1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryText: {
    color: '#08766f',
    fontSize: 13,
    fontWeight: '800'
  },
  error: {
    color: '#b33b34',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10
  },
  disabled: { opacity: 0.5 },
});
