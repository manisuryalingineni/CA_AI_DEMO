import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';

import { getBusiness } from '../../src/repositories/businessRepository';
import {
    DOCUMENT_LABELS,
    NEXT_DOCUMENT,
} from '../../src/repositories/purchaseRepository';
import type {
    DocumentType,
    WorkflowDetail,
    WorkflowDocument,
} from '../../src/repositories/purchaseRepository';
import {
    loadPurchaseWorkflow,
    loadPurchaseWorkflowDocument,
} from '../../src/services/purchaseService';
/* =========================================================
   CONFIGURATION
   This screen replaces the old Purchase / RFQ tabs.
   The forms remain in app/purchases/add.tsx.
========================================================= */

const APP_LOGO = require('../../assets/ca-ai-business.png');
const APP_TITLE = 'CA AI Business';
// Display text only. This does not implement role-based permissions.
const ROLE_LABEL = 'Business Owner';
// Turn this off only if your parent navigator already supplies a bottom bar.
const SHOW_BOTTOM_NAV = true;

const C = {
    navy: '#08233d', navyEnd: '#145784', teal: '#07867d',
    background: '#f2f6f8', ink: '#12243a', muted: '#6b7c8d',
    border: '#dde6ec', white: '#ffffff', softTeal: '#e8f4f3',
    notice: '#eaf6ff', noticeBorder: '#b9d9ee', noticeText: '#164f76',
    green: '#087a59', softGreen: '#e4f6ed', orange: '#a85e00',
    softOrange: '#fff0d6', red: '#b33b34',
};

const DOCUMENT_TYPES: DocumentType[] = [
    'REQUEST', 'RFQ', 'PO', 'GRN', 'PURCHASE', 'RETURN',
];

const NEXT_LABEL: Partial<Record<DocumentType, string>> = {
    REQUEST: 'Create RFQ', RFQ: 'Create PO', PO: 'Create GRN', GRN: 'Create bill',
};

/*
 * These are the business-category names and reference descriptions from
 * the supplied APK. No sample parties, GST numbers or bank accounts are used.
 */
const BUSINESS_PROFILES = [
    { code: 'RETAIL', name: 'Retail Shop', reference: 'Counter sale with barcode, MRP and daily closing' },
    { code: 'WHOLESALE', name: 'Wholesale & Distribution', reference: 'Bulk dealer dispatch with credit terms and transport' },
    { code: 'SERVICE', name: 'Service Business', reference: 'Service job, SLA and completion evidence' },
    { code: 'MANUFACTURING', name: 'Manufacturing', reference: 'BOM, batch production and warehouse movement' },
    { code: 'RESTAURANT', name: 'Restaurant & Food', reference: 'Menu order, KOT and table settlement' },
    { code: 'CONSTRUCTION', name: 'Construction', reference: 'BOQ, site measurement and RA billing' },
    { code: 'TRANSPORT', name: 'Transport & Logistics', reference: 'Vehicle trip, LR/POD and freight settlement' },
    { code: 'ECOMMERCE', name: 'E-commerce', reference: 'Marketplace order, RTO and settlement' },
    { code: 'PROFESSIONAL', name: 'Professional Services', reference: 'Engagement, hours, professional fee and TDS' },
    { code: 'HEALTHCARE', name: 'Healthcare Clinic', reference: 'Patient consultation and pharmacy billing' },
    { code: 'EDUCATION', name: 'Education & Training', reference: 'Student fee, course/batch and collection' },
    { code: 'HOTEL', name: 'Hotel & Hospitality', reference: 'Room booking, guest folio and checkout' },
    { code: 'OTHER', name: 'Other MSME', reference: 'Custom MSME order and settlement' },
];

type PdfSettings = {
    address?: string;
    pan?: string;
    phone?: string;
    email?: string;
    bankName?: string;
    bankBranch?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    upi?: string;
    chequePayee?: string;
    chequeInstructions?: string;
    terms?: string;
    footer?: string;
    signatureName?: string;
    showBank?: boolean;
    showCheque?: boolean;
};

/*
 * OPTIONAL: actual PDF settings keyed by the SQLite business ID, NOT its name.
 * The business schema you supplied has no bank / cheque / invoice-settings
 * table, so these sections display "Not configured" until configured here.
 * Never use the APK's sample bank account, PAN or GSTIN for real documents.
 *
 * Example shape (replace values with your actual business configuration):
 * 'your-business-id': {
 *   address: '...', bankName: '...', bankBranch: '...',
 *   accountName: '...', accountNumber: '...', ifsc: '...', upi: '...',
 *   pan: '...', phone: '...', email: '...',
 *   chequePayee: '...', chequeInstructions: '...', terms: '...',
 * },
 *
 * When a PDF-settings service is available, replace this lookup with that
 * service. These optional settings are current configuration, not historical
 * snapshots. Stored document names, GSTIN and amounts remain authoritative.
 */
const PDF_SETTINGS_BY_BUSINESS: Record<string, PdfSettings> = {};

type BusinessIdentity = { id: string; name: string; gstin: string; businessType: string };

type Preview = {

    html:
        string;

    documentNumber:
        string;

    documentType:
        DocumentType;

    subtitle:
        string;

    businessId:
        string;

    configurationIncomplete:
        boolean;

};

/* =========================================================
   FORMATTERS AND SAFE HTML
========================================================= */

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
}

function businessIdentity(value: unknown): BusinessIdentity | null {
    if (!value) return null;
    const row = record(value);
    if (!text(row.id)) throw new Error('The active business has no valid ID.');
    return {
        id: text(row.id), name: text(row.name), gstin: text(row.gstin),
        businessType: text(row.business_type) || text(row.businessType),
    };
}

function number(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function money(value: number | null | undefined): string {
    return `\u20B9${number(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;
}

function quantity(value: number): string {
    return number(value).toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function multiline(value: string): string {
    return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function fiscalYear(date: string): string {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
    if (!match) return '\u2014';
    const year = Number(match[1]);
    const start = Number(match[2]) >= 4 ? year : year - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
}

function businessProfile(type: string) {
    const key = type.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return BUSINESS_PROFILES.find(profile =>
        profile.code === key || profile.name.toUpperCase().replace(/[^A-Z0-9]/g, '') === key,
    ) ?? { code: 'OTHER', name: type || 'Business', reference: 'Purchase documents and settlement' };
}

function errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Please try again.';
}

function notify(title: string, message: string): void {
    if (Platform.OS === 'web') {
        const browser = globalThis as typeof globalThis & { alert?: (message: string) => void };
        browser.alert?.(`${title}\n\n${message}`);
    } else {
        Alert.alert(title, message);
    }
}

function documentKey(document: WorkflowDocument): string {
    return `${document.document_type}:${document.id}`;
}

function badgeFor(document: WorkflowDocument) {
    if (document.document_type === 'PURCHASE') {
        // Do not mark a bill matched merely because links exist: use the repository result.
        return document.match_status === 'MATCHED'
            ? { label: '3-WAY MATCHED', warning: false }
            : { label: 'MATCH REVIEW', warning: true };
    }
    if (document.document_type === 'RETURN') {
        return {
            label: document.refunded_amount > 0
                ? `${money(document.refunded_amount)} REFUNDED`
                : 'RETURN RECORDED',
            warning: false,
        };
    }
    return { label: 'WORKFLOW DOCUMENT', warning: false };
}

/* =========================================================
   DOCUMENT HTML: SAME HTML FOR PREVIEW AND PRINTING
   Amounts and items are read from the saved document, not
   recalculated from today's product prices.
========================================================= */

function buildDocumentHtml(
    detail: WorkflowDetail,
    currentBusiness: BusinessIdentity,
): Preview {

    const d =
        detail.document;


    if (
        d.business_id !==
        currentBusiness.id
    ) {

        throw new Error(
            'The document does not belong to the active business.',
        );
    }


    const settings =
        PDF_SETTINGS_BY_BUSINESS[
            d.business_id
        ] ?? {};


    const business =
        d.business;


    const name =
        business.name ||
        currentBusiness.name ||
        'Business';


    const gstin =
        business.gstin ||
        (
            d.snapshot_is_current
                ? currentBusiness.gstin
                : ''
        );


    const profile =
        businessProfile(
            business.business_type ||
            currentBusiness.businessType,
        );


    const title =
        DOCUMENT_LABELS[
            d.document_type
        ];


    const address =
        text(
            business.address,
        ) ||
        text(
            settings.address,
        );


    const pan =
        text(
            business.pan,
        ) ||
        text(
            settings.pan,
        );


    const phone =
        text(
            business.mobile,
        ) ||
        text(
            settings.phone,
        );


    const email =
        text(
            business.email,
        ) ||
        text(
            settings.email,
        );


    const isBill =
        d.document_type ===
        'PURCHASE';


    const isReturn =
        d.document_type ===
        'RETURN';


    const hasBank =
        Boolean(
            settings.bankName ||
            settings.accountNumber ||
            settings.upi,
        );


    const configurationIncomplete =
        !address ||
        (
            settings.showBank !==
                false &&
            !hasBank
        );


    const value = (
        input:
            string |
            undefined |
            null,
    ) =>
        escapeHtml(
            text(input) ||
            '\u2014',
        );


    /* =====================================================
       DOCUMENT STATUS
    ===================================================== */

    let documentStatus =
        'WORKFLOW';


    if (isBill) {

        documentStatus =
            d.payment_status ||
            (
                d.due_amount > 0
                    ? 'DUE'
                    : 'PAID'
            );

    } else if (isReturn) {

        documentStatus =
            'RETURN';

    } else if (
        d.document_type ===
        'GRN'
    ) {

        documentStatus =
            'RECEIVED';

    } else if (
        d.document_type ===
        'PO'
    ) {

        documentStatus =
            'ISSUED';

    } else if (
        d.document_type ===
        'RFQ'
    ) {

        documentStatus =
            'OPEN';

    } else {

        documentStatus =
            'REQUESTED';
    }


    /* =====================================================
       VENDOR DETAILS
    ===================================================== */

    const vendorName =
        d.vendor_name ||
        d.vendor.name ||
        'Vendor';


    const vendorGstin =
        text(
            d.vendor.gstin,
        );


    const vendorAddress =
        text(
            d.vendor.address,
        );


    const vendorState =
        text(
            d.vendor.state,
        );


    const vendorDetails =
        [
            vendorGstin
                ? `GSTIN ${vendorGstin}`
                : '',

            vendorAddress,

            vendorState,
        ]
            .filter(
                Boolean,
            )
            .map(
                line =>
                    escapeHtml(
                        line,
                    ),
            )
            .join(
                '<br>',
            );


    /* =====================================================
       ITEM ROWS
    ===================================================== */

    const rows =
        detail.items
            .map(
                line => {

                    const discount =
                        line.discount > 0
                            ? `
                                <div class="item-sub">
                                    Discount:
                                    ${escapeHtml(
                                        money(
                                            line.discount,
                                        ),
                                    )}
                                </div>
                            `
                            : '';


                    return `
                        <tr>

                            <td class="item-cell">

                                <div class="item-name">
                                    ${escapeHtml(
                                        line.product_name,
                                    )}
                                </div>

                                <div class="item-sub">
                                    HSN:
                                    ${value(
                                        line.hsn,
                                    )}
                                </div>

                                ${discount}

                            </td>


                            <td class="center">
                                ${escapeHtml(
                                    quantity(
                                        line.quantity,
                                    ),
                                )}
                                ${escapeHtml(
                                    line.unit ||
                                    '',
                                )}
                            </td>


                            <td class="right">
                                ${escapeHtml(
                                    money(
                                        line.unit_price,
                                    ),
                                )}
                            </td>


                            <td class="center">
                                ${escapeHtml(
                                    quantity(
                                        line.gst_rate,
                                    ),
                                )}%
                            </td>


                            <td class="right strong">
                                ${escapeHtml(
                                    money(
                                        line.total_amount,
                                    ),
                                )}
                            </td>

                        </tr>
                    `;
                },
            )
            .join(
                '',
            );


    /* =====================================================
       TAX LABEL
    ===================================================== */

    const taxLabel =
        d.supply_type ===
            'OTHER_STATE'
            ? 'IGST'
            : 'CGST + SGST';


    /* =====================================================
       SETTLEMENT
    ===================================================== */

    let settlementHtml = `
        <div class="settlement muted">
            Workflow document
        </div>
    `;


    if (isBill) {

        settlementHtml = `
            <div class="settlement">

                <span>
                    Paid
                    <b>
                        ${escapeHtml(
                            money(
                                d.paid_amount,
                            ),
                        )}
                    </b>
                </span>

                <span class="dot">
                    &bull;
                </span>

                <span>
                    Due
                    <b class="${
                        d.due_amount > 0
                            ? 'due-text'
                            : ''
                    }">
                        ${escapeHtml(
                            money(
                                d.due_amount,
                            ),
                        )}
                    </b>
                </span>

            </div>
        `;

    } else if (isReturn) {

        settlementHtml = `
            <div class="settlement">

                <span>
                    Refund
                    <b>
                        ${escapeHtml(
                            money(
                                d.refunded_amount,
                            ),
                        )}
                    </b>
                </span>

                ${
                    d.vendor_credit > 0
                        ? `
                            <span class="dot">
                                &bull;
                            </span>

                            <span>
                                Vendor credit
                                <b>
                                    ${escapeHtml(
                                        money(
                                            d.vendor_credit,
                                        ),
                                    )}
                                </b>
                            </span>
                        `
                        : ''
                }

            </div>
        `;
    }


    /* =====================================================
       BANK
    ===================================================== */

    const bankHtml =
        settings.showBank ===
            false
            ? ''
            : `

        <div class="payment-card">

            <div class="payment-icon">
                &#128179;
            </div>

            <div class="payment-content">

                <div class="payment-title">
                    Bank / UPI payment
                </div>

                ${
                    hasBank
                        ? `

                            <div class="payment-text">

                                ${
                                    value(
                                        settings.bankName,
                                    )
                                }

                                ${
                                    settings.bankBranch
                                        ? ` &bull; ${
                                            value(
                                                settings.bankBranch,
                                            )
                                        }`
                                        : ''
                                }

                                <br>

                                A/c name:
                                ${
                                    value(
                                        settings.accountName,
                                    )
                                }

                                <br>

                                A/c:
                                ${
                                    value(
                                        settings.accountNumber,
                                    )
                                }

                                <br>

                                IFSC:
                                ${
                                    value(
                                        settings.ifsc,
                                    )
                                }

                                ${
                                    settings.upi
                                        ? `
                                            <br>
                                            UPI:
                                            ${
                                                value(
                                                    settings.upi,
                                                )
                                            }
                                        `
                                        : ''
                                }

                            </div>

                        `
                        : `

                            <div class="payment-text">
                                Add your business bank
                                account and UPI details here.
                            </div>

                        `
                }

            </div>

        </div>
    `;


    /* =====================================================
       CHEQUE
    ===================================================== */

    const chequeHtml =
        settings.showCheque ===
            false
            ? ''
            : `

        <div class="payment-card">

            <div class="payment-icon">
                &#128196;
            </div>

            <div class="payment-content">

                <div class="payment-title">
                    Cheque information
                </div>

                <div class="payment-text">

                    ${
                        settings.chequePayee
                            ? `
                                Payee:
                                ${
                                    value(
                                        settings.chequePayee,
                                    )
                                }
                                <br>
                            `
                            : `
                                Payee:
                                Account Payee only.
                                <br>
                            `
                    }

                    ${
                        settings.chequeInstructions
                            ? multiline(
                                settings.chequeInstructions,
                            )
                            : 'Mention document number behind the cheque.'
                    }

                </div>

            </div>

        </div>
    `;


    /* =====================================================
       OPTIONAL NOTE
    ===================================================== */

    const noteHtml =
        d.notes
            ? `

                <section class="business-note">

                    <b>
                        Business note
                    </b>

                    <div>
                        ${multiline(
                            d.notes,
                        )}
                    </div>

                </section>

            `
            : '';


    /* =====================================================
       HTML
    ===================================================== */

    const html = `
<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"
    >

    <title>
        ${escapeHtml(
            d.document_number,
        )}
    </title>


    <style>

        @page {
            size: A4 portrait;
            margin: 10mm;
        }


        * {
            box-sizing: border-box;
        }


        html,
        body {
            margin: 0;
            padding: 0;
        }


        body {

            background:
                #edf4f6;

            color:
                #10283a;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            font-size:
                13px;

            line-height:
                1.4;
        }


        .preview-background {

            width:
                100%;

            min-height:
                100vh;

            padding:
                14px;
        }


        .paper {

            width:
                100%;

            max-width:
                820px;

            margin:
                0 auto;

            background:
                #ffffff;

            border:
                1px solid #d3e0e5;

            border-radius:
                20px;

            overflow:
                hidden;

            padding:
                28px;

            box-shadow:
                0 6px 22px
                rgba(
                    8,
                    35,
                    61,
                    0.08
                );
        }


        /* ================================
           TOP
        ================================ */


        .top {

            display:
                flex;

            justify-content:
                space-between;

            gap:
                20px;

            align-items:
                flex-start;
        }


        .business {

            flex:
                1;

            min-width:
                0;
        }


        .business-name {

            margin:
                0;

            color:
                #102d43;

            font-size:
                34px;

            line-height:
                1.1;

            font-weight:
                900;

            overflow-wrap:
                anywhere;
        }


        .business-contact {

            margin-top:
                14px;

            color:
                #63717b;

            line-height:
                1.55;

            overflow-wrap:
                anywhere;
        }


        .document-heading {

            flex-shrink:
                0;

            text-align:
                right;

            padding-top:
                3px;
        }


        .document-type {

            color:
                #07867d;

            font-size:
                12px;

            font-weight:
                900;

            letter-spacing:
                0.5px;

            text-transform:
                uppercase;
        }


        .document-number {

            margin-top:
                5px;

            color:
                #102d43;

            font-size:
                26px;

            line-height:
                1.1;

            font-weight:
                900;

            overflow-wrap:
                anywhere;
        }


        .teal-rule {

            width:
                100%;

            height:
                5px;

            border-radius:
                99px;

            background:
                #07998e;

            margin:
                24px 0;
        }


        /* ================================
           INFORMATION
        ================================ */


        .info-grid {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                14px;

            margin-bottom:
                24px;
        }


        .info-card {

            border:
                1px solid #badbd6;

            border-radius:
                16px;

            background:
                #eef8f6;

            padding:
                18px;

            min-height:
                132px;
        }


        .info-label {

            color:
                #75818a;

            font-size:
                11px;

            font-weight:
                900;

            letter-spacing:
                1px;

            text-transform:
                uppercase;

            margin-bottom:
                12px;
        }


        .vendor-name {

            color:
                #152c3d;

            font-size:
                16px;

            font-weight:
                900;

            overflow-wrap:
                anywhere;
        }


        .vendor-detail {

            color:
                #647079;

            margin-top:
                5px;

            line-height:
                1.45;

            overflow-wrap:
                anywhere;
        }


        .detail-row {

            margin:
                7px 0;

            color:
                #647079;
        }


        .detail-row b {

            color:
                #1e3445;
        }


        /* ================================
           TABLE
        ================================ */


        .items-wrap {

            border:
                1px solid #ccd6dc;

            border-radius:
                15px;

            overflow:
                hidden;

            margin-bottom:
                25px;
        }


        table {

            width:
                100%;

            border-collapse:
                collapse;

            table-layout:
                fixed;
        }


        thead {

            background:
                #edf8f6;
        }


        th {

            color:
                #243d4d;

            font-size:
                11px;

            font-weight:
                900;

            padding:
                15px 12px;

            text-align:
                left;
        }


        th.center,
        td.center {

            text-align:
                center;
        }


        th.right,
        td.right {

            text-align:
                right;
        }


        td {

            padding:
                16px 12px;

            border-top:
                1px solid #e1e7ea;

            vertical-align:
                middle;

            color:
                #263b49;

            overflow-wrap:
                anywhere;
        }


        .item-name {

            font-weight:
                900;

            color:
                #203747;
        }


        .item-sub {

            color:
                #79858d;

            font-size:
                10px;

            margin-top:
                4px;
        }


        .strong {

            font-weight:
                900;
        }


        /* ================================
           TOTALS
        ================================ */


        .totals-card {

            border:
                1px solid #d6dde1;

            border-radius:
                16px;

            background:
                #fcfdfd;

            padding:
                20px;

            margin-bottom:
                26px;
        }


        .total-row {

            display:
                flex;

            justify-content:
                space-between;

            gap:
                15px;

            margin:
                10px 0;

            color:
                #67737c;

            font-size:
                14px;
        }


        .total-row b {

            color:
                #253c4b;
        }


        .total-divider {

            height:
                1px;

            width:
                100%;

            background:
                #d7dfe3;

            margin:
                17px 0;
        }


        .grand-total {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                baseline;

            gap:
                15px;

            color:
                #102d43;

            font-size:
                20px;

            font-weight:
                900;
        }


        .grand-amount {

            font-size:
                26px;
        }


        .settlement {

            display:
                flex;

            justify-content:
                flex-end;

            flex-wrap:
                wrap;

            gap:
                8px;

            margin-top:
                17px;

            color:
                #68737b;

            font-size:
                11px;
        }


        .settlement b {

            color:
                #263a48;
        }


        .settlement .due-text {

            color:
                #9b6500;
        }


        .dot {

            color:
                #a5adb2;
        }


        /* ================================
           PAYMENT BOXES
        ================================ */


        .payment-grid {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                14px;

            margin-bottom:
                27px;
        }


        .payment-card {

            display:
                flex;

            gap:
                12px;

            border:
                1px solid #cbd5da;

            border-radius:
                16px;

            padding:
                17px;

            min-height:
                140px;

            background:
                #ffffff;
        }


        .payment-icon {

            width:
                37px;

            height:
                37px;

            flex:
                0 0 37px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                11px;

            background:
                #e3f5f2;

            color:
                #07867d;

            font-size:
                18px;
        }


        .payment-content {

            flex:
                1;

            min-width:
                0;
        }


        .payment-title {

            color:
                #203747;

            font-weight:
                900;

            margin-bottom:
                7px;
        }


        .payment-text {

            color:
                #68747c;

            font-size:
                11px;

            line-height:
                1.5;

            overflow-wrap:
                anywhere;
        }


        /* ================================
           NOTES
        ================================ */


        .business-note {

            margin-bottom:
                20px;

            color:
                #263c4b;
        }


        .business-note div {

            color:
                #68747c;

            margin-top:
                5px;
        }


        /* ================================
           TERMS
        ================================ */


        .terms-title {

            margin:
                0 0 7px;

            color:
                #163245;

            font-size:
                14px;

            font-weight:
                900;
        }


        .terms-text {

            color:
                #65717a;

            line-height:
                1.5;
        }


        .thank-you {

            color:
                #163245;

            font-weight:
                900;

            margin-top:
                25px;
        }


        .signature {

            text-align:
                right;

            margin-top:
                68px;

            color:
                #163245;
        }


        .signature-name {

            font-weight:
                900;
        }


        .signature-for {

            color:
                #66727a;

            margin-top:
                4px;
        }


        .footer-note {

            color:
                #7a858d;

            font-size:
                9px;

            margin-top:
                26px;
        }


        .muted {

            color:
                #7a858d;
        }


        /* ================================
           MOBILE PREVIEW
        ================================ */


        @media
        (max-width: 560px) {

            .preview-background {

                padding:
                    8px;
            }


            .paper {

                border-radius:
                    13px;

                padding:
                    19px 14px;
            }


            .business-name {

                font-size:
                    27px;
            }


            .document-number {

                font-size:
                    21px;
            }


            .document-type {

                font-size:
                    10px;
            }


            .info-grid {

                gap:
                    10px;
            }


            .info-card {

                padding:
                    14px;

                min-height:
                    122px;
            }


            th {

                padding:
                    12px 7px;

                font-size:
                    9px;
            }


            td {

                padding:
                    13px 7px;

                font-size:
                    10px;
            }


            .grand-total {

                font-size:
                    18px;
            }


            .grand-amount {

                font-size:
                    23px;
            }


            .payment-card {

                padding:
                    13px;

                min-height:
                    135px;
            }

        }


        /* ================================
           PRINT / PDF
        ================================ */


        @media print {

            body {

                background:
                    #ffffff;

                font-size:
                    10pt;
            }


            .preview-background {

                padding:
                    0;
            }


            .paper {

                max-width:
                    none;

                border:
                    0;

                border-radius:
                    0;

                box-shadow:
                    none;

                padding:
                    0;
            }


            .business-name {

                font-size:
                    27pt;
            }


            .document-number {

                font-size:
                    21pt;
            }


            .info-card,
            .totals-card,
            .payment-card {

                break-inside:
                    avoid;

                page-break-inside:
                    avoid;
            }


            thead {

                display:
                    table-header-group;
            }


            tr {

                break-inside:
                    avoid;

                page-break-inside:
                    avoid;
            }


            .signature {

                break-inside:
                    avoid;
            }


            .info-card,
            .totals-card,
            .payment-icon,
            thead {

                -webkit-print-color-adjust:
                    exact;

                print-color-adjust:
                    exact;
            }

        }

    </style>

</head>


<body>

<div class="preview-background">

<main class="paper">


    <!-- TOP -->

    <section class="top">

        <div class="business">

            <h1 class="business-name">
                ${escapeHtml(
                    name,
                )}
            </h1>


            <div class="business-contact">

                ${
                    address
                        ? `
                            ${multiline(
                                address,
                            )}
                            <br>
                        `
                        : ''
                }

                GSTIN
                ${value(
                    gstin,
                )}

                ${
                    pan
                        ? `
                            &bull;
                            PAN
                            ${value(
                                pan,
                            )}
                        `
                        : ''
                }

                ${
                    phone ||
                    email
                        ? `
                            <br>
                            ${
                                phone
                                    ? value(
                                        phone,
                                    )
                                    : ''
                            }

                            ${
                                phone &&
                                email
                                    ? ' &bull; '
                                    : ''
                            }

                            ${
                                email
                                    ? value(
                                        email,
                                    )
                                    : ''
                            }
                        `
                        : ''
                }

            </div>

        </div>


        <div class="document-heading">

            <div class="document-type">
                ${escapeHtml(
                    title,
                )}
            </div>

            <div class="document-number">
                ${escapeHtml(
                    d.document_number,
                )}
            </div>

        </div>

    </section>


    <div class="teal-rule">
    </div>


    <!-- INFO -->

    <section class="info-grid">

        <div class="info-card">

            <div class="info-label">
                VENDOR
            </div>

            <div class="vendor-name">
                ${escapeHtml(
                    vendorName,
                )}
            </div>

            ${
                vendorDetails
                    ? `
                        <div class="vendor-detail">
                            ${vendorDetails}
                        </div>
                    `
                    : `
                        <div class="vendor-detail">
                            Vendor / supplier
                        </div>
                    `
            }

        </div>


        <div class="info-card">

            <div class="info-label">
                DOCUMENT DETAILS
            </div>

            <div class="detail-row">
                Date:
                <b>
                    ${escapeHtml(
                        d.document_date,
                    )}
                </b>
            </div>

            <div class="detail-row">

                ${
                    d.document_type ===
                    'RFQ'
                        ? 'Valid until'
                        : 'Due'
                }:

                <b>
                    ${escapeHtml(
                        d.due_date ||
                        '\u2014',
                    )}
                </b>

            </div>

            <div class="detail-row">
                FY:
                <b>
                    ${escapeHtml(
                        fiscalYear(
                            d.document_date,
                        ),
                    )}
                </b>
            </div>

            <div class="detail-row">
                Status:
                <b>
                    ${escapeHtml(
                        documentStatus,
                    )}
                </b>
            </div>

        </div>

    </section>


    <!-- ITEMS -->

    <section class="items-wrap">

        <table>

            <colgroup>

                <col
                    style="width:40%"
                >

                <col
                    style="width:13%"
                >

                <col
                    style="width:16%"
                >

                <col
                    style="width:11%"
                >

                <col
                    style="width:20%"
                >

            </colgroup>


            <thead>

                <tr>

                    <th>
                        Item / Service
                    </th>

                    <th class="center">
                        Qty
                    </th>

                    <th class="right">
                        Rate
                    </th>

                    <th class="center">
                        GST
                    </th>

                    <th class="right">
                        Total
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    rows ||
                    `
                        <tr>

                            <td
                                colspan="5"
                                class="center muted"
                            >
                                No saved item rows found.
                            </td>

                        </tr>
                    `
                }

            </tbody>

        </table>

    </section>


    <!-- TOTAL -->

    <section class="totals-card">

        <div class="total-row">

            <span>
                Taxable value
            </span>

            <b>
                ${escapeHtml(
                    money(
                        d.subtotal,
                    ),
                )}
            </b>

        </div>


        <div class="total-row">

            <span>
                ${taxLabel}
            </span>

            <b>
                ${escapeHtml(
                    money(
                        d.gst_amount,
                    ),
                )}
            </b>

        </div>


        <div class="total-divider">
        </div>


        <div class="grand-total">

            <span>
                Grand total
            </span>

            <span class="grand-amount">
                ${escapeHtml(
                    money(
                        d.total_amount,
                    ),
                )}
            </span>

        </div>


        ${settlementHtml}

    </section>


    ${noteHtml}


    <!-- PAYMENT INFORMATION -->

    <section class="payment-grid">

        ${bankHtml}

        ${chequeHtml}

    </section>


    <!-- TERMS -->

    <section>

        <div class="terms-title">
            Terms &amp; Conditions
        </div>

        <div class="terms-text">
            ${multiline(
                settings.terms ||
                'Payment due as stated. Goods once received are subject to the stated return policy.',
            )}
        </div>


        <div class="thank-you">
            ${multiline(
                settings.footer ||
                'Thank you for your business.',
            )}
        </div>

    </section>


    <!-- SIGNATURE -->

    <section class="signature">

        <div class="signature-name">
            ${value(
                settings.signatureName ||
                'Authorised Signatory',
            )}
        </div>

        <div class="signature-for">
            For
            ${escapeHtml(
                name,
            )}
        </div>

    </section>


    <div class="footer-note">
        Computer-generated document;
        verify legal and tax details
        before live use.
    </div>


</main>

</div>

</body>

</html>
    `;


    return {

        html,

        documentNumber:
            d.document_number,

        documentType:
            d.document_type,

        businessId:
            d.business_id,

        subtitle:
            `${profile.name} \u2022 ${title}`,

        configurationIncomplete,

    };
}

/* =========================================================
   MAIN PURCHASE WORKFLOW PAGE
========================================================= */

export default function PurchasesScreen() {
    const insets = useSafeAreaInsets();

    const { openPdfType, openPdfId } = useLocalSearchParams<{
        openPdfType?: string;
        openPdfId?: string;
    }>();

    const [business, setBusiness] = useState<BusinessIdentity | null>(null);
    const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [openingKey, setOpeningKey] = useState<string | null>(null);
    // Search and totals remain available without changing the APK's default layout.
    const [showTools, setShowTools] = useState(false);
    const [query, setQuery] = useState('');
    const focused = useRef(false);
    const previewRequest = useRef(0);
    const documentLock = useRef(false);
    const autoOpenedPdfKey = useRef<string | null>(null);

    useFocusEffect(useCallback(() => {
        let active = true;
        focused.current = true;
        setReady(false);
        setLoadError(null);
        setPreview(null);
        setOpeningKey(null);
        documentLock.current = false;
        previewRequest.current += 1;

        async function refresh() {
            try {
                const current = businessIdentity(await getBusiness());
                if (!active) return;
                if (!current) {
                    setBusiness(null);
                    setDocuments([]);
                    setReady(true);
                    return;
                }
                setBusiness(current);
                // Remove another business's previous rows before the new query completes.
                setDocuments(rows => rows.filter(row => row.business_id === current.id));
                const rows = await loadPurchaseWorkflow();
                if (!active) return;
                const stillCurrent = businessIdentity(await getBusiness());
                if (!active) return;
                if (stillCurrent?.id !== current.id || rows.some(row => row.business_id !== current.id)) {
                    throw new Error('The active business changed. Tap Retry to reload.');
                }
                setDocuments(rows);
                setReady(true);
            } catch (error) {
                if (active) { setLoadError(errorText(error)); setReady(true); }
            }
        }
        void refresh();
        return () => {
            active = false;
            focused.current = false;
            previewRequest.current += 1;
        };
    }, [attempt]));

    const openForm = useCallback((type: DocumentType, source?: WorkflowDocument) => {
        if (!business || loadError) return;
        const params = source
            ? { type, sourceType: source.document_type, sourceId: source.id }
            : { type };
        router.push({ pathname: '/purchases/add', params });
    }, [business, loadError]);

    const openPdf = useCallback(async (document: WorkflowDocument) => {
        if (!business || documentLock.current) return;
        documentLock.current = true;
        const request = ++previewRequest.current;
        setOpeningKey(documentKey(document));
        try {
            const detail = await loadPurchaseWorkflowDocument(document.document_type, document.id);
            const current = businessIdentity(await getBusiness());
            if (!focused.current || request !== previewRequest.current) return;
            if (!current || current.id !== business.id) throw new Error('The active business changed. Reopen the document.');
            if (!detail) throw new Error('This purchase document could not be found.');
            setPreview(buildDocumentHtml(detail, current));
        } catch (error) {
            if (focused.current && request === previewRequest.current) {
                notify('Unable to open PDF preview', errorText(error));
            }
        } finally {
            if (request === previewRequest.current) {
                documentLock.current = false;
                setOpeningKey(null);
            }
        }
    }, [business]);

    useEffect(() => {
        if (
            !business ||
            !ready ||
            !openPdfId ||
            openPdfType !== 'PURCHASE'
        ) {
            return;
        }

        const key = `PURCHASE:${openPdfId}`;

        if (autoOpenedPdfKey.current === key) {
            return;
        }

        const document = documents.find(
            item =>
                item.id === openPdfId &&
                item.document_type === 'PURCHASE',
        );

        if (!document) {
            return;
        }

        autoOpenedPdfKey.current = key;
        void openPdf(document);
    }, [
        business,
        ready,
        openPdfId,
        openPdfType,
        documents,
        openPdf,
    ]);

    const filtered = useMemo(() => {
        const search = query.trim().toLowerCase();
        return !showTools || !search ? documents : documents.filter(document => [
            document.document_number, document.vendor_name, document.invoice_number,
            DOCUMENT_LABELS[document.document_type], document.document_date,
        ].some(value => (value || '').toLowerCase().includes(search)));
    }, [documents, query, showTools]);

    const summary = useMemo(() => documents.filter(d => d.document_type === 'PURCHASE').reduce(
        (sum, d) => ({
            count: sum.count + 1,
            gross: sum.gross + number(d.total_amount),
            paid: sum.paid + number(d.paid_amount),
            due: sum.due + number(d.due_amount),
        }), { count: 0, gross: 0, paid: 0, due: 0 },
    ), [documents]);

    const renderDocument = useCallback(({ item }: { item: WorkflowDocument }) => (
        <DocumentCard
            document={item}
            opening={openingKey === documentKey(item)}
            disabled={openingKey !== null}
            onPdf={openPdf}
            onCreate={openForm}
            onNext={next => { void openPdf(next); }}
            documents={documents}
        />
    ), [openingKey, openPdf, openForm, documents]);

    const profile = businessProfile(business?.businessType || '');

    return (
        <View style={styles.screen}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />
            <LinearGradient
                colors={[C.navy, C.navyEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerInner}>
                    <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.appTitle} numberOfLines={1} adjustsFontSizeToFit>{APP_TITLE}</Text>
                        <Text style={styles.appSubtitle} numberOfLines={1}>
                            {business ? `${profile.name}` : 'Select a business'}
                            {/* {business ? `${business.name} \u2022 ${profile.name}` : 'Select a business'} */}
                        </Text>
                    </View>
                    <View style={styles.rolePill}>
                        <Text style={styles.roleText} numberOfLines={1}>{'\uD83D\uDC64 '}{ROLE_LABEL}</Text>
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={filtered}
                keyExtractor={documentKey}
                renderItem={renderDocument}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: SHOW_BOTTOM_NAV ? insets.bottom + 110 : insets.bottom + 28 },
                ]}
                ListHeaderComponent={
                    <View>
                        <View style={styles.flowHeader}>
                            <Pressable
                                style={styles.flowText}
                                onPress={() => setShowTools(value => !value)}
                                accessibilityRole="button"
                                accessibilityLabel="Complete purchase flow. Toggle search and summary"
                                accessibilityHint="Shows document search and purchase bill totals"
                            >
                                <Text style={styles.flowTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    Complete purchase flow
                                </Text>
                                <Text style={styles.flowSubtitle}>
                                    {'Request \u2192 RFQ \u2192 PO \u2192 GRN \u2192 bill \u2192 payment'}
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[styles.startButton, !business && styles.disabled]}
                                onPress={() => openForm('REQUEST')}
                                disabled={!business || Boolean(loadError)}
                            >
                                <Text style={styles.startText}>+ Add</Text>
                            </Pressable>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.documentActions}>
                            {DOCUMENT_TYPES.map(type => (
                                <Pressable
                                    key={type}
                                    style={({ pressed }) => [styles.documentAction, pressed && styles.pressed]}
                                    onPress={() => openForm(type)}
                                    disabled={!business || Boolean(loadError)}
                                >
                                    <Text style={styles.documentActionText}>+ {DOCUMENT_LABELS[type]}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={styles.notice}>
                            {/* Wording retained from the reference APK. Actual posting is performed
                  by your existing backend; this screen does not implement ITC posting. */}
                            <Text style={styles.noticeText}>
                                Only the purchase bill posts payable, ITC and stock. A bill converted from GRN and PO shows three-way matched status.
                            </Text>
                        </View>

                        {showTools && (
                            <View style={styles.tools}>
                                <TextInput
                                    value={query} onChangeText={setQuery}
                                    style={styles.searchInput}
                                    placeholder="Search document, vendor or invoice..."
                                    placeholderTextColor={C.muted}
                                    accessibilityLabel="Search purchase documents"
                                />
                                <View style={styles.summary}>
                                    {[
                                        ['Bills', String(summary.count)], ['Gross bills', money(summary.gross)],
                                        ['Paid', money(summary.paid)], ['To Pay', money(summary.due)],
                                    ].map(([label, value]) => (
                                        <View key={label} style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>{label}</Text>
                                            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Pressable onPress={() => { setShowTools(false); setQuery(''); }}>
                                    <Text style={styles.hideTools}>Hide search and summary</Text>
                                </Pressable>
                            </View>
                        )}

                        {loadError && (
                            <View style={styles.notice}>
                                <Text style={styles.noticeText}>{loadError}</Text>
                                <Pressable onPress={() => setAttempt(value => value + 1)} style={styles.retryButton}>
                                    <Text style={styles.pdfButtonText}>Retry</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={ready && !loadError ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyIcon}>{'\uD83D\uDCC4'}</Text>
                        <Text style={styles.emptyTitle}>{!business ? 'Business setup required' : query && showTools ? 'No matching documents' : 'No documents'}</Text>
                        <Text style={styles.emptyText}>{!business ? 'Select your business before creating purchase documents.' : 'Start the business flow above.'}</Text>
                        {!business && (
                            <Pressable style={styles.retryButton} onPress={() => router.push('/business-selection')}>
                                <Text style={styles.pdfButtonText}>Select business</Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}
            />

            {/* =====================================================
    BOTTOM NAVIGATION
===================================================== */}

            {SHOW_BOTTOM_NAV && (

                <View
                    style={[
                        styles.bottomNavigation,

                        {
                            bottom:
                                Math.max(
                                    8,
                                    insets.bottom,
                                ),
                        },
                    ]}
                >

                    {/* HOME */}

                    <Pressable
                        onPress={() =>
                            router.replace(
                                '/dashboard',
                            )
                        }
                        style={
                            styles.navButton
                        }
                    >
                        <Text
                            style={
                                styles.navIcon
                            }
                        >
                            ⌂
                        </Text>

                        <Text
                            style={
                                styles.navText
                            }
                        >
                            Home
                        </Text>
                    </Pressable>


                    {/* SALES */}

                    <Pressable
                        onPress={() =>
                            router.push(
                                '/sales',
                            )
                        }
                        style={
                            styles.navButton
                        }
                    >
                        <Text
                            style={
                                styles.navIcon
                            }
                        >
                            🧾
                        </Text>

                        <Text
                            style={
                                styles.navText
                            }
                        >
                            Sales
                        </Text>
                    </Pressable>


                    {/* PURCHASES - ACTIVE */}

                    <Pressable
                        onPress={() => { }}
                        style={[
                            styles.navButton,
                            styles.navButtonActive,
                        ]}
                    >
                        <Text
                            style={
                                styles.navIcon
                            }
                        >
                            📥
                        </Text>

                        <Text
                            style={
                                styles.navActiveText
                            }
                        >
                            Purchases
                        </Text>
                    </Pressable>


                    {/* MORE */}

                    <Pressable
                        onPress={() =>
                            router.push(
                                '/more',
                            )
                        }
                        style={
                            styles.navButton
                        }
                    >
                        <Text
                            style={
                                styles.navIcon
                            }
                        >
                            ▦
                        </Text>

                        <Text
                            style={
                                styles.navText
                            }
                        >
                            More
                        </Text>
                    </Pressable>

                </View>

            )}
            {preview && <PdfPreview key={preview.documentNumber} preview={preview} onClose={() => setPreview(null)} />}
        </View>
    );
}

/* =========================================================
   WORKFLOW CARDS
========================================================= */

const DocumentCard = memo(function DocumentCard({ document: d, opening, disabled, onPdf, onCreate, onNext, documents }: {
    document: WorkflowDocument;
    opening: boolean;
    disabled: boolean;
    onPdf: (document: WorkflowDocument) => Promise<void>;
    onCreate: (type: DocumentType, source?: WorkflowDocument) => void;
    onNext: (document: WorkflowDocument) => void;
    documents: WorkflowDocument[];
}) {
    const badge = badgeFor(d);
    const nextType = NEXT_DOCUMENT[d.document_type];
    const next = d.next_id && d.next_type
        ? documents.find(row => row.id === d.next_id && row.document_type === d.next_type)
        : undefined;
    const financial = d.document_type === 'PURCHASE' || d.document_type === 'RETURN';

    return (
        <View style={styles.documentCard}>
            <View style={styles.documentIcon}><Text style={styles.documentIconText}>{'\uD83D\uDCE5'}</Text></View>
            <Pressable style={styles.documentMain} onPress={() => { void onPdf(d); }} disabled={disabled} accessibilityLabel={`View ${d.document_number}`}>
                <Text style={styles.documentNumber} numberOfLines={2}>{d.document_number}{' \u2022 '}{d.vendor_name || 'Vendor'}</Text>
                <Text style={styles.documentMeta} numberOfLines={1}>{DOCUMENT_LABELS[d.document_type]}{' \u2022 '}{d.document_date}{' \u2022 '}{d.line_count} line(s)</Text>
                <View style={[styles.badge, badge.warning ? styles.badgeWarning : styles.badgeGood]}>
                    <Text style={[styles.badgeText, badge.warning ? styles.badgeWarningText : styles.badgeGoodText]}>{badge.label}</Text>
                </View>
            </Pressable>
            <View style={styles.documentRight}>
                <Text style={styles.documentAmount} numberOfLines={1} adjustsFontSizeToFit>{money(d.total_amount)}</Text>
                <Text style={styles.documentState}>{financial ? 'ISSUED' : 'WORKFLOW'}</Text>
                <View style={styles.cardActions}>
                    <Pressable style={[styles.pdfButton, disabled && styles.disabled]} onPress={() => { void onPdf(d); }} disabled={disabled}>
                        <Text style={styles.pdfButtonText}>{opening ? '...' : 'PDF'}</Text>
                    </Pressable>
                    {nextType && !d.next_id && (
                        <Pressable style={styles.convertButton} onPress={() => onCreate(nextType, d)}>
                            <Text style={styles.convertText}>{NEXT_LABEL[d.document_type]}</Text>
                        </Pressable>
                    )}
                    {next && (
                        <Pressable style={styles.convertButton} onPress={() => onNext(next)} disabled={disabled}>
                            <Text style={styles.convertText}>View next</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
});


/* =========================================================
   HTML PREVIEW AND ANDROID SAVE-AS-PDF
========================================================= */

function PdfPreview({
    preview,
    onClose,
}: {
    preview: Preview;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();

    const [printing, setPrinting] = useState(false);
    const [previewReady, setPreviewReady] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewVersion, setPreviewVersion] = useState(0);

    const iframe = useRef<HTMLIFrameElement | null>(null);
    const printLock = useRef(false);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;

        return () => {
            alive.current = false;
        };
    }, []);

    const close = () => {
        if (!printLock.current) {
            onClose();
        }
    };

    const source = useMemo(
        () => ({
            html: preview.html,
        }),
        [preview.html],
    );

    async function savePdf() {
        if (
            printLock.current ||
            !previewReady ||
            previewError
        ) {
            return;
        }

        printLock.current = true;
        setPrinting(true);

        try {
            if (Platform.OS === 'web') {
                const frame =
                    iframe.current?.contentWindow;

                if (!frame) {
                    throw new Error(
                        'The preview is not available. Reopen it and try again.',
                    );
                }

                frame.focus();
                frame.print();
            } else {
                await Print.printAsync({
                    html: preview.html,
                });
            }
        } catch (error) {
            const message = errorText(error);

            if (
                !/cancel/i.test(message) &&
                alive.current
            ) {
                notify(
                    'Unable to open PDF printing',
                    message,
                );
            }
        } finally {
            printLock.current = false;

            if (alive.current) {
                setPrinting(false);
            }
        }
    }

    const saveDisabled =
        !previewReady ||
        printing ||
        Boolean(previewError);

    return (
        <Modal
            visible
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent={false}
            hardwareAccelerated
            onRequestClose={close}
        >
            <View style={styles.pdfScreen}>
                <View
                    style={[
                        styles.pdfTopBar,
                        {
                            paddingTop: Math.max(
                                insets.top,
                                8,
                            ),
                        },
                    ]}
                >
                    <Pressable
                        style={styles.pdfTopBack}
                        onPress={close}
                        disabled={printing}
                        accessibilityLabel="Close PDF preview"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={27}
                            color="#17384A"
                        />
                    </Pressable>

                    <View style={styles.pdfTopTitleArea}>
                        <Text
                            style={styles.pdfTopTitle}
                            numberOfLines={1}
                        >
                            {
                                DOCUMENT_LABELS[
                                    preview.documentType
                                ]
                            }
                        </Text>

                        <Text
                            style={styles.pdfTopSubtitle}
                            numberOfLines={1}
                        >
                            {preview.documentNumber}
                            {' \u2022 '}
                            {preview.subtitle}
                        </Text>
                    </View>

                    <Pressable
                        style={[
                            styles.pdfTopSave,
                            saveDisabled &&
                                styles.disabled,
                        ]}
                        onPress={() => {
                            void savePdf();
                        }}
                        disabled={saveDisabled}
                    >
                        <Ionicons
                            name="download-outline"
                            size={20}
                            color="#FFFFFF"
                        />

                        <Text
                            style={
                                styles.pdfTopSaveText
                            }
                        >
                            {printing
                                ? 'Opening...'
                                : 'Save PDF'}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.pdfPreviewArea}>
                    {Platform.OS === 'web'
                        ? React.createElement(
                              'iframe',
                              {
                                  key: previewVersion,
                                  ref: iframe,
                                  title: `${preview.documentNumber} preview`,
                                  srcDoc: preview.html,
                                  sandbox:
                                      'allow-same-origin allow-modals',
                                  onLoad: () => {
                                      setPreviewError(
                                          null,
                                      );
                                      setPreviewReady(
                                          true,
                                      );
                                  },
                                  style: {
                                      width: '100%',
                                      height: '100%',
                                      border: 0,
                                      background:
                                          '#edf4f6',
                                  },
                              },
                          )
                        : (
                            <WebView
                                key={previewVersion}
                                source={source}
                                originWhitelist={[
                                    '*',
                                ]}
                                style={styles.pdfWebView}
                                javaScriptEnabled={
                                    false
                                }
                                domStorageEnabled={
                                    false
                                }
                                allowFileAccess={
                                    false
                                }
                                mixedContentMode="never"
                                setSupportMultipleWindows={
                                    false
                                }
                                textZoom={100}
                                overScrollMode="never"
                                showsVerticalScrollIndicator
                                showsHorizontalScrollIndicator={
                                    false
                                }
                                onShouldStartLoadWithRequest={
                                    request =>
                                        request.url ===
                                            'about:blank' ||
                                        request.url.startsWith(
                                            'data:text/html',
                                        )
                                }
                                onLoadStart={() => {
                                    setPreviewReady(
                                        false,
                                    );
                                    setPreviewError(
                                        null,
                                    );
                                }}
                                onLoadEnd={() => {
                                    setPreviewReady(
                                        true,
                                    );
                                }}
                                onError={event => {
                                    setPreviewReady(
                                        false,
                                    );
                                    setPreviewError(
                                        event
                                            .nativeEvent
                                            .description ||
                                            'The document preview could not be rendered.',
                                    );
                                }}
                            />
                          )}
                </View>

                {previewError && (
                    <Pressable
                        style={styles.pdfErrorBar}
                        onPress={() => {
                            setPreviewReady(false);
                            setPreviewError(null);
                            setPreviewVersion(
                                value => value + 1,
                            );
                        }}
                    >
                        <Text
                            style={styles.pdfErrorText}
                        >
                            {previewError}
                            {' Tap to retry.'}
                        </Text>
                    </Pressable>
                )}

                <View
                    style={[
                        styles.pdfBottomBar,
                        {
                            paddingBottom: Math.max(
                                insets.bottom,
                                10,
                            ),
                        },
                    ]}
                >
                    <Pressable
                        style={styles.pdfBottomBack}
                        onPress={close}
                        disabled={printing}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={C.teal}
                        />

                        <Text
                            style={
                                styles.pdfBottomBackText
                            }
                        >
                            Back
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.pdfBottomSave,
                            saveDisabled &&
                                styles.disabled,
                        ]}
                        onPress={() => {
                            void savePdf();
                        }}
                        disabled={saveDisabled}
                    >
                        <Ionicons
                            name="download-outline"
                            size={20}
                            color="#FFFFFF"
                        />

                        <Text
                            style={
                                styles.pdfBottomSaveText
                            }
                        >
                            {printing
                                ? 'Opening...'
                                : 'Save PDF'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

/* =========================================================
   STYLES - REFERENCE APK COLOURS, SPACING AND CARD SHAPES
========================================================= */

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: 14, paddingBottom: 12, shadowColor: '#001522', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8, zIndex: 2 },
    headerInner: { flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', maxWidth: 1050, alignSelf: 'center' },
    logo: { width: 42, height: 42 },
    headerText: { flex: 1, minWidth: 0 },
    appTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
    appSubtitle: { color: '#d8e7ef', fontSize: 12, marginTop: 2 },
    rolePill: { maxWidth: 100, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#ffffff24', backgroundColor: '#ffffff18' },
    roleText: { color: '#e2ebf1', fontSize: 10 },
    content: { width: '100%', maxWidth: 1050, alignSelf: 'center', paddingHorizontal: 11, paddingTop: 26 },
    flowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12, paddingHorizontal: 2 },
    flowText: { flex: 1, minWidth: 0 },
    flowTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
    flowSubtitle: { fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 16 },
    startButton: { backgroundColor: C.teal, borderRadius: 13, paddingHorizontal: 14, minHeight: 46, justifyContent: 'center', alignItems: 'center' },
    startText: { color: C.white, fontSize: 17, fontWeight: '800' },
    documentActions: { gap: 6, paddingBottom: 11, paddingTop: 1 },
    documentAction: { backgroundColor: '#e8edf1', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 9 },
    documentActionText: { color: '#56697a', fontSize: 11, fontWeight: '800' },
    notice: { backgroundColor: C.notice, borderColor: C.noticeBorder, borderWidth: 1, borderRadius: 13, padding: 11, marginBottom: 11 },
    noticeText: { color: C.noticeText, fontSize: 11.5, lineHeight: 18 },
    separator: { height: 9 },
    documentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, paddingHorizontal: 12, paddingVertical: 15, minHeight: 110 },
    documentIcon: { width: 40, height: 40, backgroundColor: '#e9f5f3', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    documentIconText: { fontSize: 24 },
    documentMain: { flex: 1, minWidth: 0 },
    documentNumber: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '800' },
    documentMeta: { color: C.muted, fontSize: 9.5, lineHeight: 14, marginTop: 3 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 99, marginTop: 6 },
    badgeGood: { backgroundColor: C.softGreen },
    badgeWarning: { backgroundColor: C.softOrange },
    badgeText: { fontSize: 8, fontWeight: '900' },
    badgeGoodText: { color: C.green },
    badgeWarningText: { color: C.orange },
    documentRight: { alignItems: 'flex-end', maxWidth: 154, flexShrink: 0 },
    documentAmount: { fontSize: 14, fontWeight: '900', color: C.ink },
    documentState: { color: C.muted, fontSize: 8, fontWeight: '800', marginTop: 3 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 6 },
    pdfButton: { backgroundColor: C.softTeal, minWidth: 40, minHeight: 44, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
    pdfButtonText: { color: '#08736c', fontSize: 10, fontWeight: '900' },
    convertButton: { backgroundColor: C.teal, minHeight: 44, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
    convertText: { color: C.white, fontSize: 10, fontWeight: '800' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.45 },
    /* =====================================================
   BOTTOM NAVIGATION
===================================================== */

    bottomNavigation: {
        position: 'absolute',

        left: 9,

        right: 9,

        flexDirection: 'row',

        gap: 4,

        padding: 6,

        backgroundColor: '#FFFFFF',

        borderWidth: 1,

        borderColor: C.border,

        borderRadius: 20,

        shadowColor: C.navy,

        shadowOffset: {
            width: 0,
            height: 12,
        },

        shadowOpacity: 0.2,

        shadowRadius: 25,
        elevation: 10,
    },
    navButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonActive: {
        backgroundColor:
            '#E5F5F2',
    },
    navIcon: {
        color: C.muted,
        fontSize: 19,
        marginBottom: 2,
    },
    navActiveText: {
        color: C.teal,
        fontSize: 9,
        fontWeight: '800',
    },
    navText: {
        color: C.muted,
        fontSize: 9,
        fontWeight: '800',
    },

    emptyCard: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 18, padding: 30, alignItems: 'center' },
    emptyIcon: { fontSize: 32 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 8 },
    emptyText: { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 5, textAlign: 'center' },
    retryButton: { marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: C.softTeal, alignSelf: 'flex-start' },
    tools: { marginBottom: 12 },
    searchInput: { backgroundColor: C.white, color: C.ink, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, minHeight: 44, fontSize: 12 },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    summaryItem: { minWidth: '45%', flexGrow: 1, flexBasis: '45%', borderRadius: 12, backgroundColor: C.white, padding: 10 },
    summaryLabel: { color: C.muted, fontSize: 10 },
    summaryValue: { color: C.ink, fontSize: 14, fontWeight: '800', marginTop: 3 },
    hideTools: { color: C.teal, fontSize: 11, marginTop: 7, textAlign: 'right' },

    /* =====================================================
       FULL SCREEN PDF PREVIEW
    ===================================================== */

    pdfScreen: {
        flex: 1,
        backgroundColor: '#EDF4F6',
    },

    pdfTopBar: {
        width: '100%',
        minHeight: 74,
        paddingHorizontal: 12,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#D9E3E8',
        shadowColor: '#08233D',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.12,
        shadowRadius: 7,
        elevation: 5,
        zIndex: 20,
    },

    pdfTopBack: {
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EAF1F4',
    },

    pdfTopTitleArea: {
        flex: 1,
        minWidth: 0,
    },

    pdfTopTitle: {
        color: '#122A3B',
        fontSize: 18,
        fontWeight: '900',
    },

    pdfTopSubtitle: {
        color: '#74828B',
        fontSize: 9,
        marginTop: 2,
    },

    pdfTopSave: {
        minHeight: 42,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 15,
        borderRadius: 15,
        backgroundColor: C.teal,
    },

    pdfTopSaveText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },

    pdfPreviewArea: {
        flex: 1,
        width: '100%',
        backgroundColor: '#EDF4F6',
    },

    pdfWebView: {
        flex: 1,
        backgroundColor: '#EDF4F6',
    },

    pdfErrorBar: {
        backgroundColor: '#FFF0EE',
        borderTopWidth: 1,
        borderColor: '#F1C1BD',
        paddingHorizontal: 14,
        paddingVertical: 8,
    },

    pdfErrorText: {
        color: C.red,
        fontSize: 10,
        textAlign: 'center',
    },

    pdfBottomBar: {
        width: '100%',
        minHeight: 78,
        paddingTop: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#D9E3E8',
        shadowColor: '#08233D',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },

    pdfBottomBack: {
        minWidth: 150,
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 17,
        borderRadius: 15,
        backgroundColor: '#E6F5F2',
    },

    pdfBottomBackText: {
        color: C.teal,
        fontSize: 15,
        fontWeight: '900',
    },

    pdfBottomSave: {
        minWidth: 168,
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 18,
        borderRadius: 15,
        backgroundColor: C.teal,
    },

    pdfBottomSaveText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
    },
});
