import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";

import {
  StatusBar,
} from "expo-status-bar";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  WebView,
} from "react-native-webview";

import {
  Ionicons,
} from "@expo/vector-icons";

import * as Print from "expo-print";

import {
  getBusiness,
} from "../src/repositories/businessRepository";

import {
  loadPurchaseWorkflowDocument,
} from "../src/services/purchaseService";

import type {
  WorkflowDetail,
} from "../src/repositories/purchaseRepository";

/* =========================================================
   COLORS
========================================================= */

const C = {
  navy: "#08233D",

  teal: "#07867D",

  background: "#EDF4F6",

  white: "#FFFFFF",

  text: "#173042",

  muted: "#68757D",

  border: "#D7E2E7",

  red: "#B33B34",
};

/* =========================================================
   TYPES
========================================================= */

type BusinessIdentity = {
  id: string;

  name: string;

  gstin: string;

  businessType: string;
};

type PurchasePreview = {
  html: string;

  documentNumber: string;

  businessId: string;
};

/* =========================================================
   HELPERS
========================================================= */

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function record(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object"
    ? (
        value as
          Record<string, unknown>
      )
    : {};
}

function businessIdentity(
  value: unknown,
): BusinessIdentity | null {
  if (!value) {
    return null;
  }

  const row =
    record(
      value,
    );

  if (!text(row.id)) {
    throw new Error(
      "The active business has no valid ID.",
    );
  }

  return {
    id:
      text(
        row.id,
      ),

    name:
      text(
        row.name,
      ),

    gstin:
      text(
        row.gstin,
      ),

    businessType:
      text(
        row.business_type,
      ) ||
      text(
        row.businessType,
      ),
  };
}

function number(
  value:
    | number
    | null
    | undefined,
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : 0;
}

function money(
  value:
    | number
    | null
    | undefined,
): string {
  return `₹${number(
    value,
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,

      maximumFractionDigits: 2,
    },
  )}`;
}

function quantity(
  value: number,
): string {
  return number(
    value,
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 6,
    },
  );
}

function escapeHtml(
  value: unknown,
): string {
  return String(
    value ?? "",
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function multiline(
  value: string,
): string {
  return escapeHtml(
    value,
  ).replace(
    /\r?\n/g,
    "<br>",
  );
}

function fiscalYear(
  date: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-\d{2}$/.exec(
      date,
    );

  if (!match) {
    return "—";
  }

  const year =
    Number(
      match[1],
    );

  const start =
    Number(
      match[2],
    ) >= 4
      ? year
      : year - 1;

  return `${start}-${String(
    start + 1,
  ).slice(-2)}`;
}

function errorText(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Please try again.";
}

/* =========================================================
   BUILD PURCHASE PDF HTML
========================================================= */

function buildPurchaseHtml(
  detail: WorkflowDetail,
  currentBusiness: BusinessIdentity,
): PurchasePreview {
  const d =
    detail.document;

  if (
    d.business_id !==
    currentBusiness.id
  ) {
    throw new Error(
      "The purchase bill does not belong to the active business.",
    );
  }

  const business =
    d.business;

  const businessName =
    business.name ||
    currentBusiness.name ||
    "Business";

  const gstin =
    business.gstin ||
    (
      d.snapshot_is_current
        ? currentBusiness.gstin
        : ""
    );

  const address =
    text(
      business.address,
    );

  const pan =
    text(
      business.pan,
    );

  const phone =
    text(
      business.mobile,
    );

  const email =
    text(
      business.email,
    );

  const vendorName =
    d.vendor_name ||
    d.vendor.name ||
    "Vendor";

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

  const paymentStatus =
    d.payment_status ||
    (
      d.due_amount > 0
        ? "DUE"
        : "PAID"
    );

  const vendorDetails = [
    vendorGstin
      ? `GSTIN ${vendorGstin}`
      : "",

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
      "<br>",
    );

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
              : "";

          return `
            <tr>

              <td>

                <div class="item-name">
                  ${escapeHtml(
                    line.product_name,
                  )}
                </div>

                <div class="item-sub">
                  HSN:
                  ${escapeHtml(
                    line.hsn ||
                      "—",
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

                ${
                  line.unit
                    ? escapeHtml(
                        line.unit,
                      )
                    : ""
                }

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
      .join("");

  const taxLabel =
    d.supply_type ===
    "OTHER_STATE"
      ? "IGST"
      : "GST";

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
      : "";

  const html = `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<style>

@page {
  size: A4 portrait;

  margin: 8mm;
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
  background: #edf4f6;

  color: #173042;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  font-size: 10px;

  line-height: 1.35;
}

.preview-background {
  width: 100%;

  min-height: 100vh;

  padding: 7px;
}

.paper {
  width: 100%;

  max-width: 820px;

  margin: 0 auto;

  background: #ffffff;

  border: 1px solid #d7e2e7;

  border-radius: 18px;

  overflow: hidden;

  box-shadow:
    0 8px 26px
    rgba(
      8,
      35,
      61,
      0.08
    );
}

.paper-inner {
  padding:
    16px
    18px
    18px;
}

/* =======================================================
   HEADER
======================================================= */

.top-row {
  display: flex;

  align-items:
    flex-start;

  justify-content:
    space-between;

  gap: 14px;
}

.business-block {
  flex: 1;

  min-width: 0;
}

.business-name {
  margin: 0;

  color: #123149;

  font-size: 23px;

  line-height: 1.08;

  font-weight: 900;

  overflow-wrap:
    anywhere;
}

.business-contact {
  margin-top: 8px;

  color: #67747c;

  font-size: 8px;

  line-height: 1.4;

  overflow-wrap:
    anywhere;
}

.document-block {
  flex-shrink: 0;

  text-align: right;

  padding-top: 2px;
}

.document-type {
  color: #07867d;

  font-size: 8px;

  font-weight: 900;

  letter-spacing:
    0.8px;

  text-transform:
    uppercase;
}

.document-number {
  margin-top: 3px;

  color: #123149;

  font-size: 17px;

  line-height: 1.08;

  font-weight: 900;

  overflow-wrap:
    anywhere;
}

.status-text {
  margin-top: 3px;

  color: #7a878e;

  font-size: 7px;

  font-weight: 800;

  text-transform:
    uppercase;
}

.teal-rule {
  width: 100%;

  height: 4px;

  border-radius: 99px;

  background: #0b9388;

  margin:
    16px
    0
    17px;
}

/* =======================================================
   INFO
======================================================= */

.info-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 9px;

  margin-bottom:
    15px;
}

.info-card {
  border:
    1px solid
    #bedbd7;

  border-radius:
    9px;

  background:
    #eef8f6;

  padding:
    10px 12px;

  min-height:
    92px;
}

.info-label {
  color: #75848d;

  font-size: 7px;

  font-weight: 900;

  letter-spacing:
    0.6px;

  text-transform:
    uppercase;

  margin-bottom:
    6px;
}

.vendor-name {
  color: #173042;

  font-size: 11px;

  font-weight: 900;

  overflow-wrap:
    anywhere;
}

.vendor-detail {
  color: #68757d;

  margin-top: 3px;

  font-size: 8px;

  line-height: 1.4;

  overflow-wrap:
    anywhere;
}

.detail-row {
  margin:
    4px 0;

  color: #68757d;

  font-size: 8px;
}

.detail-row b {
  color: #213b4d;
}

/* =======================================================
   TABLE
======================================================= */

.items-wrap {
  border:
    1px solid
    #cdd8dd;

  border-radius:
    11px;

  overflow: hidden;

  margin-bottom:
    16px;
}

table {
  width: 100%;

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
  color: #294351;

  font-size: 7px;

  font-weight: 900;

  padding:
    8px 6px;

  text-align: left;
}

td {
  padding:
    8px 6px;

  border-top:
    1px solid
    #e1e8eb;

  vertical-align:
    middle;

  color: #2b414f;

  font-size: 8px;

  overflow-wrap:
    anywhere;
}

.center {
  text-align:
    center;
}

.right {
  text-align:
    right;
}

.strong {
  font-weight:
    900;
}

.item-name {
  color: #203848;

  font-weight: 900;

  font-size: 8px;
}

.item-sub {
  color: #7a878f;

  font-size:
    6.5px;

  margin-top: 2px;
}

/* =======================================================
   TOTALS
======================================================= */

.totals-card {
  width: 100%;

  border:
    1px solid
    #d7e0e4;

  border-radius:
    9px;

  background:
    #fbfdfd;

  padding:
    12px 14px;

  margin-bottom:
    17px;
}

.total-row {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;

  margin:
    5px 0;

  color: #68757d;

  font-size: 8px;
}

.total-row b {
  color: #233d4d;
}

.total-divider {
  height: 1px;

  width: 100%;

  background:
    #d7e0e4;

  margin:
    10px 0;
}

.grand-total {
  display: flex;

  align-items:
    baseline;

  justify-content:
    space-between;

  gap: 15px;

  color: #123149;

  font-size: 13px;

  font-weight: 900;
}

.grand-amount {
  font-size: 17px;

  font-weight: 900;

  color: #123149;
}

.settlement {
  display: flex;

  justify-content:
    flex-end;

  flex-wrap: wrap;

  gap: 6px;

  margin-top: 8px;

  color: #68757d;

  font-size: 7px;
}

.settlement b {
  color: #233d4d;
}

.due-text {
  color: #a46800;
}

/* =======================================================
   PAYMENT
======================================================= */

.payment-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 9px;

  margin-bottom:
    17px;
}

.payment-card {
  display: flex;

  gap: 8px;

  border:
    1px solid
    #cdd7dc;

  border-radius:
    9px;

  padding: 10px;

  min-height:
    94px;

  background:
    #ffffff;
}

.payment-icon {
  width: 28px;

  height: 28px;

  flex:
    0 0 28px;

  display: flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    9px;

  background:
    #e4f5f2;

  color: #07867d;

  font-size: 12px;
}

.payment-title {
  color: #203848;

  font-size: 8px;

  font-weight: 900;

  margin-bottom:
    3px;
}

.payment-text {
  color: #69767e;

  font-size: 7px;

  line-height: 1.4;
}

/* =======================================================
   FOOTER
======================================================= */

.business-note {
  margin-bottom:
    12px;

  color: #263f4f;

  font-size: 8px;
}

.business-note div {
  color: #69767e;

  margin-top: 3px;
}

.terms-title {
  color: #173042;

  font-size: 8px;

  font-weight: 900;
}

.terms-text {
  margin-top: 4px;

  color: #68757d;

  line-height: 1.4;

  font-size: 7px;
}

.thank-you {
  color: #173042;

  font-weight: 900;

  margin-top: 16px;

  font-size: 8px;
}

.signature {
  text-align: right;

  margin-top: 42px;

  color: #173042;
}

.signature-name {
  font-weight: 900;

  font-size: 8px;
}

.signature-for {
  color: #68757d;

  margin-top: 2px;

  font-size: 7px;
}

.footer-note {
  color: #7d8990;

  font-size: 6px;

  margin-top: 14px;

  text-align:
    center;
}

@media print {

  body {
    background:
      #ffffff;

    font-size:
      8.5pt;
  }

  .preview-background {
    padding: 0;
  }

  .paper {
    max-width:
      none;

    border: 0;

    border-radius:
      0;

    box-shadow:
      none;
  }

  .paper-inner {
    padding: 0;
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

  tr,
  .signature {
    break-inside:
      avoid;

    page-break-inside:
      avoid;
  }
}

</style>

</head>

<body>

<div class="preview-background">

<main class="paper">

<div class="paper-inner">

  <!-- HEADER -->

  <section class="top-row">

    <div class="business-block">

      <h1 class="business-name">
        ${escapeHtml(
          businessName,
        )}
      </h1>

      <div class="business-contact">

        ${
          address
            ? `${multiline(
                address,
              )}<br>`
            : ""
        }

        GSTIN
        ${escapeHtml(
          gstin ||
            "—",
        )}

        ${
          pan
            ? `
              &bull;
              PAN
              ${escapeHtml(
                pan,
              )}
            `
            : ""
        }

        ${
          phone ||
          email
            ? `
              <br>

              ${
                phone
                  ? escapeHtml(
                      phone,
                    )
                  : ""
              }

              ${
                phone &&
                email
                  ? " &bull; "
                  : ""
              }

              ${
                email
                  ? escapeHtml(
                      email,
                    )
                  : ""
              }
            `
            : ""
        }

      </div>

    </div>

    <div class="document-block">

      <div class="document-type">
        PURCHASE BILL
      </div>

      <div class="document-number">
        ${escapeHtml(
          d.document_number,
        )}
      </div>

      <div class="status-text">
        ${escapeHtml(
          paymentStatus,
        )}
      </div>

    </div>

  </section>

  <div class="teal-rule"></div>

  <!-- VENDOR / DOCUMENT -->

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

        Due:

        <b>
          ${escapeHtml(
            d.due_date ||
              "—",
          )}
        </b>

      </div>

      ${
        d.invoice_number
          ? `
            <div class="detail-row">

              Invoice:

              <b>
                ${escapeHtml(
                  d.invoice_number,
                )}
              </b>

            </div>
          `
          : ""
      }

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

    </div>

  </section>

  <!-- ITEMS -->

  <section class="items-wrap">

    <table>

      <colgroup>

        <col style="width:40%" />

        <col style="width:13%" />

        <col style="width:16%" />

        <col style="width:11%" />

        <col style="width:20%" />

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
                class="center"
              >
                No saved item rows found.
              </td>

            </tr>
          `
        }

      </tbody>

    </table>

  </section>

  <!-- TOTALS -->

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

    ${
      d.discount > 0
        ? `
          <div class="total-row">

            <span>
              Discount
            </span>

            <b>
              ${escapeHtml(
                money(
                  d.discount,
                ),
              )}
            </b>

          </div>
        `
        : ""
    }

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

    <div class="total-divider"></div>

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

      <span>
        •
      </span>

      <span>

        Due

        <b class="${
          d.due_amount > 0
            ? "due-text"
            : ""
        }">
          ${escapeHtml(
            money(
              d.due_amount,
            ),
          )}
        </b>

      </span>

    </div>

  </section>

  ${noteHtml}

  <!-- PAYMENT -->

  <section class="payment-grid">

    <div class="payment-card">

      <div class="payment-icon">
        💳
      </div>

      <div>

        <div class="payment-title">
          Bank / UPI payment
        </div>

        <div class="payment-text">

          Add your business bank
          and UPI details from
          business settings.

        </div>

      </div>

    </div>

    <div class="payment-card">

      <div class="payment-icon">
        📄
      </div>

      <div>

        <div class="payment-title">
          Cheque information
        </div>

        <div class="payment-text">

          Account Payee only.

          <br>

          Mention document number
          behind the cheque.

        </div>

      </div>

    </div>

  </section>

  <!-- TERMS -->

  <section>

    <div class="terms-title">
      Terms &amp; Conditions
    </div>

    <div class="terms-text">

      Payment due as stated.

      Goods once received are
      subject to the stated
      return policy.

    </div>

    <div class="thank-you">
      Thank you for your business.
    </div>

  </section>

  <!-- SIGNATURE -->

  <section class="signature">

    <div class="signature-name">
      Authorised Signatory
    </div>

    <div class="signature-for">
      For
      ${escapeHtml(
        businessName,
      )}
    </div>

  </section>

  <div class="footer-note">
    Computer-generated document;
    verify legal and tax details
    before live use.
  </div>

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

    businessId:
      d.business_id,
  };
}

/* =========================================================
   SCREEN
========================================================= */

export default function PurchasePreviewScreen() {
  const {
    purchaseId,
  } =
    useLocalSearchParams<{
      purchaseId?: string;
    }>();

  const insets =
    useSafeAreaInsets();

  const [
    preview,
    setPreview,
  ] =
    useState<PurchasePreview | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    printing,
    setPrinting,
  ] =
    useState(false);

  const [
    previewReady,
    setPreviewReady,
  ] =
    useState(false);

  const [
    previewError,
    setPreviewError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    previewVersion,
    setPreviewVersion,
  ] =
    useState(0);

  const iframe =
    useRef<HTMLIFrameElement | null>(
      null,
    );

  const printLock =
    useRef(false);

  const alive =
    useRef(true);

  /* =======================================================
     LIFECYCLE
  ======================================================= */

  useEffect(() => {
    alive.current =
      true;

    return () => {
      alive.current =
        false;
    };
  }, []);

  /* =======================================================
     LOAD PURCHASE
  ======================================================= */

  useEffect(() => {
    let active =
      true;

    async function load() {
      if (!purchaseId) {
        setLoading(
          false,
        );

        Alert.alert(
          "Purchase not found",
          "Purchase ID is missing.",
        );

        return;
      }

      try {
        setLoading(
          true,
        );

        setPreviewError(
          null,
        );

        const business =
          businessIdentity(
            await getBusiness(),
          );

        if (!business) {
          throw new Error(
            "Business setup is required.",
          );
        }

        const detail =
          await loadPurchaseWorkflowDocument(
            "PURCHASE",
            purchaseId,
          );

        if (!active) {
          return;
        }

        if (!detail) {
          throw new Error(
            "Purchase bill could not be found.",
          );
        }

        setPreview(
          buildPurchaseHtml(
            detail,
            business,
          ),
        );
      } catch (error) {
        if (!active) {
          return;
        }

        Alert.alert(
          "Unable to open purchase PDF",
          errorText(
            error,
          ),
        );
      } finally {
        if (
          active
        ) {
          setLoading(
            false,
          );
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [
    purchaseId,
  ]);

  /* =======================================================
     WEBVIEW SOURCE
  ======================================================= */

  const source =
    useMemo(
      () => ({
        html:
          preview?.html ||
          "",
      }),
      [
        preview?.html,
      ],
    );

  /* =======================================================
     SAVE / PRINT
  ======================================================= */

  async function savePdf() {
    if (
      !preview ||
      printLock.current ||
      !previewReady ||
      previewError
    ) {
      return;
    }

    printLock.current =
      true;

    setPrinting(
      true,
    );

    try {
      if (
        Platform.OS ===
        "web"
      ) {
        const frame =
          iframe.current
            ?.contentWindow;

        if (!frame) {
          throw new Error(
            "The PDF preview is not available.",
          );
        }

        frame.focus();

        frame.print();

        return;
      }

      await Print.printAsync({
        html:
          preview.html,
      });
    } catch (error) {
      const message =
        errorText(
          error,
        );

      if (
        !/cancel/i.test(
          message,
        ) &&
        alive.current
      ) {
        Alert.alert(
          "Unable to save PDF",
          message,
        );
      }
    } finally {
      printLock.current =
        false;

      if (
        alive.current
      ) {
        setPrinting(
          false,
        );
      }
    }
  }

  const saveDisabled =
    loading ||
    !preview ||
    !previewReady ||
    printing ||
    Boolean(
      previewError,
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View
      style={
        styles.screen
      }
    >
      <Stack.Screen
        options={{
          headerShown:
            false,
        }}
      />

      <StatusBar
        style="light"
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={[
          styles.header,

          {
            paddingTop:
              Math.max(
                insets.top,
                8,
              ),
          },
        ]}
      >
        {/* BACK */}

        <Pressable
          onPress={() =>
            router.back()
          }
          disabled={
            printing
          }
          style={({
            pressed,
          }) => [
            styles.backButton,

            pressed &&
              styles.backButtonPressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={
              C.navy
            }
          />
        </Pressable>

        {/* TITLE */}

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={
              styles.headerTitle
            }
            numberOfLines={
              1
            }
          >
            Purchase Bill
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
            numberOfLines={
              1
            }
          >
            {preview
              ?.documentNumber ||
              "Loading purchase..."}
          </Text>
        </View>

        {/* SAVE */}

        <Pressable
          onPress={() => {
            void savePdf();
          }}
          disabled={
            saveDisabled
          }
          style={({
            pressed,
          }) => [
            styles.saveButton,

            saveDisabled &&
              styles.disabled,

            pressed &&
              !saveDisabled &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name={
              printing
                ? "hourglass-outline"
                : "download-outline"
            }
            size={17}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.saveButtonText
            }
          >
            {printing
              ? "Opening..."
              : "Save PDF"}
          </Text>
        </Pressable>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <View
        style={
          styles.previewArea
        }
      >
        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <Ionicons
              name="document-text-outline"
              size={34}
              color={
                C.teal
              }
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Loading purchase bill
            </Text>

            <Text
              style={
                styles.loadingSubtitle
              }
            >
              Preparing the saved PDF preview...
            </Text>
          </View>
        ) : !preview ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={
                C.red
              }
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Purchase PDF unavailable
            </Text>

            <Pressable
              style={
                styles.returnButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.returnButtonText
                }
              >
                Go back
              </Text>
            </Pressable>
          </View>
        ) : Platform.OS ===
          "web" ? (
          React.createElement(
            "iframe",
            {
              key:
                previewVersion,

              ref:
                iframe,

              title:
                `${preview.documentNumber} preview`,

              srcDoc:
                preview.html,

              sandbox:
                "allow-same-origin allow-modals",

              onLoad:
                () => {
                  setPreviewError(
                    null,
                  );

                  setPreviewReady(
                    true,
                  );
                },

              style: {
                width:
                  "100%",

                height:
                  "100%",

                border:
                  0,

                background:
                  C.background,
              },
            },
          )
        ) : (
          <WebView
            key={
              previewVersion
            }
            source={
              source
            }
            originWhitelist={[
              "*",
            ]}
            style={
              styles.webView
            }
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
            textZoom={
              100
            }
            overScrollMode="never"
            showsVerticalScrollIndicator
            showsHorizontalScrollIndicator={
              false
            }
            onShouldStartLoadWithRequest={request =>
              request.url ===
                "about:blank" ||
              request.url.startsWith(
                "data:text/html",
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
                event.nativeEvent
                  .description ||
                  "The purchase PDF could not be rendered.",
              );
            }}
          />
        )}
      </View>

      {/* =================================================
          ERROR BAR
      ================================================= */}

      {previewError && (
        <Pressable
          style={
            styles.errorBar
          }
          onPress={() => {
            setPreviewReady(
              false,
            );

            setPreviewError(
              null,
            );

            setPreviewVersion(
              value =>
                value + 1,
            );
          }}
        >
          <Text
            style={
              styles.errorText
            }
          >
            {previewError}
            {" Tap to retry."}
          </Text>
        </Pressable>
      )}

      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <View
        style={[
          styles.bottomBar,

          {
            paddingBottom:
              Math.max(
                insets.bottom,
                10,
              ),
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          disabled={
            printing
          }
          style={({
            pressed,
          }) => [
            styles.bottomBackButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={17}
            color={
              C.teal
            }
          />

          <Text
            style={
              styles.bottomBackText
            }
          >
            Back
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            void savePdf();
          }}
          disabled={
            saveDisabled
          }
          style={({
            pressed,
          }) => [
            styles.bottomSaveButton,

            saveDisabled &&
              styles.disabled,

            pressed &&
              !saveDisabled &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name={
              printing
                ? "hourglass-outline"
                : "download-outline"
            }
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.bottomSaveText
            }
          >
            {printing
              ? "Opening..."
              : "Save PDF"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        C.background,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 68,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      paddingHorizontal:
        11,

      paddingBottom: 9,

      backgroundColor:
        C.navy,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#143A55",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity:
        0.16,

      shadowRadius: 5,

      elevation: 6,

      zIndex: 20,
    },

    backButton: {
      width: 34,

      height: 34,

      flexShrink: 0,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#D9E3E7",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 1,
      },

      shadowOpacity:
        0.15,

      shadowRadius: 3,

      elevation: 4,
    },

    backButtonPressed: {
      opacity: 0.7,

      transform: [
        {
          scale: 0.95,
        },
      ],
    },

    headerText: {
      flex: 1,

      minWidth: 0,
    },

    headerTitle: {
      color:
        "#FFFFFF",

      fontSize: 15,

      fontWeight:
        "900",
    },

    headerSubtitle: {
      color:
        "#D6E5EC",

      fontSize: 8.5,

      marginTop: 2,
    },

    saveButton: {
      minHeight: 38,

      flexShrink: 0,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal:
        11,

      borderRadius: 10,

      backgroundColor:
        C.teal,
    },

    saveButtonText: {
      color:
        "#FFFFFF",

      fontSize: 9.5,

      fontWeight:
        "900",
    },

    /* =====================================================
       PREVIEW
    ===================================================== */

    previewArea: {
      flex: 1,

      width: "100%",

      backgroundColor:
        C.background,
    },

    webView: {
      flex: 1,

      backgroundColor:
        C.background,
    },

    /* =====================================================
       LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        20,
    },

    loadingTitle: {
      color:
        C.text,

      fontSize: 14,

      fontWeight:
        "900",

      marginTop: 10,

      textAlign:
        "center",
    },

    loadingSubtitle: {
      color:
        C.muted,

      fontSize: 9,

      marginTop: 4,

      textAlign:
        "center",
    },

    returnButton: {
      minHeight: 38,

      marginTop: 14,

      paddingHorizontal:
        18,

      borderRadius: 10,

      backgroundColor:
        C.teal,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    returnButtonText: {
      color:
        "#FFFFFF",

      fontSize: 10,

      fontWeight:
        "900",
    },

    /* =====================================================
       ERROR
    ===================================================== */

    errorBar: {
      backgroundColor:
        "#FFF0EE",

      borderTopWidth:
        1,

      borderColor:
        "#F1C1BD",

      paddingHorizontal:
        14,

      paddingVertical:
        8,
    },

    errorText: {
      color:
        C.red,

      fontSize: 9,

      textAlign:
        "center",
    },

    /* =====================================================
       BOTTOM
    ===================================================== */

    bottomBar: {
      minHeight: 64,

      width: "100%",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "flex-end",

      gap: 8,

      paddingTop: 8,

      paddingHorizontal:
        10,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth:
        1,

      borderTopColor:
        "#D9E3E8",

      shadowColor:
        C.navy,

      shadowOffset: {
        width: 0,

        height: -3,
      },

      shadowOpacity:
        0.1,

      shadowRadius: 7,

      elevation: 8,
    },

    bottomBackButton: {
      minHeight: 42,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal:
        15,

      borderRadius: 11,

      backgroundColor:
        "#E6F5F2",
    },

    bottomBackText: {
      color:
        C.teal,

      fontSize: 10,

      fontWeight:
        "900",
    },

    bottomSaveButton: {
      minHeight: 42,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal:
        15,

      borderRadius: 11,

      backgroundColor:
        C.teal,
    },

    bottomSaveText: {
      color:
        "#FFFFFF",

      fontSize: 10,

      fontWeight:
        "900",
    },

    disabled: {
      opacity: 0.45,
    },

    pressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.97,
        },
      ],
    },
  });