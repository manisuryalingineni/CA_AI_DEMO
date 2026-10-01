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
  loadSaleWithItems,
} from "../src/services/saleService";

import {
  loadCustomers,
} from "../src/services/customerService";

import {
  loadProducts,
} from "../src/services/productService";

import {
  getBusiness,
} from "../src/repositories/businessRepository";

import type {
  Sale,
} from "../src/types/sale";

import { colors } from "../src/theme/colors";

/* =========================================================
   TYPES
========================================================= */

type InvoiceLine = {
  id: string;

  name: string;

  hsn: string;

  quantity: number;

  unit: string;

  rate: number;

  gstRate: number;

  gstAmount: number;

  totalAmount: number;
};

type BusinessPreview = {
  name: string;

  address: string;

  gstin: string;

  pan: string;

  phone: string;

  email: string;
};

/* =========================================================
   HELPERS
========================================================= */

function money(
  value: number,
): string {
  return `₹${Number(
    value || 0,
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function financialYear(
  saleDate: string,
): string {
  const date =
    new Date(
      `${saleDate}T00:00:00`,
    );

  const year =
    date.getFullYear();

  const month =
    date.getMonth() + 1;

  if (month >= 4) {
    return `${year}-${String(
      year + 1,
    ).slice(-2)}`;
  }

  return `${year - 1}-${String(
    year,
  ).slice(-2)}`;
}

function displayDate(
  value: string,
): string {
  if (!value) {
    return "";
  }

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/* =========================================================
   PDF HTML

   This controls the ACTUAL saved PDF appearance.
========================================================= */

function buildInvoiceHtml({
  business,
  sale,
  customerName,
  lines,
}: {
  business: BusinessPreview;

  sale: Sale;

  customerName: string;

  lines: InvoiceLine[];
}) {
  const rows =
    lines
      .map(
        (item) => `
          <tr>
            <td class="item">
              <strong>
                ${escapeHtml(item.name)}
              </strong>
            </td>

            <td class="center">
              ${
                escapeHtml(
                  item.hsn,
                ) || "-"
              }
            </td>

            <td class="center">
              ${item.quantity}
              ${
                item.unit
                  ? escapeHtml(
                      item.unit,
                    )
                  : ""
              }
            </td>

            <td class="right">
              ₹${item.rate.toFixed(
                2,
              )}
            </td>

            <td class="center">
              ${item.gstRate}%
            </td>

            <td class="right strong">
              ₹${item.totalAmount.toFixed(
                2,
              )}
            </td>
          </tr>
        `,
      )
      .join("");

  const contactLine = [
    business.phone,
    business.email,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" • ");

  const taxLine = [
    business.gstin
      ? `GSTIN ${escapeHtml(
          business.gstin,
        )}`
      : "",
    business.pan
      ? `PAN ${escapeHtml(
          business.pan,
        )}`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return `
<!DOCTYPE html>

<html>
<head>
<meta charset="utf-8">

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
  }

  .business-name {
    font-size: 27px;

    font-weight: 800;

    color: #102a43;

    letter-spacing: -0.4px;

    margin-bottom: 7px;
  }

  .business-details {
    color: #52606d;

    line-height: 1.55;

    font-size: 10.5px;
  }

  .invoice-label {
    text-align: right;
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
  }

  table {
    width: 100%;

    border-collapse: collapse;

    margin-top: 5px;

    page-break-inside: auto;
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
  }

  td.item {
    width: 31%;
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

    padding: 5px 0;

    color: #52606d;
  }

  .summary-row strong {
    color: #17212b;
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

</style>
</head>

<body>

<div class="invoice">

  <div class="top">

    <div>

      <div class="business-name">
        ${escapeHtml(
          business.name,
        )}
      </div>

      <div class="business-details">

        ${
          business.address
            ? `${escapeHtml(
                business.address,
              )}<br>`
            : ""
        }

        ${
          taxLine
            ? `${taxLine}<br>`
            : ""
        }

        ${
          contactLine
            ? contactLine
            : ""
        }

      </div>

    </div>

    <div class="invoice-label">

      <div class="invoice-type">
        Tax Invoice
      </div>

      <div class="invoice-number">
        ${escapeHtml(
          sale.invoiceNumber ||
            "Invoice",
        )}
      </div>

    </div>

  </div>

  <div class="accent-line"></div>


  <div class="meta-grid">

    <div class="meta-box">

      <div class="label">
        Bill To
      </div>

      <div class="value">
        ${escapeHtml(
          customerName,
        )}
      </div>

      <div class="small-value">
        Customer / Walk-in party
      </div>

    </div>


    <div class="meta-box">

      <div class="label">
        Invoice Details
      </div>

      <div class="small-value">
        <strong>Date:</strong>
        ${escapeHtml(
          displayDate(
            sale.saleDate,
          ),
        )}
      </div>

      <div class="small-value">
        <strong>Financial year:</strong>
        ${financialYear(
          sale.saleDate,
        )}
      </div>

      <div class="small-value">
        <strong>Status:</strong>
        ${escapeHtml(
          sale.paymentStatus,
        )}
      </div>

    </div>

  </div>


  <table>

    <thead>

      <tr>

        <th>
          Item / Service
        </th>

        <th>
          HSN / SAC
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

      ${rows}

    </tbody>

  </table>


  <div class="summary-wrap">

    <div class="summary-row">

      <span>
        Taxable value
      </span>

      <strong>
        ₹${sale.subtotal.toFixed(
          2,
        )}
      </strong>

    </div>


    <div class="summary-row">

      <span>
        GST
      </span>

      <strong>
        ₹${sale.gstAmount.toFixed(
          2,
        )}
      </strong>

    </div>


    <div class="summary-divider">
    </div>


    <div class="grand-total">

      <span>
        Grand total
      </span>

      <span>
        ₹${sale.totalAmount.toFixed(
          2,
        )}
      </span>

    </div>


    <div class="payment-status">

      Paid:
      <strong>
        ₹${sale.paidAmount.toFixed(
          2,
        )}
      </strong>

      &nbsp;&nbsp; | &nbsp;&nbsp;

      Due:
      <strong>
        ₹${sale.dueAmount.toFixed(
          2,
        )}
      </strong>

    </div>

  </div>


  ${
    sale.notes
      ? `
        <div class="section">

          <div class="section-title">
            Notes
          </div>

          <div class="section-body">
            ${escapeHtml(
              sale.notes,
            )}
          </div>

        </div>
      `
      : ""
  }


  <div class="payment-grid">

    <div class="payment-box">

      <div class="payment-title">
        Bank / UPI Payment
      </div>

      Add your business bank
      account and UPI details here.

    </div>


    <div class="payment-box">

      <div class="payment-title">
        Cheque Information
      </div>

      Payee: Account Payee only.
      Mention invoice number
      behind the cheque.

    </div>

  </div>


  <div class="section">

    <div class="section-title">
      Terms & Conditions
    </div>

    <div class="section-body">

      Payment due as stated.
      Goods once sold are subject
      to the stated return policy.

      <br><br>

      Thank you for your business.

    </div>

  </div>


  <div class="footer-area">

    <div class="footer-note">

      Computer-generated tax invoice.
      Please verify GST, business and
      payment details before live use.

    </div>

    <div class="signature">

      <div class="signature-title">
        Authorised Signatory
      </div>

      <div class="signature-business">
        For
        ${escapeHtml(
          business.name,
        )}
      </div>

    </div>

  </div>

</div>

</body>
</html>
`;
}

/* =========================================================
   SCREEN
========================================================= */

export default function InvoicePreviewScreen() {
  const { width } =
    useWindowDimensions();

  const {
    saleId,
  } =
    useLocalSearchParams<{
      saleId?: string;
    }>();

  const insets =
    useSafeAreaInsets();

  const isSmall =
    width < 380;

  const isTablet =
    width >= 768;

  /* =======================================================
     STATE
  ======================================================= */

  const [
    sale,
    setSale,
  ] =
    useState<Sale | null>(
      null,
    );

  const [
    lines,
    setLines,
  ] =
    useState<InvoiceLine[]>(
      [],
    );

  const [
    customerName,
    setCustomerName,
  ] =
    useState(
      "Walk-in Customer",
    );

  const [
    business,
    setBusiness,
  ] =
    useState<BusinessPreview>({
      name: "Retail Shop",

      address: "",

      gstin: "",

      pan: "",

      phone: "",

      email: "",
    });

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

  /* =======================================================
     TOAST
  ======================================================= */

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

        Animated.delay(
          1800,
        ),

        Animated.timing(
          toastOpacity,
          {
            toValue: 0,

            duration: 200,

            useNativeDriver: true,
          },
        ),
      ]).start(() => {
        setToastVisible(
          false,
        );
      });
    }, [
      toastOpacity,
    ]);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadInvoice =
    useCallback(async () => {
      if (!saleId) {
        return;
      }

      try {
        setLoading(true);

        const [
          saleWithItems,
          customers,
          products,
          currentBusiness,
        ] =
          await Promise.all([
            loadSaleWithItems(
              saleId,
            ),

            loadCustomers(),

            loadProducts(),

            getBusiness(),
          ]);

        if (!saleWithItems) {
          Alert.alert(
            "Invoice not found",
            "Unable to find this invoice.",
          );

          router.back();

          return;
        }

        const loadedSale =
          saleWithItems.sale;

        const loadedItems =
          saleWithItems.items;

        setSale(
          loadedSale,
        );

        /* CUSTOMER */

        const customer =
          customers.find(
            (customerItem) =>
              customerItem.id ===
              loadedSale.customerId,
          );

        setCustomerName(
          customer?.name ||
            "Walk-in Customer",
        );

        /* PRODUCTS */

        const previewLines =
          loadedItems.map(
            (saleItem) => {
              const product =
                products.find(
                  (productItem) =>
                    productItem.id ===
                    saleItem.productId,
                );

              return {
                id:
                  saleItem.id,

                name:
                  product?.name ||
                  "Item",

                hsn:
                  product?.hsn ||
                  "",

                quantity:
                  saleItem.quantity,

                unit:
                  product?.unit ||
                  "",

                rate:
                  saleItem.unitPrice,

                gstRate:
                  saleItem.gstRate,

                gstAmount:
                  saleItem.gstAmount,

                totalAmount:
                  saleItem.totalAmount,
              };
            },
          );

        setLines(
          previewLines,
        );

        /* BUSINESS */

        if (
          currentBusiness
        ) {
          const b =
            currentBusiness as any;

          setBusiness({
            name:
              b.name ||
              b.businessName ||
              "Retail Shop",

            address:
              b.address ||
              b.businessAddress ||
              "",

            gstin:
              b.gstin ||
              b.gstNumber ||
              "",

            pan:
              b.pan ||
              "",

            phone:
              b.phone ||
              b.mobile ||
              "",

            email:
              b.email ||
              "",
          });
        }
      } catch (error) {
        Alert.alert(
          "Unable to load invoice",

          error instanceof Error
            ? error.message
            : "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      saleId,
    ]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [
      loadInvoice,
    ]),
  );

  /* =======================================================
     PDF HTML
  ======================================================= */

  const invoiceHtml =
    useMemo(() => {
      if (!sale) {
        return "";
      }

      return buildInvoiceHtml({
        business,

        sale,

        customerName,

        lines,
      });
    }, [
      business,
      sale,
      customerName,
      lines,
    ]);

  /* =======================================================
     SAVE PDF
  ======================================================= */

  const handleSavePdf =
    async () => {
      if (
        !sale ||
        !invoiceHtml
      ) {
        return;
      }

      try {
        setSaving(true);

        /*
         * Opens Android / iOS print flow.
         * On Android select:
         * Save as PDF
         */

        await Print.printAsync({
          html:
            invoiceHtml,
        });

        showSavedToast();
      } catch (error) {
        Alert.alert(
          "Unable to save PDF",

          error instanceof Error
            ? error.message
            : "Something went wrong.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

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
          Preparing invoice...
        </Text>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

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
      {/* =====================================================
          HEADER
      ===================================================== */}

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
            Tax invoice
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
            numberOfLines={1}
          >
            {sale.invoiceNumber ||
              "Invoice"}
            {" • "}
            {customerName}
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

      {/* =====================================================
          PREVIEW AREA
      ===================================================== */}

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
        {/* INFO */}

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
            Preview your invoice before saving it as PDF.
          </Text>
        </View>

        {/* =================================================
            PAPER
        ================================================= */}

        <View
          style={
            styles.paper
          }
        >
          {/* BUSINESS HEADER */}

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
                  {
                    business.address
                  }
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
                  {
                    business.phone
                  }

                  {business.phone &&
                  business.email
                    ? " • "
                    : ""}

                  {
                    business.email
                  }
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
                TAX INVOICE
              </Text>

              <Text
                style={
                  styles.invoiceNumber
                }
              >
                {sale.invoiceNumber ||
                  "Invoice"}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.accentLine
            }
          />

          {/* =================================================
              CUSTOMER / META
          ================================================= */}

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
                BILL TO
              </Text>

              <Text
                style={
                  styles.metaValue
                }
              >
                {customerName}
              </Text>

              <Text
                style={
                  styles.metaSubtext
                }
              >
                Customer / Walk-in party
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
                INVOICE DETAILS
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
                    sale.saleDate,
                  )}
                </Text>
              </Text>

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
                  {financialYear(
                    sale.saleDate,
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
                  {
                    sale.paymentStatus
                  }
                </Text>
              </Text>
            </View>
          </View>

          {/* =================================================
              TABLE
          ================================================= */}

          <View
            style={
              styles.table
            }
          >
            {/* HEADER */}

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

            {/* ROWS */}

            {lines.map(
              (line) => (
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
                      {
                        line.name
                      }
                    </Text>

                    {!!line.hsn && (
                      <Text
                        style={
                          styles.itemHsn
                        }
                      >
                        HSN:{" "}
                        {
                          line.hsn
                        }
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.qtyColumn,
                    ]}
                  >
                    {
                      line.quantity
                    }
                  </Text>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.rateColumn,
                    ]}
                  >
                    {money(
                      line.rate,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.tableValue,
                      styles.gstColumn,
                    ]}
                  >
                    {
                      line.gstRate
                    }
                    %
                  </Text>

                  <Text
                    style={[
                      styles.tableValueStrong,
                      styles.amountColumn,
                    ]}
                  >
                    {money(
                      line.totalAmount,
                    )}
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* =================================================
              TOTALS
          ================================================= */}

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
                  sale.subtotal,
                )}
              </Text>
            </View>

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
                GST
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {money(
                  sale.gstAmount,
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
                  sale.totalAmount,
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
                    sale.paidAmount,
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
                    styles.dueText
                  }
                >
                  {money(
                    sale.dueAmount,
                  )}
                </Text>
              </Text>
            </View>
          </View>

          {/* =================================================
              NOTES
          ================================================= */}

          {!!sale.notes && (
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
                {
                  sale.notes
                }
              </Text>
            </View>
          )}

          {/* =================================================
              PAYMENT INFO
          ================================================= */}

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
                  Add your business bank account and UPI details
                  here.
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
                  Payee: Account Payee only. Mention invoice
                  number behind the cheque.
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              TERMS
          ================================================= */}

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
              Payment due as stated. Goods once sold are subject
              to the stated return policy.
            </Text>

            <Text
              style={
                styles.thankYou
              }
            >
              Thank you for your business.
            </Text>
          </View>

          {/* =================================================
              SIGNATURE
          ================================================= */}

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
            Computer-generated tax invoice. Verify legal, GST and
            payment information before live use.
          </Text>
        </View>
      </ScrollView>

      {/* =====================================================
          BOTTOM ACTION
      ===================================================== */}

      <View
        style={[
          styles.bottomBar,

          {
            paddingBottom:
              Math.max(
                8,
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
            styles.backButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={17}
            color="#087D75"
          />

          <Text
            style={
              styles.backButtonText
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
            styles.saveButton,

            saving &&
              styles.disabled,

            pressed &&
              !saving &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="download-outline"
            size={17}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.saveButtonText
            }
          >
            {saving
              ? "Preparing..."
              : "Save PDF"}
          </Text>
        </Pressable>
      </View>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,

            {
              opacity:
                toastOpacity,

              transform: [
                {
                  translateY:
                    toastOpacity.interpolate({
                      inputRange: [
                        0,
                        1,
                      ],

                      outputRange: [
                        10,
                        0,
                      ],
                    }),
                },
              ],
            },
          ]}
        >
          <View
            style={
              styles.toastIcon
            }
          >
            <Ionicons
              name="checkmark"
              size={16}
              color="#FFFFFF"
            />
          </View>

          <View
            style={
              styles.toastContent
            }
          >
            <Text
              style={
                styles.toastTitle
              }
            >
              PDF saved
            </Text>

            <Text
              style={
                styles.toastSubtitle
              }
            >
              Invoice PDF completed successfully
            </Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* ROOT */

    safeArea: {
      flex: 1,

      backgroundColor:
        "#EDF3F6",
    },

    /* HEADER */

    header: {
      minHeight: 64,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#FFFFFF",

      paddingHorizontal: 14,

      borderBottomWidth: 1,

      borderBottomColor:
        "#DDE5E9",

      gap: 9,

      elevation: 3,

      shadowColor:
        "#19313E",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity: 0.07,

      shadowRadius: 7,

      zIndex: 20,
    },

    headerSmall: {
      paddingHorizontal: 9,

      gap: 6,
    },

    headerBackButton: {
      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:
        "#EEF4F6",

      alignItems: "center",

      justifyContent:
        "center",
    },

    headerText: {
      flex: 1,

      minWidth: 0,
    },

    headerTitle: {
      color: "#13283A",

      fontSize: 18,

      fontWeight: "900",
    },

    headerTitleSmall: {
      fontSize: 16,
    },

    headerSubtitle: {
      color: "#75828B",

      fontSize: 9,

      marginTop: 2,
    },

    headerSaveButton: {
      minHeight: 38,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal: 11,

      borderRadius: 11,

      backgroundColor:
        "#0A958B",
    },

    headerSaveText: {
      color: "#FFFFFF",

      fontSize: 10,

      fontWeight: "900",
    },

    /* SCROLL */

    scroll: {
      flex: 1,
    },

    scrollContent: {
      width: "100%",

      paddingHorizontal: 10,

      paddingTop: 10,
    },

    scrollContentTablet: {
      maxWidth: 900,

      alignSelf: "center",

      paddingHorizontal: 20,
    },

    /* INFO */

    infoBox: {
      minHeight: 40,

      flexDirection: "row",

      alignItems: "center",

      gap: 7,

      paddingHorizontal: 11,

      borderWidth: 1,

      borderColor:
        "#C1E0EB",

      backgroundColor:
        "#E9F7FC",

      borderRadius: 11,

      marginBottom: 10,
    },

    infoText: {
      flex: 1,

      color: "#356B7F",

      fontSize: 9.5,

      lineHeight: 13,
    },

    /* PAPER */

    paper: {
      width: "100%",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#D8E1E6",

      borderRadius: 14,

      paddingHorizontal: 15,

      paddingVertical: 17,

      shadowColor:
        "#173444",

      shadowOffset: {
        width: 0,

        height: 4,
      },

      shadowOpacity: 0.07,

      shadowRadius: 10,

      elevation: 2,
    },

    /* BUSINESS */

    businessHeader: {
      flexDirection: "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",

      gap: 12,
    },

    businessLeft: {
      flex: 1,

      minWidth: 0,
    },

    businessName: {
      color: "#102A43",

      fontSize: 24,

      fontWeight: "900",

      letterSpacing: -0.4,

      marginBottom: 7,
    },

    businessDetails: {
      color: "#52616C",

      fontSize: 9,

      lineHeight: 13,
    },

    invoiceNumberArea: {
      flexShrink: 0,

      alignItems: "flex-end",
    },

    invoiceType: {
      color: "#0A8F86",

      fontSize: 7.5,

      fontWeight: "900",

      letterSpacing: 0.8,
    },

    invoiceNumber: {
      color: "#102A43",

      fontSize: 14,

      fontWeight: "900",

      marginTop: 3,
    },

    accentLine: {
      width: "100%",

      height: 3,

      backgroundColor:
        "#0A958B",

      marginVertical: 14,
    },

    /* META */

    metaGrid: {
      flexDirection: "row",

      gap: 8,

      marginBottom: 14,
    },

    metaCard: {
      flex: 1,

      minHeight: 78,

      backgroundColor:
        "#F1F9F8",

      borderWidth: 1,

      borderColor:
        "#CAE7E2",

      borderRadius: 9,

      padding: 10,
    },

    metaLabel: {
      color: "#67808A",

      fontSize: 7,

      fontWeight: "900",

      letterSpacing: 0.7,

      marginBottom: 5,
    },

    metaValue: {
      color: "#182C3B",

      fontSize: 10,

      fontWeight: "900",
    },

    metaSubtext: {
      color: "#64737C",

      fontSize: 8,

      lineHeight: 12,

      marginTop: 3,
    },

    bold: {
      fontWeight: "900",

      color: "#253746",
    },

    /* TABLE */

    table: {
      width: "100%",

      borderWidth: 1,

      borderColor:
        "#CBD5DA",

      borderRadius: 7,

      overflow: "hidden",
    },

    tableRow: {
      minHeight: 42,

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        "#DCE3E7",
    },

    tableHeaderRow: {
      minHeight: 35,

      backgroundColor:
        "#EDF7F6",
    },

    tableHeaderText: {
      color: "#304956",

      fontSize: 7.5,

      fontWeight: "900",

      paddingHorizontal: 5,
    },

    tableValue: {
      color: "#46545E",

      fontSize: 7.5,

      paddingHorizontal: 4,

      textAlign: "center",
    },

    tableValueStrong: {
      color: "#182C3B",

      fontSize: 7.5,

      fontWeight: "900",

      paddingHorizontal: 4,

      textAlign: "right",
    },

    itemColumn: {
      flex: 2.2,

      paddingLeft: 7,
    },

    qtyColumn: {
      flex: 0.55,

      textAlign: "center",
    },

    rateColumn: {
      flex: 0.95,

      textAlign: "right",
    },

    gstColumn: {
      flex: 0.55,

      textAlign: "center",
    },

    amountColumn: {
      flex: 1,

      textAlign: "right",

      paddingRight: 7,
    },

    itemName: {
      color: "#203341",

      fontSize: 8,

      fontWeight: "800",
    },

    itemHsn: {
      color: "#82909A",

      fontSize: 6.5,

      marginTop: 2,
    },

    /* SUMMARY */

    summaryWrapper: {
      width: "100%",

      alignSelf: "flex-end",

      marginTop: 15,

      padding: 11,

      backgroundColor:
        "#FAFCFD",

      borderRadius: 9,

      borderWidth: 1,

      borderColor:
        "#E1E7EA",
    },

    summaryRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      marginBottom: 7,
    },

    summaryLabel: {
      color: "#64737C",

      fontSize: 8.5,
    },

    summaryValue: {
      color: "#263B48",

      fontSize: 8.5,

      fontWeight: "900",
    },

    summaryDivider: {
      height: 1,

      backgroundColor:
        "#D9E1E5",

      marginVertical: 3,
    },

    grandTotalRow: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginTop: 7,
    },

    grandTotalLabel: {
      color: "#102A43",

      fontSize: 13,

      fontWeight: "900",
    },

    grandTotalValue: {
      color: "#102A43",

      fontSize: 15,

      fontWeight: "900",
    },

    paymentStatus: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "flex-end",

      marginTop: 9,

      gap: 7,
    },

    paymentStatusText: {
      color: "#63717B",

      fontSize: 7.5,
    },

    paymentStatusDivider: {
      color: "#BCC6CB",

      fontSize: 8,
    },

    dueText: {
      color: "#A36A00",

      fontWeight: "900",
    },

    /* SECTION */

    section: {
      marginTop: 18,
    },

    sectionTitle: {
      color: "#102A43",

      fontSize: 9,

      fontWeight: "900",

      marginBottom: 5,
    },

    sectionText: {
      color: "#586670",

      fontSize: 8.5,

      lineHeight: 13,
    },

    thankYou: {
      color: "#263B48",

      fontSize: 9,

      fontWeight: "700",

      marginTop: 11,
    },

    /* PAYMENT */

    paymentCards: {
      flexDirection: "row",

      gap: 8,

      marginTop: 17,
    },

    paymentCard: {
      flex: 1,

      minHeight: 90,

      flexDirection: "row",

      alignItems:
        "flex-start",

      gap: 7,

      borderWidth: 1,

      borderColor:
        "#D2DCE1",

      borderRadius: 9,

      padding: 9,
    },

    paymentCardIcon: {
      width: 27,

      height: 27,

      flexShrink: 0,

      borderRadius: 8,

      backgroundColor:
        "#EAF7F5",

      alignItems: "center",

      justifyContent:
        "center",
    },

    paymentCardContent: {
      flex: 1,

      minWidth: 0,
    },

    paymentCardTitle: {
      color: "#203642",

      fontSize: 8.5,

      fontWeight: "900",
    },

    paymentCardText: {
      color: "#6E7A82",

      fontSize: 7,

      lineHeight: 10,

      marginTop: 3,
    },

    /* SIGNATURE */

    signatureSection: {
      alignItems:
        "flex-end",

      marginTop: 40,
    },

    signatureTitle: {
      color: "#172B38",

      fontSize: 9,

      fontWeight: "900",
    },

    signatureBusiness: {
      color: "#61707A",

      fontSize: 8,

      marginTop: 2,
    },

    footerDivider: {
      width: "100%",

      height: 1,

      backgroundColor:
        "#E1E7EA",

      marginTop: 16,
    },

    footerText: {
      color: "#86929A",

      fontSize: 6.5,

      lineHeight: 9,

      marginTop: 8,
    },

    /* BOTTOM BAR */

    bottomBar: {
      minHeight: 64,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "flex-end",

      gap: 8,

      paddingHorizontal: 12,

      paddingTop: 8,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth: 1,

      borderTopColor:
        "#DCE4E8",

      elevation: 8,

      shadowColor:
        "#183341",

      shadowOffset: {
        width: 0,

        height: -3,
      },

      shadowOpacity: 0.08,

      shadowRadius: 8,
    },

    backButton: {
      minHeight: 44,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal: 18,

      borderRadius: 11,

      backgroundColor:
        "#E9F7F5",
    },

    backButtonText: {
      color: "#087D75",

      fontSize: 11,

      fontWeight: "900",
    },

    saveButton: {
      minHeight: 44,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      gap: 5,

      paddingHorizontal: 18,

      borderRadius: 11,

      backgroundColor:
        "#0A958B",
    },

    saveButtonText: {
      color: "#FFFFFF",

      fontSize: 11,

      fontWeight: "900",
    },

    disabled: {
      opacity: 0.5,
    },

    pressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.98,
        },
      ],
    },

    /* TOAST */

    toast: {
      position: "absolute",

      left: 14,

      right: 14,

      bottom: 82,

      minHeight: 56,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#D4E7E3",

      borderRadius: 14,

      paddingHorizontal: 11,

      shadowColor:
        "#143631",

      shadowOffset: {
        width: 0,

        height: 5,
      },

      shadowOpacity: 0.16,

      shadowRadius: 12,

      elevation: 14,

      zIndex: 999,
    },

    toastIcon: {
      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor:
        "#0A958B",

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 9,
    },

    toastContent: {
      flex: 1,
    },

    toastTitle: {
      color: "#173A35",

      fontSize: 10.5,

      fontWeight: "900",
    },

    toastSubtitle: {
      color: "#75827F",

      fontSize: 8,

      marginTop: 2,
    },

    /* LOADING */

    loadingScreen: {
      flex: 1,

      alignItems: "center",

      justifyContent:
        "center",

      backgroundColor:
        "#EDF3F6",
    },

    loadingText: {
      color: "#68757F",

      marginTop: 10,

      fontSize: 10,
    },
  });