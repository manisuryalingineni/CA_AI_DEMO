import React, { useCallback, useMemo, useRef, useState } from "react";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

import {
  loadActivityAudit,
  logActivity,
} from "../../src/services/activityAuditService";

import { getBusiness } from "../../src/repositories/businessRepository";

import type { ActivityAudit } from "../../src/types/activityAudit";

import { colors } from "../../src/theme/colors";

/* =========================================================
   FORMATTERS
========================================================= */

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",

    month: "numeric",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",

    second: "2-digit",

    hour12: true,
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   PDF
========================================================= */

async function buildAuditPdfHtml(rows: ActivityAudit[]): Promise<string> {
  const business = await getBusiness();

  const businessName = business?.name || "Business";

  const gstin = business?.gstin || "";

  const body = rows
    .map(
      (activity) => `
          <tr>
            <td>
              ${escapeHtml(formatDateTime(activity.createdAt))}
            </td>

            <td>
              ${escapeHtml(activity.title)}
            </td>

            <td>
              ${escapeHtml(activity.actorRole)}
            </td>

            <td>
              ${escapeHtml(activity.details || "-")}
            </td>
          </tr>
        `,
    )
    .join("");

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
  size: A4 landscape;
  margin: 10mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;

  color: #183044;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  font-size: 9px;
}

.paper {
  width: 100%;
}

.business {
  font-size: 24px;

  font-weight: 900;

  color: #102c43;
}

.meta {
  margin-top: 5px;

  color: #687782;

  font-size: 8px;
}

.rule {
  height: 4px;

  background: #07867d;

  margin: 13px 0;
}

.title {
  font-size: 18px;

  font-weight: 900;

  color: #183044;

  margin-bottom: 5px;
}

.generated {
  color: #687782;

  font-size: 8px;

  margin-bottom: 12px;
}

table {
  width: 100%;

  border-collapse: collapse;

  table-layout: fixed;

  border: 1px solid #d4dfe4;
}

thead {
  background: #eaf6f4;
}

th {
  color: #344d5b;

  font-size: 8px;

  padding: 8px 7px;

  text-align: left;
}

td {
  border-top: 1px solid #dce5e9;

  padding: 8px 7px;

  vertical-align: top;

  overflow-wrap: anywhere;
}

th:nth-child(1),
td:nth-child(1) {
  width: 18%;
}

th:nth-child(2),
td:nth-child(2) {
  width: 25%;
}

th:nth-child(3),
td:nth-child(3) {
  width: 17%;
}

th:nth-child(4),
td:nth-child(4) {
  width: 40%;
}

@media print {
  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
  }
}

</style>

</head>

<body>

<main class="paper">

  <div class="business">
    ${escapeHtml(businessName)}
  </div>

  ${
    gstin
      ? `
        <div class="meta">
          GSTIN:
          ${escapeHtml(gstin)}
        </div>
      `
      : ""
  }

  <div class="rule"></div>

  <div class="title">
    User activity audit
  </div>

  <div class="generated">
    Generated:
    ${escapeHtml(formatDateTime(new Date().toISOString()))}
  </div>

  <table>

    <thead>

      <tr>
        <th>
          DATE / TIME
        </th>

        <th>
          ACTIVITY
        </th>

        <th>
          USER
        </th>

        <th>
          DETAILS
        </th>
      </tr>

    </thead>

    <tbody>
      ${body}
    </tbody>

  </table>

</main>

</body>

</html>
`;
}

/* =========================================================
   ACTIVITY CARD
========================================================= */

function AuditCard({ item }: { item: ActivityAudit }) {
  return (
    <View style={styles.auditCard}>
      <View style={styles.auditIcon}>
        <Ionicons name="time-outline" size={24} color={colors.teal} />
      </View>

      <View style={styles.auditContent}>
        <Text style={styles.auditTitle} numberOfLines={2}>
          {item.title}
          {" • "}
          {item.actorName}
        </Text>

        <Text style={styles.auditMeta} numberOfLines={2}>
          {formatDateTime(item.createdAt)}
          {" • "}
          {item.actorRole}

          {item.details ? ` • ${item.details}` : ""}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function ActivityAuditScreen() {
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();

  const isTablet = width >= 700;

  const [activities, setActivities] = useState<ActivityAudit[]>([]);

  const [loading, setLoading] = useState(true);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [printing, setPrinting] = useState(false);

  const iframe = useRef<HTMLIFrameElement | null>(null);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const rows = await loadActivityAudit();

      setActivities(rows);
    } catch (error) {
      Alert.alert(
        "Unable to load activity audit",

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
     PDF
  ======================================================= */

  const openAuditPdf = async () => {
    try {
      const html = await buildAuditPdfHtml(activities);

      setPreviewHtml(html);
    } catch (error) {
      Alert.alert(
        "Unable to prepare PDF",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const savePdf = async () => {
    if (!previewHtml || printing) {
      return;
    }

    try {
      setPrinting(true);

      if (Platform.OS === "web") {
        iframe.current?.contentWindow?.print();

        return;
      }

      await Print.printAsync({
        html: previewHtml,
      });

      void logActivity({
        module: "PDF",

        action: "PDF_GENERATED",

        title: "PDF GENERATED",

        details: "ACTIVITY AUDIT",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (!/cancel/i.test(message)) {
        Alert.alert(
          "Unable to save PDF",

          message || "Something went wrong.",
        );
      }
    } finally {
      setPrinting(false);
    }
  };

  const title = useMemo(
    () =>
      `${activities.length} recorded ${
        activities.length === 1 ? "activity" : "activities"
      }`,
    [activities.length],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.screen}>
        {/* HEADER */}

        <View style={styles.appHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Activity audit</Text>

            <Text style={styles.headerSubtitle}>Who did what and when</Text>
          </View>

          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>
        </View>

        {/* CONTENT */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,

            isTablet && styles.contentLarge,

            {
              paddingBottom: 105 + insets.bottom,
            },
          ]}
        >
          <View style={styles.pageTop}>
            <View style={styles.pageTitleArea}>
              <Text style={styles.pageTitle}>Activity audit</Text>

              <Text style={styles.pageSubtitle}>
                Recent login, master, transaction and approval actions
              </Text>
            </View>

            <Pressable
              onPress={() => void openAuditPdf()}
              style={styles.pdfButton}
            >
              <Text style={styles.pdfButtonText}>
                Audit
                {"\n"}
                PDF
              </Text>
            </Pressable>
          </View>

          <Text style={styles.countText}>{title}</Text>

          {loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading activity...</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={30} color={colors.teal} />

              <Text style={styles.emptyTitle}>No activity yet</Text>

              <Text style={styles.emptyText}>
                Actions will appear here as the app is used.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {activities.map((item) => (
                <AuditCard key={item.id} item={item} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* BOTTOM NAV */}

        <View
          style={[
            styles.bottomNavigation,

            {
              bottom: Math.max(8, insets.bottom),
            },
          ]}
        >
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>⌂</Text>

            <Text style={styles.navText}>Home</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/sales")}
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>🧾</Text>

            <Text style={styles.navText}>Sales</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/purchases")}
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>📥</Text>

            <Text style={styles.navText}>Purchases</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/more")}
            style={[styles.navButton, styles.navButtonActive]}
          >
            <Text style={styles.navIcon}>▦</Text>

            <Text style={styles.navActiveText}>More</Text>
          </Pressable>
        </View>

        {/* PDF PREVIEW */}

        <Modal
          visible={Boolean(previewHtml)}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setPreviewHtml(null)}
        >
          <View style={styles.pdfScreen}>
            <View
              style={[
                styles.pdfHeader,

                {
                  paddingTop: Math.max(insets.top, 8),
                },
              ]}
            >
              <Pressable
                onPress={() => setPreviewHtml(null)}
                style={styles.pdfBack}
              >
                <Ionicons name="arrow-back" size={19} color={colors.primary} />
              </Pressable>

              <View style={styles.pdfHeaderText}>
                <Text style={styles.pdfTitle}>Activity Audit</Text>

                <Text style={styles.pdfSubtitle}>User activity audit</Text>
              </View>

              <Pressable
                onPress={() => void savePdf()}
                disabled={printing}
                style={[styles.pdfSave, printing && styles.disabled]}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />

                <Text style={styles.pdfSaveText}>
                  {printing ? "Opening..." : "Save PDF"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.pdfPreview}>
              {Platform.OS === "web"
                ? React.createElement("iframe", {
                    ref: iframe,

                    srcDoc: previewHtml || "",

                    title: "Activity audit PDF",

                    style: {
                      width: "100%",

                      height: "100%",

                      border: 0,
                    },
                  })
                : previewHtml && (
                    <WebView
                      source={{
                        html: previewHtml,
                      }}
                      originWhitelist={["*"]}
                      style={styles.webView}
                      javaScriptEnabled={false}
                      domStorageEnabled={false}
                    />
                  )}
            </View>

            <View
              style={[
                styles.pdfBottom,

                {
                  paddingBottom: Math.max(10, insets.bottom),
                },
              ]}
            >
              <Pressable
                onPress={() => setPreviewHtml(null)}
                style={styles.pdfBottomBack}
              >
                <Ionicons name="arrow-back" size={16} color={colors.teal} />

                <Text style={styles.pdfBottomBackText}>Back</Text>
              </Pressable>

              <Pressable
                onPress={() => void savePdf()}
                disabled={printing}
                style={[styles.pdfBottomSave, printing && styles.disabled]}
              >
                <Ionicons name="download-outline" size={17} color="#FFFFFF" />

                <Text style={styles.pdfBottomSaveText}>Save PDF</Text>
              </Pressable>
            </View>
          </View>
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

    backgroundColor: colors.background,
  },

  appHeader: {
    minHeight: 72,

    backgroundColor: colors.primary,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    paddingHorizontal: 14,

    paddingVertical: 10,

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

    fontSize: 17,

    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#D6E3EC",

    fontSize: 9,

    marginTop: 2,
  },

  logo: {
    width: 40,

    height: 38,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.gold,
  },

  logoText: {
    color: colors.primary,

    fontWeight: "900",
  },

  content: {
    width: "100%",

    padding: 14,
  },

  contentLarge: {
    maxWidth: 920,

    alignSelf: "center",

    paddingTop: 22,
  },

  pageTop: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,

    marginBottom: 12,
  },

  pageTitleArea: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: colors.text,

    fontSize: 21,

    fontWeight: "900",
  },

  pageSubtitle: {
    color: colors.mutedText,

    fontSize: 10,

    lineHeight: 14,

    marginTop: 4,
  },

  pdfButton: {
    minWidth: 92,

    minHeight: 72,

    borderRadius: 16,

    backgroundColor: colors.teal,

    alignItems: "center",

    justifyContent: "center",
  },

  pdfButtonText: {
    color: "#FFFFFF",

    fontSize: 17,

    lineHeight: 20,

    fontWeight: "900",

    textAlign: "center",
  },

  countText: {
    color: colors.mutedText,

    fontSize: 9,

    marginBottom: 8,
  },

  list: {
    gap: 8,
  },

  auditCard: {
    minHeight: 84,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 16,

    paddingHorizontal: 11,

    paddingVertical: 11,
  },

  auditIcon: {
    width: 42,

    height: 42,

    flexShrink: 0,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E8F6F3",
  },

  auditContent: {
    flex: 1,

    minWidth: 0,
  },

  auditTitle: {
    color: colors.text,

    fontSize: 11.5,

    fontWeight: "900",

    lineHeight: 16,
  },

  auditMeta: {
    color: colors.mutedText,

    fontSize: 8.5,

    lineHeight: 13,

    marginTop: 3,
  },

  emptyCard: {
    minHeight: 220,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 17,

    padding: 20,
  },

  emptyTitle: {
    color: colors.text,

    fontSize: 13,

    fontWeight: "900",

    marginTop: 8,
  },

  emptyText: {
    color: colors.mutedText,

    fontSize: 9,

    marginTop: 4,

    textAlign: "center",
  },

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

  navButtonActive: {
    backgroundColor: "#E5F5F2",
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

  navActiveText: {
    color: colors.teal,

    fontSize: 9,

    fontWeight: "800",
  },

  pdfScreen: {
    flex: 1,

    backgroundColor: "#EDF4F6",
  },

  pdfHeader: {
    minHeight: 66,

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 10,

    paddingBottom: 8,

    backgroundColor: colors.primary,
  },

  pdfBack: {
    width: 34,

    height: 34,

    borderRadius: 10,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",
  },

  pdfHeaderText: {
    flex: 1,

    minWidth: 0,
  },

  pdfTitle: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "900",
  },

  pdfSubtitle: {
    color: "#D6E5EC",

    fontSize: 8,

    marginTop: 2,
  },

  pdfSave: {
    minHeight: 36,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 10,

    borderRadius: 9,

    backgroundColor: colors.teal,
  },

  pdfSaveText: {
    color: "#FFFFFF",

    fontSize: 9,

    fontWeight: "900",
  },

  pdfPreview: {
    flex: 1,
  },

  webView: {
    flex: 1,

    backgroundColor: "#EDF4F6",
  },

  pdfBottom: {
    minHeight: 60,

    flexDirection: "row",

    justifyContent: "flex-end",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 10,

    paddingTop: 8,

    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,

    borderTopColor: colors.border,
  },

  pdfBottomBack: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 15,

    borderRadius: 11,

    backgroundColor: "#E6F5F2",
  },

  pdfBottomBackText: {
    color: colors.teal,

    fontSize: 10,

    fontWeight: "900",
  },

  pdfBottomSave: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 15,

    borderRadius: 11,

    backgroundColor: colors.teal,
  },

  pdfBottomSaveText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },

  disabled: {
    opacity: 0.5,
  },
});
