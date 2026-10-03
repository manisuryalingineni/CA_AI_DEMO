import React, { useCallback, useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { colors } from "../../src/theme/colors";

import {
  loadReport,
  loadReportsSummary,
} from "../../src/services/reportService";

import { saveReportPdf } from "../../src/services/reportPdfService";

import type { ReportId, ReportsDashboardSummary } from "../../src/types/report";

/*         =
   TYPES
        = */

type ReportItem = {
  id: ReportId;

  title: string;

  description: string;

  icon: string;
};

/*         =
   REPORT MODULES
        = */

const REPORTS: ReportItem[] = [
  {
    id: "sales-register",

    title: "Sales register",

    description: "Invoices, GST and due",

    icon: "📈",
  },

  {
    id: "purchase-register",

    title: "Purchase register",

    description: "Bills, ITC and due",

    icon: "📉",
  },

  {
    id: "stock-report",

    title: "Stock report",

    description: "Quantity and value",

    icon: "📦",
  },

  {
    id: "receivables",

    title: "Receivables",

    description: "Customer outstanding",

    icon: "☑️",
  },

  {
    id: "payables",

    title: "Payables",

    description: "Vendor outstanding",

    icon: "↗️",
  },

  {
    id: "payment-register",

    title: "Payment & cheque register",

    description: "Receipts, payments and cheque details",

    icon: "💳",
  },

  {
    id: "cash-flow",

    title: "Cash-flow register",

    description: "Money in and money out",

    icon: "💵",
  },

  {
    id: "bank-reconciliation",

    title: "Bank reconciliation",

    description: "Matched and unmatched statement rows",

    icon: "🏦",
  },

  {
    id: "gst-working",

    title: "GST working",

    description: "Output, ITC and net GST",

    icon: "🧮",
  },

  {
    id: "gst-readiness",

    title: "GST readiness",

    description: "GSTR and statutory checklist",

    icon: "🛡️",
  },

  {
    id: "profit-loss",

    title: "Profit & loss",

    description: "Income, purchase and expenses",

    icon: "📊",
  },

  {
    id: "day-book",

    title: "Day book",

    description: "All dated transactions",

    icon: "📒",
  },

  {
    id: "payroll-summary",

    title: "Payroll summary",

    description: "Salary, labour and deductions",

    icon: "👨‍💼",
  },

  {
    id: "business-income-tax",

    title: "Business income tax",

    description: "Book closure and IT working",

    icon: "🧾",
  },

  {
    id: "document-index",

    title: "Document index",

    description: "Accounting and tax evidence",

    icon: "📁",
  },

  {
    id: "counter-product-branch",

    title: "Counter, product and branch sales",

    description: "Industry-specific analysis",

    icon: "🏬",
  },
];

/*         =
   HELPERS
        = */

function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/*         =
   SCREEN
        = */

export default function ReportsScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isSmall = width < 370;

  const isTablet = width >= 700;

  /*        ======
     STATE
         ====== */

  const [summary, setSummary] = useState<ReportsDashboardSummary>({
    netSales: 0,

    netPurchases: 0,

    bookResult: 0,

    stockValue: 0,
  });

  const [loadingSummary, setLoadingSummary] = useState(true);

  const [creatingProfitPdf, setCreatingProfitPdf] = useState(false);

  /*        ======
     LOAD SUMMARY
         ====== */

  const refreshSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);

      const result = await loadReportsSummary();

      setSummary(result);
    } catch (error) {
      console.error("Unable to load report summary:", error);

      setSummary({
        netSales: 0,

        netPurchases: 0,

        bookResult: 0,

        stockValue: 0,
      });
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSummary();
    }, [refreshSummary]),
  );

  /*        ======
     OPEN REPORT
         ====== */

  const openReport = (report: ReportItem) => {
    router.push(`/reports/${report.id}` as any);
  };

  /*        ======
     SAVE PROFIT / LOSS PDF
         ====== */

  const handleProfitLossPdf = async () => {
    if (creatingProfitPdf) {
      return;
    }

    try {
      setCreatingProfitPdf(true);

      /*
       * Load live Profit/Loss data
       * from SQLite.
       */

      const report = await loadReport("profit-loss");

      /*
       * Android:
       * opens folder picker
       * and permanently saves PDF.
       *
       * iOS:
       * saves to app documents.
       *
       * Web:
       * opens browser PDF/print flow.
       */

      const result = await saveReportPdf(report);

      /*
       * User cancelled Android
       * folder selection.
       *
       * No error alert required.
       */

      if (result.cancelled) {
        return;
      }

      if (result.saved) {
        Alert.alert(
          "Profit/Loss PDF saved",

          result.fileName
            ? `${result.fileName} saved successfully.`
            : "Profit/Loss PDF saved successfully.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to save PDF",

        error instanceof Error
          ? error.message
          : "Something went wrong while saving the Profit/Loss PDF.",
      );
    } finally {
      setCreatingProfitPdf(false);
    }
  };

  /*        ======
     UI
         ====== */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/*        
            HEADER
                */}

        <View style={styles.topHeader}>
          {/* BACK BUTTON */}

          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.headerBackButton,

              pressed && styles.headerBackButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
          </Pressable>

          {/* LOGO */}

          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>

          {/* BUSINESS INFO */}

          <View style={styles.appHeaderText}>
            <Text style={styles.appTitle} numberOfLines={1}>
              CA AI Business
            </Text>

            <Text style={styles.appSubtitle} numberOfLines={1}>
            • Retail Shop
            </Text>
          </View>

          <View style={styles.headerSpacer} />

          {/* OWNER */}

          {!isSmall && (
            <View style={styles.ownerPill}>
              <Ionicons name="person" size={10} color="#D4E6ED" />

              <Text style={styles.ownerText} numberOfLines={1}>
                Business Owner
              </Text>
            </View>
          )}
        </View>

        {/*        
            CONTENT
                */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,

            isTablet && styles.scrollContentTablet,

            {
              paddingBottom: 98 + insets.bottom,
            },
          ]}
        >
          {/*        
              PAGE HEADING
                  */}

          <View style={styles.pageHeadingRow}>
            <View style={styles.pageHeadingText}>
              <Text
                style={[styles.pageTitle, isSmall && styles.pageTitleSmall]}
              >
                All reports
              </Text>

              <Text style={styles.pageSubtitle}>
                Every figure is calculated from this selected business
              </Text>
            </View>

            {/*        
                PROFIT / LOSS SAVE PDF
                    */}

            <Pressable
              onPress={handleProfitLossPdf}
              disabled={creatingProfitPdf}
              style={({ pressed }) => [
                styles.profitPdfButton,

                creatingProfitPdf && styles.profitPdfButtonDisabled,

                pressed && !creatingProfitPdf && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  creatingProfitPdf ? "hourglass-outline" : "download-outline"
                }
                size={15}
                color="#FFFFFF"
              />

              <View style={styles.profitPdfTextWrapper}>
                <Text style={styles.profitPdfText}>
                  {creatingProfitPdf ? "Saving..." : "Profit/Loss"}
                </Text>

                {!creatingProfitPdf && (
                  <Text style={styles.profitPdfText}>Save PDF</Text>
                )}
              </View>
            </Pressable>
          </View>

          {/*        
              SUMMARY BANNER
                  */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              {/* NET SALES */}

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net sales</Text>

                <Text style={styles.summaryValue}>
                  {loadingSummary ? "..." : formatCurrency(summary.netSales)}
                </Text>
              </View>

              {/* NET PURCHASES */}

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net purchases</Text>

                <Text style={styles.summaryValue}>
                  {loadingSummary
                    ? "..."
                    : formatCurrency(summary.netPurchases)}
                </Text>
              </View>

              {/* BOOK RESULT */}

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Book result</Text>

                <Text
                  style={[
                    styles.summaryValue,

                    !loadingSummary &&
                      summary.bookResult < 0 &&
                      styles.negativeSummaryValue,
                  ]}
                >
                  {loadingSummary ? "..." : formatCurrency(summary.bookResult)}
                </Text>
              </View>

              {/* STOCK VALUE */}

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Stock value</Text>

                <Text style={styles.summaryValue}>
                  {loadingSummary ? "..." : formatCurrency(summary.stockValue)}
                </Text>
              </View>
            </View>
          </View>

          {/*        
              REPORT MODULE GRID
                  */}

          <View style={styles.reportGrid}>
            {REPORTS.map((report) => (
              <Pressable
                key={report.id}
                onPress={() => openReport(report)}
                style={({ pressed }) => [
                  styles.reportCard,

                  isTablet && styles.reportCardTablet,

                  pressed && styles.reportCardPressed,
                ]}
              >
                {/* ICON */}

                <View style={styles.iconBox}>
                  <Text
                    style={[
                      styles.reportIcon,

                      isSmall && styles.reportIconSmall,
                    ]}
                  >
                    {report.icon}
                  </Text>
                </View>

                {/* TITLE */}

                <Text
                  style={[
                    styles.reportTitle,

                    isSmall && styles.reportTitleSmall,
                  ]}
                  numberOfLines={2}
                >
                  {report.title}
                </Text>

                {/* DESCRIPTION */}

                <Text style={styles.reportDescription} numberOfLines={2}>
                  {report.description}
                </Text>

                {/* OPEN REPORT */}

                <View style={styles.openReportPill}>
                  <Text style={styles.openReportText}>OPEN REPORT</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/*        
            BOTTOM NAVIGATION

            Reports belongs to Quick Entry,
            therefore no navigation item is active.
                */}

        <View
          style={[
            styles.bottomNavigation,

            {
              bottom: Math.max(8, insets.bottom),
            },
          ]}
        >
          {/* HOME */}

          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={({ pressed }) => [
              styles.navButton,

              pressed && styles.navButtonPressed,
            ]}
          >
            <Text style={styles.navIcon}>⌂</Text>

            <Text style={styles.navText}>Home</Text>
          </Pressable>

          {/* SALES */}

          <Pressable
            onPress={() => router.push("/sales")}
            style={({ pressed }) => [
              styles.navButton,

              pressed && styles.navButtonPressed,
            ]}
          >
            <Text style={styles.navIcon}>🧾</Text>

            <Text style={styles.navText}>Sales</Text>
          </Pressable>

          {/* PURCHASES */}

          <Pressable
            onPress={() => router.push("/purchases")}
            style={({ pressed }) => [
              styles.navButton,

              pressed && styles.navButtonPressed,
            ]}
          >
            <Text style={styles.navIcon}>📥</Text>

            <Text style={styles.navText}>Purchases</Text>
          </Pressable>

          {/* MORE */}

          <Pressable
            onPress={() => router.push("/more")}
            style={({ pressed }) => [
              styles.navButton,

              pressed && styles.navButtonPressed,
            ]}
          >
            <Text style={styles.navIcon}>▦</Text>

            <Text style={styles.navText}>More</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/*         =
   STYLES
        = */

const styles = StyleSheet.create({
  /*        ====
       ROOT
           ==== */

  safeArea: {
    flex: 1,

    backgroundColor: "#F2F7FA",
  },

  container: {
    flex: 1,

    backgroundColor: "#F2F7FA",
  },

  /*        ====
       HEADER
           ==== */

  topHeader: {
    minHeight: 58,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 10,

    gap: 7,

    backgroundColor: colors.primary,

    elevation: 5,

    shadowColor: "#061B26",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.12,

    shadowRadius: 5,
  },

  headerBackButton: {
    width: 34,

    height: 34,

    flexShrink: 0,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D9E3E7",

    elevation: 4,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.15,

    shadowRadius: 3,
  },

  headerBackButtonPressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  logo: {
    width: 34,

    height: 34,

    flexShrink: 0,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.gold,
  },

  logoText: {
    color: colors.primary,

    fontSize: 11,

    fontWeight: "900",
  },

  appHeaderText: {
    flexShrink: 1,

    minWidth: 0,
  },

  appTitle: {
    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "900",
  },

  appSubtitle: {
    color: "#D5E6EE",

    fontSize: 7.5,

    marginTop: 1,
  },

  headerSpacer: {
    flex: 1,
  },

  ownerPill: {
    minHeight: 28,

    maxWidth: 90,

    flexDirection: "row",

    alignItems: "center",

    gap: 3,

    paddingHorizontal: 7,

    borderRadius: 14,

    backgroundColor: "rgba(255,255,255,0.10)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.16)",
  },

  ownerText: {
    flexShrink: 1,

    color: "#FFFFFF",

    fontSize: 7,

    fontWeight: "700",
  },

  /*        ====
       SCROLL
           ==== */

  scrollContent: {
    width: "100%",

    alignSelf: "center",

    paddingHorizontal: 9,

    paddingTop: 12,
  },

  scrollContentTablet: {
    maxWidth: 900,

    paddingHorizontal: 16,
  },

  /*        ====
       PAGE HEADING
           ==== */

  pageHeadingRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginBottom: 9,
  },

  pageHeadingText: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: "#142638",

    fontSize: 17,

    fontWeight: "900",
  },

  pageTitleSmall: {
    fontSize: 15,
  },

  pageSubtitle: {
    color: "#77858E",

    fontSize: 7.2,

    lineHeight: 10,

    marginTop: 2,
  },

  /*        ====
       PROFIT LOSS PDF
           ==== */

  profitPdfButton: {
    minWidth: 108,

    minHeight: 46,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,

    paddingHorizontal: 10,

    backgroundColor: colors.teal,

    borderRadius: 11,

    elevation: 2,

    shadowColor: colors.teal,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.14,

    shadowRadius: 4,
  },

  profitPdfButtonDisabled: {
    opacity: 0.55,
  },

  profitPdfTextWrapper: {
    alignItems: "center",

    justifyContent: "center",
  },

  profitPdfText: {
    color: "#FFFFFF",

    fontSize: 8.5,

    lineHeight: 10,

    fontWeight: "900",

    textAlign: "center",
  },

  /*        ====
       SUMMARY BANNER
           ==== */

  summaryCard: {
    width: "100%",

    backgroundColor: "#075982",

    borderRadius: 17,

    padding: 8,

    marginBottom: 10,

    overflow: "hidden",
  },

  summaryGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 6,
  },

  summaryItem: {
    width: "49%",

    minHeight: 58,

    borderRadius: 11,

    paddingHorizontal: 8,

    paddingVertical: 8,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "rgba(255,255,255,0.09)",
  },

  summaryLabel: {
    width: "100%",

    color: "#C8DFE8",

    fontSize: 7.2,

    fontWeight: "700",

    textAlign: "center",
  },

  summaryValue: {
    width: "100%",

    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "900",

    marginTop: 4,

    textAlign: "center",
  },

  negativeSummaryValue: {
    color: "#FFD6D0",
  },

  /*        ====
       REPORT GRID
           ==== */

  reportGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 8,
  },

  reportCard: {
    width: "49%",

    minHeight: 132,

    backgroundColor: "#FFFFFF",

    borderRadius: 15,

    borderWidth: 1,

    borderColor: "#DFE7EA",

    paddingHorizontal: 9,

    paddingVertical: 11,

    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#173541",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.05,

    shadowRadius: 5,

    elevation: 2,
  },

  reportCardTablet: {
    width: "32.4%",

    minHeight: 142,
  },

  reportCardPressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  /*        ====
       REPORT ICON
           ==== */

  iconBox: {
    width: 40,

    height: 40,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#EAF7F5",

    marginBottom: 7,
  },

  reportIcon: {
    fontSize: 21,

    lineHeight: 26,

    textAlign: "center",
  },

  reportIconSmall: {
    fontSize: 19,
  },

  /*        ====
       REPORT TEXT
           ==== */

  reportTitle: {
    width: "100%",

    color: "#182936",

    fontSize: 9.7,

    lineHeight: 12,

    fontWeight: "900",

    textAlign: "center",
  },

  reportTitleSmall: {
    fontSize: 9,
  },

  reportDescription: {
    width: "100%",

    color: "#7C878D",

    fontSize: 7,

    lineHeight: 10,

    textAlign: "center",

    marginTop: 4,

    minHeight: 20,
  },

  openReportPill: {
    minHeight: 19,

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 99,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#E2F6EF",

    marginTop: 6,
  },

  openReportText: {
    color: "#16976F",

    fontSize: 6,

    fontWeight: "900",

    textAlign: "center",
  },

  pressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /*        ====
       BOTTOM NAVIGATION
           ==== */

  bottomNavigation: {
    position: "absolute",

    left: 9,

    right: 9,

    flexDirection: "row",

    gap: 4,

    padding: 6,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 20,

    shadowColor: colors.primary,

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

    alignItems: "center",

    justifyContent: "center",
  },

  navButtonPressed: {
    backgroundColor: "#F0F6F7",

    opacity: 0.75,
  },

  navIcon: {
    color: colors.mutedText,

    fontSize: 19,

    marginBottom: 2,
  },

  navText: {
    color: colors.mutedText,

    fontSize: 9,

    fontWeight: "800",
  },
});
