import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
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

import { colors } from "../src/theme/colors";

type BusinessIdentity = {
  id: string;
  name: string;
  gstin: string;
  businessType: string;
};

type BusinessPreview = {
  name: string;
  address: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
};

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function record(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function businessIdentity(
  value: unknown,
): BusinessIdentity | null {
  if (!value) {
    return null;
  }

  const row = record(value);

  if (!text(row.id)) {
    throw new Error(
      "The active business has no valid ID.",
    );
  }

  return {
    id: text(row.id),
    name: text(row.name),
    gstin: text(row.gstin),
    businessType:
      text(row.business_type) ||
      text(row.businessType),
  };
}

function number(
  value: number | null | undefined,
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function money(
  value: number | null | undefined,
): string {
  return `₹${number(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function quantity(value: number): string {
  return number(value).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 6,
    },
  );
}

function escapeHtml(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function multiline(
  value: string,
): string {
  return escapeHtml(value).replace(
    /\r?\n/g,
    "<br>",
  );
}

function displayDate(
  value: string,
): string {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fiscalYear(
  value: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-\d{2}$/.exec(
      value,
    );

  if (!match) {
    return "—";
  }

  const year = Number(match[1]);

  const start =
    Number(match[2]) >= 4
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

function buildPurchaseHtml(
  detail: WorkflowDetail,
  currentBusiness: BusinessIdentity,
): string {
  const d = detail.document;

  if (d.document_type !== "PURCHASE") {
    throw new Error(
      "This PDF template only supports Purchase Bills.",
    );
  }

  if (d.business_id !== currentBusiness.id) {
    throw new Error(
      "The purchase bill does not belong to the active business.",
    );
  }

  const business = d.business;

  const businessName =
    business.name ||
    currentBusiness.name ||
    "Business";

  const gstin =
    business.gstin ||
    (d.snapshot_is_current
      ? currentBusiness.gstin
      : "");

  const address =
    text(business.address);

  const pan =
    text(business.pan);

  const phone =
    text(business.mobile);

  const email =
    text(business.email);

  const vendorName =
    d.vendor_name ||
    d.vendor.name ||
    "Vendor";

  const vendorGstin =
    text(d.vendor.gstin);

  const vendorAddress =
    text(d.vendor.address);

  const vendorState =
    text(d.vendor.state);

  const paymentStatus =
    d.payment_status ||
    (d.due_amount > 0
      ? "DUE"
      : "PAID");

  const contactLine = [
    phone,
    email,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" • ");

  const taxLine = [
    gstin
      ? `GSTIN ${escapeHtml(gstin)}`
      : "",
    pan
      ? `PAN ${escapeHtml(pan)}`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const vendorDetails = [
    vendorGstin
      ? `GSTIN ${vendorGstin}`
      : "",
    vendorAddress,
    vendorState,
  ]
    .filter(Boolean)
    .map(line => escapeHtml(line))
    .join("<br>");

  const rows =
    detail.items
      .map(
        line => `
          <tr>
            <td class="item">
              <strong>
                ${escapeHtml(line.product_name)}
              </strong>
              ${
                line.discount > 0
                  ? `
                    <div class="item-sub">
                      Discount:
                      ${escapeHtml(money(line.discount))}
                    </div>
                  `
                  : ""
              }
            </td>

            <td class="center">
              ${escapeHtml(line.hsn || "-")}
            </td>

            <td class="center">
              ${escapeHtml(quantity(line.quantity))}
              ${
                line.unit
                  ? ` ${escapeHtml(line.unit)}`
                  : ""
              }
            </td>

            <td class="right">
              ${escapeHtml(money(line.unit_price))}
            </td>

            <td class="center">
              ${escapeHtml(quantity(line.gst_rate))}%
            </td>

            <td class="right strong">
              ${escapeHtml(money(line.total_amount))}
            </td>
          </tr>
        `,
      )
      .join("");

  const taxLabel =
    d.supply_type === "OTHER_STATE"
      ? "IGST"
      : "GST";

  const notesHtml =
    d.notes
      ? `
        <div class="section">
          <div class="section-title">
            Notes
          </div>

          <div class="section-body">
            ${multiline(d.notes)}
          </div>
        </div>
      `
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<style>
  @page {
    size: A4;
    margin: 14mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Arial,
      Helvetica,
      sans-serif;
    color: #17212b;
    font-size: 11px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .invoice {
    width: 100%;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
    gap: 16px;
  }

  .business-name {
    font-size: 27px;
    font-weight: 800;
    color: #102a43;
    letter-spacing: -0.4px;
    margin-bottom: 7px;
    overflow-wrap: anywhere;
  }

  .business-details {
    color: #52606d;
    line-height: 1.55;
    font-size: 10.5px;
    overflow-wrap: anywhere;
  }

  .invoice-label {
    text-align: right;
    flex-shrink: 0;
  }

  .invoice-type {
    color: #07877e;
    text-transform: uppercase;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.2px;
  }

  .invoice-number {
    font-size: 18px;
    font-weight: 800;
    color: #102a43;
    margin-top: 3px;
    overflow-wrap: anywhere;
  }

  .accent-line {
    width: 100%;
    height: 3px;
    background: #0b948b;
    margin: 14px 0 18px 0;
  }

  .meta-grid {
    width: 100%;
    display: table;
    table-layout: fixed;
    margin-bottom: 17px;
  }

  .meta-box {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    padding: 12px 14px;
    background: #f3faf9;
    border: 1px solid #c9e7e2;
  }

  .meta-box:first-child {
    border-right: 0;
  }

  .label {
    color: #60717d;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .value {
    color: #17212b;
    font-size: 11px;
    font-weight: 700;
  }

  .small-value {
    color: #46535d;
    font-size: 10px;
    margin-top: 3px;
    overflow-wrap: anywhere;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 5px;
    page-break-inside: auto;
    table-layout: fixed;
  }

  thead {
    display: table-header-group;
  }

  tr {
    page-break-inside: avoid;
  }

  th {
    background: #eef7f6;
    color: #243b53;
    font-size: 9px;
    font-weight: 800;
    padding: 9px 7px;
    border: 1px solid #b9c8ce;
    text-align: left;
  }

  td {
    color: #253642;
    font-size: 9.5px;
    padding: 10px 7px;
    border: 1px solid #cbd5da;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }

  td.item {
    width: 31%;
  }

  .item-sub {
    color: #7a878f;
    font-size: 8px;
    margin-top: 3px;
  }

  .center {
    text-align: center;
  }

  .right {
    text-align: right;
  }

  .strong {
    font-weight: 700;
  }

  .summary-wrap {
    width: 48%;
    margin-left: auto;
    margin-top: 18px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    color: #52606d;
  }

  .summary-row strong {
    color: #17212b;
    text-align: right;
  }

  .summary-divider {
    height: 1px;
    background: #ccd6dc;
    margin: 7px 0;
  }

  .grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    color: #102a43;
    font-size: 17px;
    font-weight: 800;
    padding-top: 3px;
  }

  .payment-status {
    margin-top: 11px;
    padding: 9px 11px;
    background: #f7fafc;
    border-radius: 6px;
    color: #43515b;
    font-size: 10px;
  }

  .due {
    color: #9b6500;
  }

  .section {
    margin-top: 19px;
  }

  .section-title {
    color: #102a43;
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 5px;
  }

  .section-body {
    color: #4b5963;
    font-size: 10px;
    line-height: 1.55;
  }

  .payment-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-top: 18px;
  }

  .payment-box {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    border: 1px solid #ccd6dc;
    padding: 12px;
    color: #43515b;
    font-size: 9.5px;
    line-height: 1.5;
  }

  .payment-box:first-child {
    border-right: 0;
  }

  .payment-title {
    color: #102a43;
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 4px;
  }

  .footer-area {
    margin-top: 32px;
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .footer-note {
    display: table-cell;
    width: 55%;
    vertical-align: bottom;
    color: #718096;
    font-size: 8.5px;
  }

  .signature {
    display: table-cell;
    width: 45%;
    text-align: right;
    vertical-align: bottom;
    padding-top: 28px;
  }

  .signature-title {
    color: #17212b;
    font-weight: 800;
    font-size: 10px;
  }

  .signature-business {
    color: #52606d;
    font-size: 9px;
    margin-top: 3px;
  }

  @media print {
    thead {
      display: table-header-group;
    }

    tr,
    .meta-box,
    .payment-box,
    .summary-wrap,
    .signature {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
</style>
</head>

<body>

<div class="invoice">

  <div class="top">

    <div>

      <div class="business-name">
        ${escapeHtml(businessName)}
      </div>

      <div class="business-details">
        ${address ? `${multiline(address)}<br>` : ""}
        ${taxLine ? `${taxLine}<br>` : ""}
        ${contactLine || ""}
      </div>

    </div>

    <div class="invoice-label">

      <div class="invoice-type">
        Purchase Bill
      </div>

      <div class="invoice-number">
        ${escapeHtml(d.document_number)}
      </div>

    </div>

  </div>

  <div class="accent-line"></div>

  <div class="meta-grid">

    <div class="meta-box">

      <div class="label">
        Vendor
      </div>

      <div class="value">
        ${escapeHtml(vendorName)}
      </div>

      <div class="small-value">
        ${vendorDetails || "Vendor / Supplier"}
      </div>

    </div>

    <div class="meta-box">

      <div class="label">
        Purchase Details
      </div>

      <div class="small-value">
        <strong>Date:</strong>
        ${escapeHtml(displayDate(d.document_date))}
      </div>

      ${
        d.due_date
          ? `
            <div class="small-value">
              <strong>Due:</strong>
              ${escapeHtml(displayDate(d.due_date))}
            </div>
          `
          : ""
      }

      ${
        d.invoice_number
          ? `
            <div class="small-value">
              <strong>Supplier invoice:</strong>
              ${escapeHtml(d.invoice_number)}
            </div>
          `
          : ""
      }

      <div class="small-value">
        <strong>Financial year:</strong>
        ${escapeHtml(fiscalYear(d.document_date))}
      </div>

      <div class="small-value">
        <strong>Status:</strong>
        ${escapeHtml(paymentStatus)}
      </div>

    </div>

  </div>

  <table>

    <colgroup>
      <col style="width:31%">
      <col style="width:13%">
      <col style="width:11%">
      <col style="width:15%">
      <col style="width:10%">
      <col style="width:20%">
    </colgroup>

    <thead>

      <tr>
        <th>Item / Service</th>
        <th class="center">HSN / SAC</th>
        <th class="center">Qty</th>
        <th class="right">Rate</th>
        <th class="center">GST</th>
        <th class="right">Total</th>
      </tr>

    </thead>

    <tbody>
      ${
        rows ||
        `
          <tr>
            <td colspan="6" class="center">
              No saved item rows found.
            </td>
          </tr>
        `
      }
    </tbody>

  </table>

  <div class="summary-wrap">

    <div class="summary-row">
      <span>Taxable value</span>
      <strong>
        ${escapeHtml(money(d.subtotal))}
      </strong>
    </div>

    ${
      d.discount > 0
        ? `
          <div class="summary-row">
            <span>Discount</span>
            <strong>
              ${escapeHtml(money(d.discount))}
            </strong>
          </div>
        `
        : ""
    }

    <div class="summary-row">
      <span>${escapeHtml(taxLabel)}</span>
      <strong>
        ${escapeHtml(money(d.gst_amount))}
      </strong>
    </div>

    <div class="summary-divider"></div>

    <div class="grand-total">
      <span>Grand total</span>
      <span>
        ${escapeHtml(money(d.total_amount))}
      </span>
    </div>

    <div class="payment-status">
      Paid:
      <strong>
        ${escapeHtml(money(d.paid_amount))}
      </strong>
      &nbsp;&nbsp; | &nbsp;&nbsp;
      Due:
      <strong class="${d.due_amount > 0 ? "due" : ""}">
        ${escapeHtml(money(d.due_amount))}
      </strong>
    </div>

  </div>

  ${notesHtml}

  <div class="payment-grid">

    <div class="payment-box">
      <div class="payment-title">
        Bank / UPI Payment
      </div>
      Add your business bank account and UPI details here.
    </div>

    <div class="payment-box">
      <div class="payment-title">
        Cheque Information
      </div>
      Payee: Account Payee only.
      Mention purchase bill number behind the cheque.
    </div>

  </div>

  <div class="section">

    <div class="section-title">
      Terms &amp; Conditions
    </div>

    <div class="section-body">
      Payment due as stated.
      Goods once received are subject to the stated return policy.
      <br><br>
      Thank you for your business.
    </div>

  </div>

  <div class="footer-area">

    <div class="footer-note">
      Computer-generated purchase bill.
      Please verify GST, business, vendor and payment details before live use.
    </div>

    <div class="signature">
      <div class="signature-title">
        Authorised Signatory
      </div>

      <div class="signature-business">
        For ${escapeHtml(businessName)}
      </div>
    </div>

  </div>

</div>

</body>
</html>
`;
}

export default function PurchasePreviewScreen() {
  const { width } =
    useWindowDimensions();

  const {
    purchaseId,
  } =
    useLocalSearchParams<{
      purchaseId?: string;
    }>();

  const insets =
    useSafeAreaInsets();

  const isSmall =
    width < 380;

  const isTablet =
    width >= 768;

  const [
    detail,
    setDetail,
  ] =
    useState<WorkflowDetail | null>(
      null,
    );

  const [
    business,
    setBusiness,
  ] =
    useState<BusinessPreview>({
      name: "Business",
      address: "",
      gstin: "",
      pan: "",
      phone: "",
      email: "",
    });

  const [
    businessRecord,
    setBusinessRecord,
  ] =
    useState<BusinessIdentity | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    toastVisible,
    setToastVisible,
  ] =
    useState(false);

  const toastOpacity =
    useRef(
      new Animated.Value(0),
    ).current;

  const showSavedToast =
    useCallback(() => {
      toastOpacity.stopAnimation();
      toastOpacity.setValue(0);
      setToastVisible(true);

      Animated.sequence([
        Animated.timing(
          toastOpacity,
          {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          },
        ),

        Animated.delay(1800),

        Animated.timing(
          toastOpacity,
          {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          },
        ),
      ]).start(() => {
        setToastVisible(false);
      });
    }, [
      toastOpacity,
    ]);

  const loadPurchase =
    useCallback(async () => {
      if (!purchaseId) {
        Alert.alert(
          "Purchase not found",
          "Purchase ID is missing.",
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const currentBusiness =
          businessIdentity(
            await getBusiness(),
          );

        if (!currentBusiness) {
          throw new Error(
            "Business setup is required.",
          );
        }

        const loadedDetail =
          await loadPurchaseWorkflowDocument(
            "PURCHASE",
            purchaseId,
          );

        if (!loadedDetail) {
          Alert.alert(
            "Purchase not found",
            "Unable to find this Purchase Bill.",
          );

          router.back();
          return;
        }

        if (
          loadedDetail.document.business_id !==
          currentBusiness.id
        ) {
          throw new Error(
            "This Purchase Bill belongs to a different business.",
          );
        }

        setDetail(
          loadedDetail,
        );

        setBusinessRecord(
          currentBusiness,
        );

        const snapshot =
          loadedDetail.document.business;

        setBusiness({
          name:
            snapshot.name ||
            currentBusiness.name ||
            "Business",

          address:
            text(snapshot.address),

          gstin:
            snapshot.gstin ||
            currentBusiness.gstin ||
            "",

          pan:
            text(snapshot.pan),

          phone:
            text(snapshot.mobile),

          email:
            text(snapshot.email),
        });
      } catch (error) {
        Alert.alert(
          "Unable to load purchase",
          errorText(error),
        );
      } finally {
        setLoading(false);
      }
    }, [
      purchaseId,
    ]);

  useFocusEffect(
    useCallback(() => {
      void loadPurchase();
    }, [
      loadPurchase,
    ]),
  );

  const purchaseHtml =
    useMemo(() => {
      if (
        !detail ||
        !businessRecord
      ) {
        return "";
      }

      return buildPurchaseHtml(
        detail,
        businessRecord,
      );
    }, [
      detail,
      businessRecord,
    ]);

  const handleSavePdf =
    async () => {
      if (
        !detail ||
        !purchaseHtml
      ) {
        return;
      }

      try {
        setSaving(true);

        await Print.printAsync({
          html: purchaseHtml,
        });

        showSavedToast();
      } catch (error) {
        const message =
          errorText(error);

        if (!/cancel/i.test(message)) {
          Alert.alert(
            "Unable to save PDF",
            message,
          );
        }
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={
            colors.teal
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Preparing purchase bill...
        </Text>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return null;
  }

  const d =
    detail.document;

  const vendorName =
    d.vendor_name ||
    d.vendor.name ||
    "Vendor";

  const vendorDetails = [
    text(d.vendor.gstin)
      ? `GSTIN ${text(d.vendor.gstin)}`
      : "",
    text(d.vendor.address),
    text(d.vendor.state),
  ].filter(Boolean);

  const paymentStatus =
    d.payment_status ||
    (d.due_amount > 0
      ? "DUE"
      : "PAID");

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        "top",
        "bottom",
      ]}
    >
      <View
        style={[
          styles.header,
          isSmall &&
            styles.headerSmall,
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color="#173042"
          />
        </Pressable>

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={[
              styles.headerTitle,
              isSmall &&
                styles.headerTitleSmall,
            ]}
          >
            Purchase bill
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
            numberOfLines={1}
          >
            {d.document_number}
            {" • "}
            {vendorName}
          </Text>
        </View>

        <Pressable
          disabled={
            saving
          }
          onPress={
            handleSavePdf
          }
          style={({ pressed }) => [
            styles.headerSaveButton,
            saving &&
              styles.disabled,
            pressed &&
              !saving &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color="#FFFFFF"
          />

          {!isSmall && (
            <Text
              style={
                styles.headerSaveText
              }
            >
              {saving
                ? "Preparing"
                : "Save PDF"}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={[
          styles.scrollContent,
          isTablet &&
            styles.scrollContentTablet,
          {
            paddingBottom:
              28 +
              insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.infoBox
          }
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color="#267087"
          />

          <Text
            style={
              styles.infoText
            }
          >
            Preview your purchase bill before saving it as PDF.
          </Text>
        </View>

        <View
          style={
            styles.paper
          }
        >
          <View
            style={
              styles.businessHeader
            }
          >
            <View
              style={
                styles.businessLeft
              }
            >
              <Text
                style={
                  styles.businessName
                }
              >
                {business.name}
              </Text>

              {!!business.address && (
                <Text
                  style={
                    styles.businessDetails
                  }
                >
                  {business.address}
                </Text>
              )}

              {(!!business.gstin ||
                !!business.pan) && (
                <Text
                  style={
                    styles.businessDetails
                  }
                >
                  {business.gstin
                    ? `GSTIN ${business.gstin}`
                    : ""}

                  {business.gstin &&
                  business.pan
                    ? " • "
                    : ""}

                  {business.pan
                    ? `PAN ${business.pan}`
                    : ""}
                </Text>
              )}

              {(!!business.phone ||
                !!business.email) && (
                <Text
                  style={
                    styles.businessDetails
                  }
                >
                  {business.phone}

                  {business.phone &&
                  business.email
                    ? " • "
                    : ""}

                  {business.email}
                </Text>
              )}
            </View>

            <View
              style={
                styles.invoiceNumberArea
              }
            >
              <Text
                style={
                  styles.invoiceType
                }
              >
                PURCHASE BILL
              </Text>

              <Text
                style={
                  styles.invoiceNumber
                }
              >
                {d.document_number}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.accentLine
            }
          />

          <View
            style={
              styles.metaGrid
            }
          >
            <View
              style={
                styles.metaCard
              }
            >
              <Text
                style={
                  styles.metaLabel
                }
              >
                VENDOR
              </Text>

              <Text
                style={
                  styles.metaValue
                }
              >
                {vendorName}
              </Text>

              <Text
                style={
                  styles.metaSubtext
                }
              >
                {vendorDetails.length > 0
                  ? vendorDetails.join(" • ")
                  : "Vendor / Supplier"}
              </Text>
            </View>

            <View
              style={
                styles.metaCard
              }
            >
              <Text
                style={
                  styles.metaLabel
                }
              >
                PURCHASE DETAILS
              </Text>

              <Text
                style={
                  styles.metaSubtext
                }
              >
                Date:{" "}
                <Text
                  style={
                    styles.bold
                  }
                >
                  {displayDate(
                    d.document_date,
                  )}
                </Text>
              </Text>

              {!!d.due_date && (
                <Text
                  style={
                    styles.metaSubtext
                  }
                >
                  Due:{" "}
                  <Text
                    style={
                      styles.bold
                    }
                  >
                    {displayDate(
                      d.due_date,
                    )}
                  </Text>
                </Text>
              )}

              {!!d.invoice_number && (
                <Text
                  style={
                    styles.metaSubtext
                  }
                >
                  Supplier invoice:{" "}
                  <Text
                    style={
                      styles.bold
                    }
                  >
                    {d.invoice_number}
                  </Text>
                </Text>
              )}

              <Text
                style={
                  styles.metaSubtext
                }
              >
                FY:{" "}
                <Text
                  style={
                    styles.bold
                  }
                >
                  {fiscalYear(
                    d.document_date,
                  )}
                </Text>
              </Text>

              <Text
                style={
                  styles.metaSubtext
                }
              >
                Status:{" "}
                <Text
                  style={
                    styles.bold
                  }
                >
                  {paymentStatus}
                </Text>
              </Text>
            </View>
          </View>

          <View
            style={
              styles.table
            }
          >
            <View
              style={[
                styles.tableRow,
                styles.tableHeaderRow,
              ]}
            >
              <Text
                style={[
                  styles.tableHeaderText,
                  styles.itemColumn,
                ]}
              >
                Item / Service
              </Text>

              <Text
                style={[
                  styles.tableHeaderText,
                  styles.qtyColumn,
                ]}
              >
                Qty
              </Text>

              <Text
                style={[
                  styles.tableHeaderText,
                  styles.rateColumn,
                ]}
              >
                Rate
              </Text>

              <Text
                style={[
                  styles.tableHeaderText,
                  styles.gstColumn,
                ]}
              >
                GST
              </Text>

              <Text
                style={[
                  styles.tableHeaderText,
                  styles.amountColumn,
                ]}
              >
                Total
              </Text>
            </View>

            {detail.items.map(
              line => (
                <View
                  key={
                    line.id
                  }
                  style={
                    styles.tableRow
                  }
                >
                  <View
                    style={
                      styles.itemColumn
                    }
                  >
                    <Text
                      style={
                        styles.itemName
                      }
                      numberOfLines={2}
                    >
                      {line.product_name}
                    </Text>

                    {!!line.hsn && (
                      <Text
                        style={
                          styles.itemHsn
                        }
                      >
                        HSN:{" "}
                        {line.hsn}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.qtyColumn,
                    ]}
                  >
                    {quantity(
                      line.quantity,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.rateColumn,
                    ]}
                  >
                    {money(
                      line.unit_price,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.gstColumn,
                    ]}
                  >
                    {quantity(
                      line.gst_rate,
                    )}
                    %
                  </Text>

                  <Text
                    style={[
                      styles.tableValueStrong,
                      styles.amountColumn,
                    ]}
                  >
                    {money(
                      line.total_amount,
                    )}
                  </Text>
                </View>
              ),
            )}
          </View>

          <View
            style={
              styles.summaryWrapper
            }
          >
            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Taxable value
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {money(
                  d.subtotal,
                )}
              </Text>
            </View>

            {d.discount > 0 && (
              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Discount
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {money(
                    d.discount,
                  )}
                </Text>
              </View>
            )}

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                {d.supply_type ===
                "OTHER_STATE"
                  ? "IGST"
                  : "GST"}
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {money(
                  d.gst_amount,
                )}
              </Text>
            </View>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={
                styles.grandTotalRow
              }
            >
              <Text
                style={
                  styles.grandTotalLabel
                }
              >
                Grand total
              </Text>

              <Text
                style={
                  styles.grandTotalValue
                }
              >
                {money(
                  d.total_amount,
                )}
              </Text>
            </View>

            <View
              style={
                styles.paymentStatus
              }
            >
              <Text
                style={
                  styles.paymentStatusText
                }
              >
                Paid{" "}
                <Text
                  style={
                    styles.bold
                  }
                >
                  {money(
                    d.paid_amount,
                  )}
                </Text>
              </Text>

              <Text
                style={
                  styles.paymentStatusDivider
                }
              >
                •
              </Text>

              <Text
                style={
                  styles.paymentStatusText
                }
              >
                Due{" "}
                <Text
                  style={
                    d.due_amount > 0
                      ? styles.dueText
                      : styles.bold
                  }
                >
                  {money(
                    d.due_amount,
                  )}
                </Text>
              </Text>
            </View>
          </View>

          {!!d.notes && (
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Notes
              </Text>

              <Text
                style={
                  styles.sectionText
                }
              >
                {d.notes}
              </Text>
            </View>
          )}

          <View
            style={
              styles.paymentCards
            }
          >
            <View
              style={
                styles.paymentCard
              }
            >
              <View
                style={
                  styles.paymentCardIcon
                }
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={
                    colors.teal
                  }
                />
              </View>

              <View
                style={
                  styles.paymentCardContent
                }
              >
                <Text
                  style={
                    styles.paymentCardTitle
                  }
                >
                  Bank / UPI payment
                </Text>

                <Text
                  style={
                    styles.paymentCardText
                  }
                >
                  Add your business bank account and UPI details here.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.paymentCard
              }
            >
              <View
                style={
                  styles.paymentCardIcon
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={
                    colors.teal
                  }
                />
              </View>

              <View
                style={
                  styles.paymentCardContent
                }
              >
                <Text
                  style={
                    styles.paymentCardTitle
                  }
                >
                  Cheque information
                </Text>

                <Text
                  style={
                    styles.paymentCardText
                  }
                >
                  Payee: Account Payee only.
                  Mention purchase bill number behind the cheque.
                </Text>
              </View>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Terms & Conditions
            </Text>

            <Text
              style={
                styles.sectionText
              }
            >
              Payment due as stated.
              Goods once received are subject to the stated return policy.
            </Text>

            <Text
              style={
                styles.thankYou
              }
            >
              Thank you for your business.
            </Text>
          </View>

          <View
            style={
              styles.signatureSection
            }
          >
            <Text
              style={
                styles.signatureTitle
              }
            >
              Authorised Signatory
            </Text>

            <Text
              style={
                styles.signatureBusiness
              }
            >
              For {business.name}
            </Text>
          </View>

          <View
            style={
              styles.footerDivider
            }
          />

          <Text
            style={
              styles.footerText
            }
          >
            Computer-generated purchase bill.
            Please verify GST, business, vendor and payment details before live use.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom:
              Math.max(
                10,
                insets.bottom,
              ),
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
            styles.bottomBackButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={17}
            color={
              colors.teal
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
          disabled={
            saving
          }
          onPress={
            handleSavePdf
          }
          style={({ pressed }) => [
            styles.bottomSaveButton,
            saving &&
              styles.disabled,
            pressed &&
              !saving &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="download-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.bottomSaveText
            }
          >
            {saving
              ? "Preparing..."
              : "Save PDF"}
          </Text>
        </Pressable>
      </View>

      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity:
                toastOpacity,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.toastText
            }
          >
            Print dialog opened
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#EDF4F6",
    },

    loadingScreen: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EDF4F6",
    },

    loadingText: {
      color:
        "#68757D",
      fontSize: 11,
      marginTop: 10,
    },

    header: {
      minHeight: 60,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      paddingHorizontal:
        13,
      paddingVertical:
        11,
      backgroundColor:
        "#FFFFFF",
      borderBottomWidth:
        1,
      borderBottomColor:
        "#D9E3E6",
    },

    headerSmall: {
      paddingHorizontal:
        9,
      gap: 7,
    },

    headerBackButton: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EDF3F5",
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight:
        "800",
      color:
        "#16313F",
    },

    headerTitleSmall: {
      fontSize: 17,
      lineHeight: 22,
    },

    headerSubtitle: {
      color:
        "#808B90",
      fontSize: 10,
      marginTop: 3,
    },

    headerSaveButton: {
      minHeight: 36,
      minWidth: 85,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      paddingHorizontal:
        10,
      borderRadius: 12,
      backgroundColor:
        "#07998E",
    },

    headerSaveText: {
      color:
        "#FFFFFF",
      fontSize: 11,
      fontWeight:
        "800",
    },

    scroll: {
      flex: 1,
      backgroundColor:
        "#EDF4F6",
    },

    scrollContent: {
      width: "100%",
      paddingHorizontal: 10,
      paddingTop: 10,
      alignItems: "center",
    },

    scrollContentTablet: {
      paddingHorizontal: 24,
    },

    infoBox: {
      width: "100%",
      maxWidth: 820,
      minHeight: 44,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor:
        "#C6E0EA",
      borderRadius: 12,
      backgroundColor:
        "#EFF8FC",
      marginBottom: 10,
    },

    infoText: {
      flex: 1,
      color:
        "#42616F",
      fontSize: 10,
      lineHeight: 14,
    },

    paper: {
      width: "100%",
      maxWidth: 820,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#D7E1E5",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 18,
    },

    businessHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      gap: 12,
    },

    businessLeft: {
      flex: 1,
      minWidth: 0,
    },

    businessName: {
      color:
        "#102A43",
      fontSize: 21,
      fontWeight:
        "800",
    },

    businessDetails: {
      color:
        "#52606D",
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },

    invoiceNumberArea: {
      flexShrink: 0,
      alignItems:
        "flex-end",
      maxWidth: "44%",
    },

    invoiceType: {
      color:
        "#07877E",
      fontSize: 8,
      fontWeight:
        "800",
      letterSpacing: 0.8,
    },

    invoiceNumber: {
      color:
        "#102A43",
      fontSize: 15,
      fontWeight:
        "800",
      marginTop: 3,
    },

    accentLine: {
      height: 3,
      borderRadius: 99,
      backgroundColor:
        "#0B948B",
      marginTop: 13,
      marginBottom: 15,
    },

    metaGrid: {
      flexDirection:
        "row",
      width: "100%",
      marginBottom: 14,
    },

    metaCard: {
      flex: 1,
      minWidth: 0,
      padding: 10,
      backgroundColor:
        "#F3FAF9",
      borderWidth: 1,
      borderColor:
        "#C9E7E2",
    },

    metaLabel: {
      color:
        "#60717D",
      fontSize: 8,
      fontWeight:
        "800",
      letterSpacing: 0.6,
      marginBottom: 4,
    },

    metaValue: {
      color:
        "#17212B",
      fontSize: 10.5,
      fontWeight:
        "800",
    },

    metaSubtext: {
      color:
        "#46535D",
      fontSize: 8.5,
      lineHeight: 13,
      marginTop: 3,
    },

    bold: {
      fontWeight:
        "800",
      color:
        "#17212B",
    },

    table: {
      width: "100%",
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderColor:
        "#CBD5DA",
    },

    tableRow: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "stretch",
      minHeight: 42,
    },

    tableHeaderRow: {
      backgroundColor:
        "#EEF7F6",
      minHeight: 36,
    },

    tableHeaderText: {
      color:
        "#243B53",
      fontSize: 8,
      fontWeight:
        "800",
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "#B9C8CE",
      textAlign: "center",
    },

    tableValue: {
      color:
        "#253642",
      fontSize: 8,
      paddingHorizontal: 4,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "#CBD5DA",
      textAlign: "center",
    },

    tableValueStrong: {
      color:
        "#253642",
      fontSize: 8,
      fontWeight:
        "800",
      paddingHorizontal: 4,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "#CBD5DA",
      textAlign: "right",
    },

    itemColumn: {
      width: "39%",
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "#CBD5DA",
      justifyContent:
        "center",
    },

    qtyColumn: {
      width: "12%",
    },

    rateColumn: {
      width: "18%",
    },

    gstColumn: {
      width: "11%",
    },

    amountColumn: {
      width: "20%",
    },

    itemName: {
      color:
        "#253642",
      fontSize: 8.5,
      fontWeight:
        "700",
    },

    itemHsn: {
      color:
        "#7A878F",
      fontSize: 7,
      marginTop: 2,
    },

    summaryWrapper: {
      width: "54%",
      alignSelf:
        "flex-end",
      marginTop: 16,
    },

    summaryRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 10,
      paddingVertical: 4,
    },

    summaryLabel: {
      color:
        "#52606D",
      fontSize: 9,
    },

    summaryValue: {
      color:
        "#17212B",
      fontSize: 9,
      fontWeight:
        "700",
      textAlign:
        "right",
    },

    summaryDivider: {
      height: 1,
      backgroundColor:
        "#CCD6DC",
      marginVertical: 5,
    },

    grandTotalRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 10,
      alignItems:
        "center",
    },

    grandTotalLabel: {
      color:
        "#102A43",
      fontSize: 14,
      fontWeight:
        "800",
    },

    grandTotalValue: {
      color:
        "#102A43",
      fontSize: 14,
      fontWeight:
        "800",
      textAlign:
        "right",
    },

    paymentStatus: {
      marginTop: 9,
      paddingHorizontal: 8,
      paddingVertical: 7,
      flexDirection:
        "row",
      justifyContent:
        "flex-end",
      alignItems:
        "center",
      gap: 6,
      backgroundColor:
        "#F7FAFC",
      borderRadius: 6,
    },

    paymentStatusText: {
      color:
        "#43515B",
      fontSize: 8,
    },

    paymentStatusDivider: {
      color:
        "#9BA7AD",
      fontSize: 8,
    },

    dueText: {
      color:
        "#9B6500",
      fontWeight:
        "800",
    },

    section: {
      marginTop: 18,
    },

    sectionTitle: {
      color:
        "#102A43",
      fontSize: 10,
      fontWeight:
        "800",
      marginBottom: 5,
    },

    sectionText: {
      color:
        "#4B5963",
      fontSize: 9,
      lineHeight: 14,
    },

    thankYou: {
      color:
        "#102A43",
      fontSize: 9,
      fontWeight:
        "800",
      marginTop: 12,
    },

    paymentCards: {
      width: "100%",
      flexDirection:
        "row",
      gap: 8,
      marginTop: 18,
    },

    paymentCard: {
      flex: 1,
      minWidth: 0,
      minHeight: 92,
      flexDirection:
        "row",
      gap: 7,
      padding: 9,
      borderWidth: 1,
      borderColor:
        "#CCD6DC",
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
    },

    paymentCardIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E3F5F2",
    },

    paymentCardContent: {
      flex: 1,
      minWidth: 0,
    },

    paymentCardTitle: {
      color:
        "#203747",
      fontSize: 8.5,
      fontWeight:
        "800",
    },

    paymentCardText: {
      color:
        "#68747C",
      fontSize: 7.5,
      lineHeight: 11,
      marginTop: 3,
    },

    signatureSection: {
      alignItems:
        "flex-end",
      marginTop: 42,
    },

    signatureTitle: {
      color:
        "#17212B",
      fontSize: 9,
      fontWeight:
        "800",
    },

    signatureBusiness: {
      color:
        "#52606D",
      fontSize: 8,
      marginTop: 3,
    },

    footerDivider: {
      height: 1,
      backgroundColor:
        "#E2E8EC",
      marginTop: 18,
      marginBottom: 8,
    },

    footerText: {
      color:
        "#718096",
      fontSize: 7.5,
      lineHeight: 11,
    },

    bottomBar: {
      minHeight: 62,
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "flex-end",
      gap: 8,
      paddingTop: 8,
      paddingHorizontal: 10,
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        "#D9E3E8",
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
      paddingHorizontal: 15,
      borderRadius: 11,
      backgroundColor:
        "#E6F5F2",
    },

    bottomBackText: {
      color:
        colors.teal,
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
      paddingHorizontal: 15,
      borderRadius: 11,
      backgroundColor:
        colors.teal,
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

    toast: {
      position:
        "absolute",
      left: 18,
      right: 18,
      bottom: 82,
      minHeight: 44,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor:
        "#173042",
    },

    toastText: {
      color:
        "#FFFFFF",
      fontSize: 10,
      fontWeight:
        "800",
    },
  });
