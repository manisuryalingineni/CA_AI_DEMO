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

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { loadReport } from "../../src/services/reportService";

import {
  printReport,
  saveReportPdf,
} from "../../src/services/reportPdfService";

import type { ReportData, ReportField, ReportId } from "../../src/types/report";

import { colors } from "../../src/theme/colors";

/* =========================================================
   REPORT IDS
========================================================= */

const REPORT_IDS: ReportId[] = [
  "sales-register",
  "purchase-register",
  "stock-report",
  "receivables",
  "payables",
  "payment-register",
  "cash-flow",
  "bank-reconciliation",
  "gst-working",
  "gst-readiness",
  "profit-loss",
  "day-book",
  "payroll-summary",
  "business-income-tax",
  "document-index",
  "counter-product-branch",
];

/* =========================================================
   FORMAT HELPERS
========================================================= */

function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatValue(
  value: string | number | null | undefined,

  field: ReportField,
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  switch (field.format) {
    case "money":
      return money(value);

    case "number":
      return Number(value).toLocaleString("en-IN");

    default:
      return String(value);
  }
}

/* =========================================================
   SCREEN
========================================================= */

export default function ReportViewerScreen() {
  const { reportId } = useLocalSearchParams<{
    reportId?: string;
  }>();

  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isSmall = width < 370;

  const isTablet = width >= 700;

  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState<ReportData | null>(null);

  const [pdfBusy, setPdfBusy] = useState(false);

  const [printBusy, setPrintBusy] = useState(false);

  /* =======================================================
     VALID REPORT
  ======================================================= */

  const validReportId = REPORT_IDS.includes(reportId as ReportId)
    ? (reportId as ReportId)
    : null;

  /* =======================================================
     LOAD REPORT
  ======================================================= */

  const refresh = useCallback(async () => {
    if (!validReportId) {
      setReport(null);

      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      const result = await loadReport(validReportId);

      setReport(result);
    } catch (error) {
      Alert.alert(
        "Unable to load report",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, [validReportId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  /* =======================================================
     SAVE PDF
  ======================================================= */

  const handlePdf = async () => {
    if (!report || pdfBusy) {
      return;
    }

    try {
      setPdfBusy(true);

      const result = await saveReportPdf(report);

      /*
       * User closed the folder picker
       * or did not grant access.
       *
       * Do not show an error.
       */

      if (result.cancelled) {
        return;
      }

      if (result.saved) {
        Alert.alert(
          "PDF saved",

          result.fileName
            ? `${result.fileName} saved successfully.`
            : `${report.title} PDF saved successfully.`,
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to save PDF",

        error instanceof Error
          ? error.message
          : "Something went wrong while saving the PDF.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  /* =======================================================
     PRINT
  ======================================================= */

  const handlePrint = async () => {
    if (!report || printBusy) {
      return;
    }

    try {
      setPrintBusy(true);

      await printReport(report);
    } catch (error) {
      Alert.alert(
        "Unable to print",

        error instanceof Error
          ? error.message
          : "Something went wrong while printing.",
      );
    } finally {
      setPrintBusy(false);
    }
  };

  /* =======================================================
     INVALID REPORT
  ======================================================= */

  if (!validReportId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centerScreen}>
          <View style={styles.invalidIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={colors.teal}
            />
          </View>

          <Text style={styles.emptyTitle}>Report not found</Text>

          <Text style={styles.emptyText}>
            The selected report could not be found.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.primaryButton,

              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={15} color="#FFFFFF" />

            <Text style={styles.primaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          {/* BACK */}

          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backButton,

              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
          </Pressable>

          {/* TITLE */}

          <View style={styles.headerText}>
            <Text
              style={[styles.headerTitle, isSmall && styles.headerTitleSmall]}
              numberOfLines={1}
            >
              {report?.title || "Report"}
            </Text>

            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {report?.subtitle || "Retail Shop • live saved data"}
            </Text>
          </View>

          {/* LOGO */}

          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>CA</Text>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,

            isTablet && styles.contentTablet,

            {
              paddingBottom: 105 + insets.bottom,
            },
          ]}
        >
          {/* LOADING */}

          {loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="hourglass-outline"
                  size={23}
                  color={colors.teal}
                />
              </View>

              <Text style={styles.emptyTitle}>Loading report...</Text>

              <Text style={styles.emptyText}>
                Reading the latest saved business data.
              </Text>
            </View>
          ) : !report ? (
            /* LOAD ERROR */

            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={23}
                  color={colors.teal}
                />
              </View>

              <Text style={styles.emptyTitle}>Unable to load report</Text>

              <Text style={styles.emptyText}>
                Please go back and open the report again.
              </Text>
            </View>
          ) : report.rows.length === 0 ? (
            /* EMPTY REPORT */

            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={colors.teal}
                />
              </View>

              <Text style={styles.emptyTitle}>No data</Text>

              <Text style={styles.emptyText}>
                {report.emptyMessage ||
                  "No records are available for this report."}
              </Text>
            </View>
          ) : (
            /* =================================================
               REPORT RECORDS
            ================================================= */

            <View style={styles.recordsContainer}>
              {report.rows.map((row, rowIndex) => (
                <View key={row.id} style={styles.recordCard}>
                  {/* RECORD HEADER */}

                  {report.rows.length > 1 && (
                    <View style={styles.recordHeader}>
                      <View style={styles.recordHeaderLeft}>
                        <View style={styles.recordDot} />

                        <Text style={styles.recordNumber}>
                          Record {rowIndex + 1}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* =================================================
                        RESPONSIVE 2 COLUMN GRID
                    ================================================= */}

                  <View style={styles.fieldGrid}>
                    {report.fields.map((field, fieldIndex) => {
                      /*
                       * When there is an odd number
                       * of fields, the last one spans
                       * the entire row.
                       */

                      const fullWidth =
                        report.fields.length % 2 !== 0 &&
                        fieldIndex === report.fields.length - 1;

                      /*
                       * Detect second column so
                       * the last cell on each row
                       * doesn't draw unnecessary
                       * right border.
                       */

                      const secondColumn = fieldIndex % 2 === 1;

                      return (
                        <View
                          key={field.key}
                          style={[
                            styles.fieldCell,

                            secondColumn && styles.fieldCellRight,

                            fullWidth && styles.fieldCellFull,
                          ]}
                        >
                          <Text style={styles.fieldLabel} numberOfLines={1}>
                            {field.label}
                          </Text>

                          <Text style={styles.fieldValue}>
                            {formatValue(row.values[field.key], field)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* =================================================
              SUMMARY
          ================================================= */}

          {report &&
            report.summaryLabel &&
            report.summaryValue !== undefined && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="calculator-outline"
                    size={18}
                    color={colors.teal}
                  />
                </View>

                <View style={styles.summaryTextArea}>
                  <Text style={styles.summaryLabel}>{report.summaryLabel}</Text>

                  <Text style={styles.summaryHint}>
                    Calculated from saved records
                  </Text>
                </View>

                <Text style={styles.summaryValue}>
                  {money(report.summaryValue)}
                </Text>
              </View>
            )}
        </ScrollView>

        {/* =================================================
            FIXED ACTION BAR
        ================================================= */}

        <View
          style={[
            styles.bottomActions,

            {
              paddingBottom: Math.max(8, insets.bottom),
            },
          ]}
        >
          {/* CLOSE */}

          <Pressable
            onPress={() => router.back()}
            disabled={pdfBusy || printBusy}
            style={({ pressed }) => [
              styles.closeButton,

              pressed && !pdfBusy && !printBusy && styles.pressed,
            ]}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>

          {/* PRINT */}

          <Pressable
            onPress={handlePrint}
            disabled={printBusy || loading || !report}
            style={({ pressed }) => [
              styles.printButton,

              (printBusy || loading || !report) && styles.disabled,

              pressed && !printBusy && !loading && report && styles.pressed,
            ]}
          >
            <Ionicons name="print-outline" size={16} color={colors.teal} />

            <Text style={styles.printText}>
              {printBusy ? "Opening..." : "Print"}
            </Text>
          </Pressable>

          {/* SAVE PDF */}

          <Pressable
            onPress={handlePdf}
            disabled={pdfBusy || loading || !report}
            style={({ pressed }) => [
              styles.pdfButton,

              (pdfBusy || loading || !report) && styles.disabled,

              pressed && !pdfBusy && !loading && report && styles.pressed,
            ]}
          >
            <Ionicons
              name={pdfBusy ? "hourglass-outline" : "download-outline"}
              size={16}
              color="#FFFFFF"
            />

            <Text style={styles.pdfText}>
              {pdfBusy ? "Saving..." : "Save PDF"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
       ROOT
    ===================================================== */

  safeArea: {
    flex: 1,

    backgroundColor: "#F3F7F9",
  },

  container: {
    flex: 1,

    backgroundColor: "#F3F7F9",
  },

  centerScreen: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: 20,

    backgroundColor: "#F3F7F9",
  },

  /* =====================================================
       HEADER
    ===================================================== */

  header: {
    minHeight: 68,

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 12,

    paddingVertical: 9,

    backgroundColor: colors.primary,

    elevation: 5,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.12,

    shadowRadius: 5,
  },

  /* =====================================================
       BACK BUTTON
    ===================================================== */

  backButton: {
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

  backButtonPressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  headerText: {
    flex: 1,

    minWidth: 0,
  },

  headerTitle: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "900",
  },

  headerTitleSmall: {
    fontSize: 16,
  },

  headerSubtitle: {
    color: "#D6E5EC",

    fontSize: 9,

    marginTop: 2,
  },

  headerLogo: {
    width: 38,

    height: 38,

    flexShrink: 0,

    borderRadius: 11,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.gold,
  },

  headerLogoText: {
    color: colors.primary,

    fontSize: 12,

    fontWeight: "900",
  },

  /* =====================================================
       CONTENT
    ===================================================== */

  content: {
    width: "100%",

    padding: 12,

    alignSelf: "center",
  },

  contentTablet: {
    maxWidth: 850,

    paddingHorizontal: 20,

    paddingTop: 18,
  },

  recordsContainer: {
    gap: 10,
  },

  /* =====================================================
       RECORD
    ===================================================== */

  recordCard: {
    width: "100%",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DCE6EA",

    borderRadius: 15,

    overflow: "hidden",

    elevation: 1,

    shadowColor: "#153442",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 5,
  },

  recordHeader: {
    minHeight: 32,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 12,

    backgroundColor: "#EAF5F6",

    borderBottomWidth: 1,

    borderBottomColor: "#DDE8EB",
  },

  recordHeaderLeft: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,
  },

  recordDot: {
    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: colors.teal,
  },

  recordNumber: {
    color: "#55717A",

    fontSize: 8,

    fontWeight: "900",

    textTransform: "uppercase",

    letterSpacing: 0.35,
  },

  /* =====================================================
       RESPONSIVE 2 COLUMN TABLE
    ===================================================== */

  fieldGrid: {
    width: "100%",

    flexDirection: "row",

    flexWrap: "wrap",
  },

  fieldCell: {
    width: "50%",

    minHeight: 66,

    justifyContent: "center",

    paddingHorizontal: 12,

    paddingVertical: 9,

    borderBottomWidth: 1,

    borderRightWidth: 1,

    borderColor: "#E7EEF1",
  },

  fieldCellRight: {
    borderRightWidth: 0,
  },

  fieldCellFull: {
    width: "100%",

    borderRightWidth: 0,
  },

  fieldLabel: {
    color: "#647782",

    fontSize: 7.5,

    fontWeight: "900",

    textTransform: "uppercase",

    letterSpacing: 0.3,
  },

  fieldValue: {
    color: "#172C3A",

    fontSize: 11,

    lineHeight: 15,

    fontWeight: "700",

    marginTop: 5,
  },

  /* =====================================================
       SUMMARY
    ===================================================== */

  summaryBox: {
    minHeight: 68,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    marginTop: 11,

    paddingHorizontal: 13,

    paddingVertical: 10,

    backgroundColor: "#E8F7FD",

    borderWidth: 1,

    borderColor: "#BDE0EC",

    borderRadius: 13,
  },

  summaryIcon: {
    width: 34,

    height: 34,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#D8F1EF",
  },

  summaryTextArea: {
    flex: 1,

    minWidth: 0,
  },

  summaryLabel: {
    color: "#165C78",

    fontSize: 10,

    fontWeight: "900",
  },

  summaryHint: {
    color: "#66808C",

    fontSize: 7,

    marginTop: 2,
  },

  summaryValue: {
    color: "#123A4C",

    fontSize: 14,

    fontWeight: "900",

    textAlign: "right",
  },

  /* =====================================================
       EMPTY / INVALID
    ===================================================== */

  emptyState: {
    minHeight: 240,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DCE6E9",

    borderRadius: 15,

    padding: 20,
  },

  emptyIcon: {
    width: 48,

    height: 48,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E8F5F4",

    marginBottom: 9,
  },

  invalidIcon: {
    width: 54,

    height: 54,

    borderRadius: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E8F5F4",

    marginBottom: 10,
  },

  emptyTitle: {
    color: "#162C3A",

    fontSize: 14,

    fontWeight: "900",

    textAlign: "center",
  },

  emptyText: {
    color: "#79878E",

    fontSize: 9,

    lineHeight: 13,

    textAlign: "center",

    marginTop: 4,

    maxWidth: 320,
  },

  /* =====================================================
       BOTTOM ACTIONS
    ===================================================== */

  bottomActions: {
    minHeight: 60,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "flex-end",

    gap: 7,

    paddingHorizontal: 10,

    paddingTop: 8,

    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,

    borderTopColor: "#DEE7EA",

    elevation: 10,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,

      height: -2,
    },

    shadowOpacity: 0.07,

    shadowRadius: 6,
  },

  closeButton: {
    minHeight: 42,

    paddingHorizontal: 15,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: "#EAF7F4",
  },

  closeText: {
    color: colors.teal,

    fontSize: 10,

    fontWeight: "900",
  },

  printButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 13,

    borderRadius: 11,

    borderWidth: 1,

    borderColor: "#B8DCD6",

    backgroundColor: "#FFFFFF",
  },

  printText: {
    color: colors.teal,

    fontSize: 10,

    fontWeight: "900",
  },

  pdfButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    paddingHorizontal: 14,

    borderRadius: 11,

    backgroundColor: colors.teal,

    elevation: 2,
  },

  pdfText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  /* =====================================================
       PRIMARY BUTTON
    ===================================================== */

  primaryButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    marginTop: 15,

    paddingHorizontal: 20,

    borderRadius: 10,

    backgroundColor: colors.teal,
  },

  primaryButtonText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },
});
