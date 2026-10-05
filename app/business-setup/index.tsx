import React, { useCallback, useMemo, useState } from "react";

import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { router, Stack, useFocusEffect } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { WebView } from "react-native-webview";

import * as Print from "expo-print";

import * as ImagePicker from "expo-image-picker";

import {
  loadBusinessSetup,
  resetBusinessSetup,
  saveBusinessSetup,
} from "../../src/services/businessSetupService";

import { logActivity } from "../../src/services/activityAuditService";

import type { BusinessSetup, PdfLayout } from "../../src/types/businessSetup";

import { colors } from "../../src/theme/colors";

/* =========================================================
   CONSTANTS
========================================================= */

const PDF_LAYOUTS: PdfLayout[] = ["STANDARD", "COMPACT", "CLASSIC"];

const DEFAULT_ACCENT = "#07867D";

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   SAMPLE PDF PREVIEW
========================================================= */

function buildPreviewHtml(settings: BusinessSetup): string {
  const accent = /^#[0-9A-F]{6}$/i.test(settings.accentColor)
    ? settings.accentColor
    : DEFAULT_ACCENT;

  const logo =
    settings.showBusinessLogo && settings.logoDataUri
      ? `
        <img
          class="logo"
          src="${settings.logoDataUri}"
        />
      `
      : "";

  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>

<style>

@page {
  size: A4 portrait;
  margin: 10mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 12px;
  background: #EDF4F6;
  color: #173042;

  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.paper {
  max-width: 820px;
  margin: 0 auto;

  background: #FFFFFF;

  border-radius: 16px;

  padding: 24px;
}

.top {
  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 18px;
}

.identity {
  display: flex;

  gap: 12px;

  flex: 1;
}

.logo {
  width: 62px;

  height: 62px;

  object-fit: contain;

  border-radius: 10px;
}

.business {
  color: #173042;

  font-size: 28px;

  font-weight: 900;
}

.small {
  color: #687782;

  font-size: 10px;

  line-height: 1.55;
}

.invoice {
  text-align: right;
}

.type {
  color: ${accent};

  font-weight: 900;

  font-size: 10px;

  letter-spacing: 1px;
}

.number {
  margin-top: 4px;

  font-size: 20px;

  font-weight: 900;
}

.rule {
  height: 4px;

  margin: 20px 0;

  background: ${accent};
}

.grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 12px;
}

.card {
  padding: 14px;

  background: #F5FAFA;

  border: 1px solid #D7E4E8;

  border-radius: 12px;
}

.label {
  color: #74838D;

  font-size: 8px;

  font-weight: 900;

  letter-spacing: .6px;

  margin-bottom: 7px;
}

.strong {
  font-weight: 900;
}

table {
  width: 100%;

  margin-top: 18px;

  border-collapse: collapse;

  border: 1px solid #D7E1E5;
}

th {
  padding: 10px;

  background: #EAF6F4;

  text-align: left;

  font-size: 9px;
}

td {
  padding: 11px 10px;

  border-top: 1px solid #E1E8EB;

  font-size: 9px;
}

.right {
  text-align: right;
}

.total {
  margin-top: 18px;

  padding: 16px;

  border: 1px solid #D7E1E5;

  border-radius: 12px;
}

.total-row {
  display: flex;

  justify-content: space-between;

  margin: 6px 0;

  font-size: 10px;
}

.grand {
  display: flex;

  justify-content: space-between;

  margin-top: 12px;

  padding-top: 12px;

  border-top: 1px solid #D7E1E5;

  font-size: 18px;

  font-weight: 900;
}

.payment-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 12px;

  margin-top: 18px;
}

.payment {
  padding: 13px;

  border: 1px solid #D7E1E5;

  border-radius: 12px;

  font-size: 9px;

  line-height: 1.5;
}

.payment-title {
  margin-bottom: 5px;

  font-weight: 900;
}

.terms {
  margin-top: 20px;

  font-size: 9px;

  line-height: 1.55;
}

.signature {
  margin-top: 42px;

  text-align: right;

  font-size: 9px;
}

@media print {

  body {
    padding: 0;

    background: #FFFFFF;
  }

  .paper {
    max-width: none;

    padding: 0;
  }
}

</style>

</head>

<body>

<main class="paper">

  <div class="top">

    <div class="identity">

      ${logo}

      <div>

        <div class="business">
          ${escapeHtml(settings.displayBusinessName)}
        </div>

        <div class="small">

          ${settings.address ? `${multiline(settings.address)}<br>` : ""}

          ${settings.gstin ? `GSTIN ${escapeHtml(settings.gstin)}` : ""}

          ${settings.pan ? ` • PAN ${escapeHtml(settings.pan)}` : ""}

          ${settings.phone ? `<br>${escapeHtml(settings.phone)}` : ""}

          ${settings.email ? ` • ${escapeHtml(settings.email)}` : ""}

        </div>

      </div>

    </div>

    <div class="invoice">

      <div class="type">
        TAX INVOICE
      </div>

      <div class="number">
        ${escapeHtml(settings.invoicePrefix)}${settings.nextInvoiceNumber}
      </div>

    </div>

  </div>

  <div class="rule"></div>

  <div class="grid">

    <div class="card">

      <div class="label">
        BILL TO
      </div>

      <div class="strong">
        Walk-in Customer
      </div>

      <div class="small">
        Customer / Walk-in party
      </div>

    </div>

    <div class="card">

      <div class="label">
        INVOICE DETAILS
      </div>

      <div class="small">

        FY:
        <span class="strong">
          ${escapeHtml(settings.financialYear)}
        </span>

        <br>

        Status:
        <span class="strong">
          DUE
        </span>

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
          Qty
        </th>

        <th class="right">
          Rate
        </th>

        ${
          settings.showGstBreakup
            ? `
              <th class="right">
                GST
              </th>
            `
            : ""
        }

        <th class="right">
          Total
        </th>

      </tr>

    </thead>

    <tbody>

      <tr>

        <td>

          <strong>
            Premium Rice 5kg
          </strong>

          ${
            settings.showHsnSac
              ? `
                <div class="small">
                  HSN: 100630
                </div>
              `
              : ""
          }

        </td>

        <td>
          1
        </td>

        <td class="right">
          ₹650.00
        </td>

        ${
          settings.showGstBreakup
            ? `
              <td class="right">
                5%
              </td>
            `
            : ""
        }

        <td class="right">
          ₹682.50
        </td>

      </tr>

    </tbody>

  </table>

  <div class="total">

    <div class="total-row">

      <span>
        Taxable value
      </span>

      <strong>
        ${money(650)}
      </strong>

    </div>

    ${
      settings.showGstBreakup
        ? `
          <div class="total-row">

            <span>
              GST
            </span>

            <strong>
              ${money(32.5)}
            </strong>

          </div>
        `
        : ""
    }

    <div class="grand">

      <span>
        Grand total
      </span>

      <span>
        ${money(682.5)}
      </span>

    </div>

  </div>

  ${
    settings.showBankUpi || settings.showCheque
      ? `
        <div class="payment-grid">

          ${
            settings.showBankUpi
              ? `
                <div class="payment">

                  <div class="payment-title">
                    Bank / UPI payment
                  </div>

                  ${escapeHtml(settings.bankName || "Bank not configured")}

                  ${
                    settings.bankBranch
                      ? `<br>${escapeHtml(settings.bankBranch)}`
                      : ""
                  }

                  ${
                    settings.accountName
                      ? `<br>A/c Name: ${escapeHtml(settings.accountName)}`
                      : ""
                  }

                  ${
                    settings.accountNumber
                      ? `<br>A/c: ${escapeHtml(settings.accountNumber)}`
                      : ""
                  }

                  ${
                    settings.ifsc
                      ? `<br>IFSC: ${escapeHtml(settings.ifsc)}`
                      : ""
                  }

                  ${settings.upi ? `<br>UPI: ${escapeHtml(settings.upi)}` : ""}

                </div>
              `
              : ""
          }

          ${
            settings.showCheque
              ? `
                <div class="payment">

                  <div class="payment-title">
                    Cheque information
                  </div>

                  ${escapeHtml(settings.chequePayee)}

                  <br>

                  ${multiline(settings.chequeInstructions)}

                </div>
              `
              : ""
          }

        </div>
      `
      : ""
  }

  <div class="terms">

    <strong>
      Terms & Conditions
    </strong>

    <div>
      ${multiline(settings.terms)}
    </div>

    <br>

    <strong>
      ${escapeHtml(settings.footerMessage)}
    </strong>

  </div>

  ${
    settings.showSignatureBlock
      ? `
        <div class="signature">

          <strong>
            ${escapeHtml(settings.signatureName)}
          </strong>

          <br>

          For
          ${escapeHtml(settings.displayBusinessName)}

        </div>
      `
      : ""
  }

</main>

</body>

</html>
`;
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline: multilineInput,
}: {
  label: string;

  value: string;

  onChangeText: (value: string) => void;

  placeholder?: string;

  keyboardType?: "default" | "number-pad" | "phone-pad" | "email-address";

  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B969E"
        keyboardType={keyboardType}
        multiline={multilineInput}
        style={[styles.input, multilineInput && styles.multilineInput]}
      />
    </View>
  );
}

/* =========================================================
   CHECK ROW
========================================================= */

function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;

  checked: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
      </View>

      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function BusinessSetupScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const wide = width >= 720;

  const [setup, setSetup] = useState<BusinessSetup | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const value = await loadBusinessSetup();

      setSetup(value);
    } catch (error) {
      Alert.alert(
        "Unable to load Business Setup",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  /* =======================================================
     UPDATE
  ======================================================= */

  const update = <K extends keyof BusinessSetup>(
    key: K,

    value: BusinessSetup[K],
  ) => {
    setSetup((current) =>
      current
        ? {
            ...current,

            [key]: value,
          }
        : current,
    );
  };

  /* =======================================================
     LOGO
  ======================================================= */

  const chooseLogo = async () => {
    if (!setup) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.7,

        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error("Unable to read selected logo.");
      }

      const mimeType = asset.mimeType || "image/jpeg";

      update(
        "logoDataUri",

        `data:${mimeType};base64,${asset.base64}`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to choose logo",

        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    if (!setup || saving) {
      return;
    }

    try {
      setSaving(true);

      await saveBusinessSetup(setup);

      void logActivity({
        module: "SETTINGS",

        action: "SETTINGS_UPDATED",

        title: "BUSINESS SETUP",

        details: "Updated business identity, numbering, bank and PDF settings",

        actorName: "Business Owner",

        actorRole: "Business owner",

        entityType: "BUSINESS_SETUP",

        entityId: setup.businessId,
      });

      Alert.alert("Saved", "Business Setup saved successfully.");

      await loadData();
    } catch (error) {
      Alert.alert(
        "Unable to save Business Setup",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RESET
  ======================================================= */

  const handleReset = () => {
    Alert.alert(
      "Reset Business Setup?",
      "This resets Business Setup settings only. Sales, purchases, customers and other transactions are not deleted.",
      [
        {
          text: "Cancel",

          style: "cancel",
        },

        {
          text: "Reset",

          style: "destructive",

          onPress: () => {
            void (async () => {
              try {
                const defaults = await resetBusinessSetup();

                setSetup(defaults);

                void logActivity({
                  module: "SETTINGS",

                  action: "SETTINGS_UPDATED",

                  title: "BUSINESS SETUP",

                  details: "Business Setup reset to defaults",

                  actorName: "Business Owner",

                  actorRole: "Business owner",

                  entityType: "BUSINESS_SETUP",
                });

                Alert.alert("Reset complete", "Business Setup has been reset.");
              } catch (error) {
                Alert.alert(
                  "Unable to reset",

                  error instanceof Error
                    ? error.message
                    : "Something went wrong.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  /* =======================================================
     PREVIEW
  ======================================================= */

  const openPreview = () => {
    if (!setup) {
      return;
    }

    setPreviewHtml(buildPreviewHtml(setup));
  };

  const printPreview = async () => {
    if (!previewHtml) {
      return;
    }

    try {
      await Print.printAsync({
        html: previewHtml,
      });

      void logActivity({
        module: "PDF",

        action: "PDF_GENERATED",

        title: "PDF GENERATED",

        details: `BUSINESS SETUP PREVIEW • ${setup?.displayBusinessName || "Business"}`,

        actorName: "Business Owner",

        actorRole: "Business owner",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (!/cancel/i.test(message)) {
        Alert.alert(
          "Unable to open PDF",

          message || "Please try again.",
        );
      }
    }
  };

  const previewSource = useMemo(
    () => ({
      html: previewHtml || "",
    }),
    [previewHtml],
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading || !setup) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading Business Setup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.screen}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Business Setup</Text>

            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Business identity, invoice, bank and PDF settings
            </Text>
          </View>

          <Pressable onPress={openPreview} style={styles.previewButton}>
            <Ionicons name="document-text-outline" size={15} color="#FFFFFF" />

            <Text style={styles.previewButtonText}>
              Preview
              {"\n"}
              PDF
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,

            wide && styles.contentWide,

            {
              paddingBottom: 92 + insets.bottom,
            },
          ]}
        >
          {/* BUSINESS LOGO */}

          <Text style={styles.sectionHeading}>Business logo</Text>

          <View style={styles.sectionCard}>
            <Text style={styles.smallLabel}>PDF BUSINESS LOGO</Text>

            <View style={styles.logoRow}>
              <View style={styles.logoPreview}>
                {setup.logoDataUri ? (
                  <Image
                    source={{
                      uri: setup.logoDataUri,
                    }}
                    resizeMode="contain"
                    style={styles.logoImage}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>
                      YOUR
                      {"\n"}
                      LOGO
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.logoActions}>
                <Pressable
                  onPress={() => void chooseLogo()}
                  style={styles.secondaryButton}
                >
                  <Ionicons
                    name="image-outline"
                    size={15}
                    color={colors.teal}
                  />

                  <Text style={styles.secondaryButtonText}>Choose logo</Text>
                </Pressable>

                {!!setup.logoDataUri && (
                  <Pressable onPress={() => update("logoDataUri", "")}>
                    <Text style={styles.removeLogoText}>Remove logo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* BUSINESS IDENTITY */}

          <Text style={styles.sectionHeading}>Business identity</Text>

          <View style={styles.sectionCard}>
            <View style={[styles.fieldsWrap, wide && styles.fieldsWrapWide]}>
              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="LEGAL BUSINESS NAME *"
                  value={setup.legalBusinessName}
                  onChangeText={(value) => update("legalBusinessName", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="DISPLAY BUSINESS NAME *"
                  value={setup.displayBusinessName}
                  onChangeText={(value) => update("displayBusinessName", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="GSTIN"
                  value={setup.gstin}
                  onChangeText={(value) => update("gstin", value.toUpperCase())}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="PAN"
                  value={setup.pan}
                  onChangeText={(value) => update("pan", value.toUpperCase())}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="PHONE"
                  value={setup.phone}
                  keyboardType="phone-pad"
                  onChangeText={(value) => update("phone", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="EMAIL"
                  value={setup.email}
                  keyboardType="email-address"
                  onChangeText={(value) => update("email", value)}
                />
              </View>

              <View style={styles.fullField}>
                <Field
                  label="REGISTERED ADDRESS"
                  value={setup.address}
                  multiline
                  onChangeText={(value) => update("address", value)}
                />
              </View>
            </View>
          </View>

          {/* NUMBERING & DESIGN */}

          <Text style={styles.sectionHeading}>Numbering & design</Text>

          <View style={styles.sectionCard}>
            <View style={[styles.fieldsWrap, wide && styles.fieldsWrapWide]}>
              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="INVOICE PREFIX"
                  value={setup.invoicePrefix}
                  onChangeText={(value) => update("invoicePrefix", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="NEXT INVOICE NUMBER"
                  value={String(setup.nextInvoiceNumber)}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    update(
                      "nextInvoiceNumber",

                      Number(value.replace(/[^0-9]/g, "")) || 0,
                    )
                  }
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="PURCHASE BILL PREFIX"
                  value={setup.purchaseBillPrefix}
                  onChangeText={(value) => update("purchaseBillPrefix", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="QUOTATION PREFIX"
                  value={setup.quotationPrefix}
                  onChangeText={(value) => update("quotationPrefix", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="FINANCIAL YEAR"
                  value={setup.financialYear}
                  onChangeText={(value) => update("financialYear", value)}
                />
              </View>

              <View style={wide ? styles.halfField : styles.fullField}>
                <Field
                  label="ACCENT COLOR"
                  value={setup.accentColor}
                  onChangeText={(value) => update("accentColor", value)}
                />
              </View>
            </View>

            <Text style={styles.smallLabel}>PDF LAYOUT</Text>

            <View style={styles.layoutRow}>
              {PDF_LAYOUTS.map((layout) => (
                <Pressable
                  key={layout}
                  onPress={() => update("pdfLayout", layout)}
                  style={[
                    styles.layoutOption,

                    setup.pdfLayout === layout && styles.layoutOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.layoutOptionText,

                      setup.pdfLayout === layout &&
                        styles.layoutOptionTextActive,
                    ]}
                  >
                    {layout}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* BANK */}

          <Text style={styles.sectionHeading}>Bank & UPI payment</Text>

          <View style={styles.sectionCard}>
            <Field
              label="BANK NAME"
              value={setup.bankName}
              onChangeText={(value) => update("bankName", value)}
            />

            <Field
              label="BRANCH"
              value={setup.bankBranch}
              onChangeText={(value) => update("bankBranch", value)}
            />

            <Field
              label="ACCOUNT NAME"
              value={setup.accountName}
              onChangeText={(value) => update("accountName", value)}
            />

            <Field
              label="ACCOUNT NUMBER"
              value={setup.accountNumber}
              onChangeText={(value) => update("accountNumber", value)}
            />

            <Field
              label="IFSC"
              value={setup.ifsc}
              onChangeText={(value) => update("ifsc", value.toUpperCase())}
            />

            <Field
              label="UPI ID"
              value={setup.upi}
              onChangeText={(value) => update("upi", value)}
            />
          </View>

          {/* CHEQUE */}

          <Text style={styles.sectionHeading}>Cheque information</Text>

          <View style={styles.sectionCard}>
            <Field
              label="CHEQUE PAYEE NAME"
              value={setup.chequePayee}
              onChangeText={(value) => update("chequePayee", value)}
            />

            <Field
              label="CHEQUE INSTRUCTIONS"
              value={setup.chequeInstructions}
              multiline
              onChangeText={(value) => update("chequeInstructions", value)}
            />
          </View>

          {/* TERMS */}

          <Text style={styles.sectionHeading}>Terms, footer & signature</Text>

          <View style={styles.sectionCard}>
            <Field
              label="TERMS & CONDITIONS"
              value={setup.terms}
              multiline
              onChangeText={(value) => update("terms", value)}
            />

            <Field
              label="FOOTER MESSAGE"
              value={setup.footerMessage}
              onChangeText={(value) => update("footerMessage", value)}
            />

            <Field
              label="SIGNATURE NAME"
              value={setup.signatureName}
              onChangeText={(value) => update("signatureName", value)}
            />
          </View>

          {/* SHOW ON PDF */}

          <Text style={styles.sectionHeading}>Show on PDF</Text>

          <View style={styles.sectionCard}>
            <CheckRow
              label="Business logo"
              checked={setup.showBusinessLogo}
              onPress={() =>
                update(
                  "showBusinessLogo",

                  !setup.showBusinessLogo,
                )
              }
            />

            <CheckRow
              label="Bank / UPI details"
              checked={setup.showBankUpi}
              onPress={() =>
                update(
                  "showBankUpi",

                  !setup.showBankUpi,
                )
              }
            />

            <CheckRow
              label="Cheque instructions"
              checked={setup.showCheque}
              onPress={() =>
                update(
                  "showCheque",

                  !setup.showCheque,
                )
              }
            />

            <CheckRow
              label="HSN / SAC column"
              checked={setup.showHsnSac}
              onPress={() =>
                update(
                  "showHsnSac",

                  !setup.showHsnSac,
                )
              }
            />

            <CheckRow
              label="GST breakup"
              checked={setup.showGstBreakup}
              onPress={() =>
                update(
                  "showGstBreakup",

                  !setup.showGstBreakup,
                )
              }
            />

            <CheckRow
              label="Signature block"
              checked={setup.showSignatureBlock}
              onPress={() =>
                update(
                  "showSignatureBlock",

                  !setup.showSignatureBlock,
                )
              }
            />
          </View>

          {/* ACTIONS */}

          <View style={styles.bottomActions}>
            <Pressable
              onPress={handleReset}
              disabled={saving}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Business reset</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.saveButton, saving && styles.disabled]}
            >
              <Ionicons
                name={saving ? "hourglass-outline" : "save-outline"}
                size={16}
                color="#FFFFFF"
              />

              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save all settings"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* PDF PREVIEW */}

        <Modal
          visible={Boolean(previewHtml)}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setPreviewHtml(null)}
        >
          <SafeAreaView style={styles.previewScreen}>
            <View style={styles.previewHeader}>
              <Pressable
                onPress={() => setPreviewHtml(null)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={19} color={colors.primary} />
              </Pressable>

              <View style={styles.previewTitleArea}>
                <Text style={styles.previewTitle}>PDF preview</Text>

                <Text style={styles.previewSubtitle}>
                  Business Setup sample invoice
                </Text>
              </View>

              <Pressable
                onPress={() => void printPreview()}
                style={styles.previewPrintButton}
              >
                <Ionicons name="print-outline" size={16} color="#FFFFFF" />

                <Text style={styles.previewPrintText}>Print / Save</Text>
              </Pressable>
            </View>

            <View style={styles.previewBody}>
              {Platform.OS === "web"
                ? React.createElement("iframe", {
                    srcDoc: previewHtml || "",

                    title: "Business Setup PDF preview",

                    style: {
                      width: "100%",

                      height: "100%",

                      border: 0,
                    },
                  })
                : previewHtml && (
                    <WebView
                      source={previewSource}
                      originWhitelist={["*"]}
                      style={styles.webView}
                      javaScriptEnabled={false}
                      domStorageEnabled={false}
                    />
                  )}
            </View>

            <View style={styles.previewBottom}>
              <Pressable
                onPress={() => setPreviewHtml(null)}
                style={styles.previewBackButton}
              >
                <Ionicons name="arrow-back" size={16} color={colors.teal} />

                <Text style={styles.previewBackText}>Back</Text>
              </Pressable>

              <Pressable
                onPress={() => void printPreview()}
                style={styles.previewBottomPrint}
              >
                <Ionicons name="download-outline" size={17} color="#FFFFFF" />

                <Text style={styles.previewBottomPrintText}>Save PDF</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor: colors.background,
  },

  screen: {
    flex: 1,

    backgroundColor: "#F1F5F7",
  },

  loading: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  loadingText: {
    color: colors.mutedText,

    fontSize: 12,
  },

  header: {
    minHeight: 72,

    paddingHorizontal: 12,

    paddingVertical: 10,

    flexDirection: "row",

    alignItems: "center",

    gap: 9,

    backgroundColor: colors.primary,

    elevation: 6,
  },

  backButton: {
    width: 34,

    height: 34,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",
  },

  headerText: {
    flex: 1,

    minWidth: 0,
  },

  headerTitle: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#D6E5EC",

    fontSize: 8,

    marginTop: 2,
  },

  previewButton: {
    minHeight: 43,

    minWidth: 76,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 8,

    borderRadius: 10,

    backgroundColor: colors.teal,
  },

  previewButtonText: {
    color: "#FFFFFF",

    fontSize: 9,

    lineHeight: 11,

    textAlign: "center",

    fontWeight: "900",
  },

  content: {
    width: "100%",

    padding: 11,
  },

  contentWide: {
    maxWidth: 980,

    alignSelf: "center",

    paddingTop: 18,
  },

  sectionHeading: {
    color: colors.text,

    fontSize: 12,

    fontWeight: "900",

    marginTop: 10,

    marginBottom: 6,
  },

  sectionCard: {
    width: "100%",

    padding: 11,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: "#FFFFFF",

    marginBottom: 4,
  },

  smallLabel: {
    color: colors.mutedText,

    fontSize: 7,

    fontWeight: "900",

    letterSpacing: 0.35,

    marginBottom: 6,
  },

  logoRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  logoPreview: {
    width: 72,

    height: 72,

    borderRadius: 12,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: "#F7FAFB",

    overflow: "hidden",
  },

  logoImage: {
    width: "100%",

    height: "100%",
  },

  logoPlaceholder: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  logoPlaceholderText: {
    color: colors.text,

    fontSize: 10,

    fontWeight: "900",

    textAlign: "center",
  },

  logoActions: {
    gap: 8,
  },

  secondaryButton: {
    minHeight: 36,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    paddingHorizontal: 11,

    borderRadius: 9,

    backgroundColor: "#E7F5F2",
  },

  secondaryButtonText: {
    color: colors.teal,

    fontSize: 9,

    fontWeight: "900",
  },

  removeLogoText: {
    color: "#B14C44",

    fontSize: 8,

    fontWeight: "700",
  },

  fieldsWrap: {
    width: "100%",
  },

  fieldsWrapWide: {
    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",
  },

  fullField: {
    width: "100%",
  },

  halfField: {
    width: "49%",
  },

  field: {
    width: "100%",

    marginBottom: 9,
  },

  fieldLabel: {
    color: colors.mutedText,

    fontSize: 6.8,

    fontWeight: "900",

    letterSpacing: 0.25,

    marginBottom: 4,
  },

  input: {
    width: "100%",

    minHeight: 38,

    paddingHorizontal: 10,

    paddingVertical: 8,

    borderWidth: 1,

    borderColor: "#D9E3E7",

    borderRadius: 9,

    backgroundColor: "#FFFFFF",

    color: colors.text,

    fontSize: 10,
  },

  multilineInput: {
    minHeight: 74,

    textAlignVertical: "top",
  },

  layoutRow: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 7,
  },

  layoutOption: {
    minHeight: 34,

    paddingHorizontal: 12,

    borderRadius: 9,

    borderWidth: 1,

    borderColor: colors.border,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",
  },

  layoutOptionActive: {
    borderColor: colors.teal,

    backgroundColor: "#E5F5F2",
  },

  layoutOptionText: {
    color: colors.mutedText,

    fontSize: 8,

    fontWeight: "800",
  },

  layoutOptionTextActive: {
    color: colors.teal,
  },

  checkRow: {
    minHeight: 40,

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 3,

    borderBottomWidth: 1,

    borderBottomColor: "#EEF2F4",
  },

  checkbox: {
    width: 19,

    height: 19,

    borderRadius: 5,

    borderWidth: 1.5,

    borderColor: "#A8B5BC",

    alignItems: "center",

    justifyContent: "center",
  },

  checkboxChecked: {
    borderColor: colors.teal,

    backgroundColor: colors.teal,
  },

  checkLabel: {
    flex: 1,

    color: colors.text,

    fontSize: 9,

    fontWeight: "700",
  },

  bottomActions: {
    flexDirection: "row",

    justifyContent: "flex-end",

    alignItems: "center",

    gap: 8,

    marginTop: 14,

    marginBottom: 10,
  },

  resetButton: {
    minHeight: 42,

    paddingHorizontal: 13,

    borderRadius: 10,

    backgroundColor: "#FFF0EC",

    alignItems: "center",

    justifyContent: "center",
  },

  resetButtonText: {
    color: "#B04A3E",

    fontSize: 9,

    fontWeight: "900",
  },

  saveButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    paddingHorizontal: 14,

    borderRadius: 10,

    backgroundColor: colors.teal,
  },

  saveButtonText: {
    color: "#FFFFFF",

    fontSize: 9,

    fontWeight: "900",
  },

  disabled: {
    opacity: 0.5,
  },

  previewScreen: {
    flex: 1,

    backgroundColor: "#EDF4F6",
  },

  previewHeader: {
    minHeight: 60,

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 10,

    paddingVertical: 8,

    backgroundColor: colors.primary,
  },

  previewTitleArea: {
    flex: 1,

    minWidth: 0,
  },

  previewTitle: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "900",
  },

  previewSubtitle: {
    color: "#D6E5EC",

    fontSize: 8,

    marginTop: 2,
  },

  previewPrintButton: {
    minHeight: 36,

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 10,

    borderRadius: 9,

    backgroundColor: colors.teal,
  },

  previewPrintText: {
    color: "#FFFFFF",

    fontSize: 8,

    fontWeight: "900",
  },

  previewBody: {
    flex: 1,
  },

  webView: {
    flex: 1,

    backgroundColor: "#EDF4F6",
  },

  previewBottom: {
    minHeight: 62,

    flexDirection: "row",

    justifyContent: "flex-end",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 10,

    paddingVertical: 9,

    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,

    borderTopColor: colors.border,
  },

  previewBackButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 15,

    borderRadius: 11,

    backgroundColor: "#E6F5F2",
  },

  previewBackText: {
    color: colors.teal,

    fontSize: 10,

    fontWeight: "900",
  },

  previewBottomPrint: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 15,

    borderRadius: 11,

    backgroundColor: colors.teal,
  },

  previewBottomPrintText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },
});
