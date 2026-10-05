import React from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";

import { StatusBar } from "expo-status-bar";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../src/theme/colors";



/*         =
   TYPES
        = */

type ToolItem = {
  id: string;

  icon: keyof typeof Ionicons.glyphMap;

  title: string;

  description: string;

  route?: string;

  accent?: string;
};

/*         =
   TOOLS
        = */

const tools: ToolItem[] = [
  {
    id: "operations",

    icon: "compass-outline",

    title: "Retail Shop operations",

    description: "Industry-specific end-to-end actions",

    route: "/all-operations",

    accent: "#0A958B",
  },

  {
    id: "customers",

    icon: "people-outline",

    title: "Customers",

    description: "GST, credit terms and receivables",

    route: "/customers",

    accent: "#4568DC",
  },

  {
    id: "vendors",

    icon: "business-outline",

    title: "Vendors",

    description: "Purchases, GST and payables",

    route: "/vendors",

    accent: "#EB8B3C",
  },

  {
    id: "items",

    icon: "pricetag-outline",

    title: "Items & services",

    description: "HSN/SAC, tax, rate and stock",

    route: "/products",

    accent: "#D5A623",
  },

  {
    id: "sales",

    icon: "receipt-outline",

    title: "Sales",

    description: "Quotation through invoice and return",

    route: "/sales",

    accent: "#3B82F6",
  },

  {
    id: "purchases",

    icon: "bag-handle-outline",

    title: "Purchases",

    description: "Request through bill and return",

    route: "/purchases",

    accent: "#37A169",
  },

  {
    id: "money",

    icon: "card-outline",

    title: "Money & cheques",

    description: "Receipts, payments and allocation",

    route: "/payments",

    accent: "#D6A422",
  },

  {
    id: "income",

    icon: "cash-outline",

    title: "Income & expenses",

    description: "Cash and general entries",

    route: "/all-operations",

    accent: "#159F87",
  },

  {
    id: "inventory",

    icon: "cube-outline",

    title: "Inventory",

    description: "Stock, value and item stock status",

    route: "/products",

    accent: "#D9902C",
  },

  {
    id: "bank",

    icon: "business-outline",

    title: "Bank reconciliation",

    description: "CSV, Excel and live-UPI import",

    route: "/all-operations",

    accent: "#5B82A6",
  },

  {
    id: "tax",

    icon: "shield-checkmark-outline",

    title: "Tax & compliance",

    description: "GST, income tax and CA handoff",

    route: "/all-operations",

    accent: "#DD4960",
  },

  {
    id: "gst",

    icon: "calculator-outline",

    title: "GST preparation",

    description: "GSTR-1, 3B and 2B checklist",

    route: "/all-operations",

    accent: "#D16F43",
  },

  {
    id: "income-tax",

    icon: "document-text-outline",

    title: "Business income tax",

    description: "Income ledger and ITR pack",

    route: "/all-operations",

    accent: "#8C75C4",
  },

  {
    id: "payroll",

    icon: "people-circle-outline",

    title: "Payroll",

    description: "Attendance, advances and settlement",

    route: "/all-operations",

    accent: "#E4B14A",
  },
  
{
  id: "vault",
  icon: "folder-outline",
  title: "Document vault",
  description: "Register accounting and tax evidence",
  route: "/more/document-vault",
  accent: "#F0B42D",
},

  {
    id: "approvals",

    icon: "checkmark-circle-outline",

    title: "Owner approvals",

    description: "Approve before CA review",

    route: "/all-operations",

    accent: "#24B47E",
  },

  {
    id: "reports",

    icon: "bar-chart-outline",

    title: "All reports",

    description: "Accounts, tax, books, payroll and P&L",

    route: "/reports",

    accent: "#2F80ED",
  },

  {
    id: "pdf",

    icon: "download-outline",

    title: "PDF Centre",

    description: "Documents and reports ready to share",

    route: "/reports",

    accent: "#607D8B",
  },

  {
    id: "ai",

    icon: "sparkles-outline",

    title: "AI Accountant",

    description: "Review-first entry suggestions",

    route: "/all-operations",

    accent: "#6C88EE",
  },

  {
    id: "settings",

    icon: "settings-outline",

    title: "Business & invoice settings",

    description: "Logo, bank, cheque, terms and numbering",

    route: "/all-operations",

    accent: "#7F8C9A",
  },

  {
    id: "team",

    icon: "people-outline",

    title: "Team & role logins",

    description: "Owner-controlled staff access",

    route: "/all-operations",

    accent: "#E2AD31",
  },

  {
    id: "activity",

    icon: "time-outline",

    title: "Activity audit",

    description: "Who did what and when",

    route: "/activity-audit",

    accent: "#65727D",
  },
];

/* = TOOL CARD  = */

function ToolCard({
  item,
  width,
  compact,
}: {
  item: ToolItem;

  width: `${number}%`;

  compact: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!item.route) {
          return;
        }

        router.push(item.route as any);
      }}
      style={({ pressed }) => [
        styles.toolCard,

        {
          width,
        },

        compact && styles.toolCardCompact,

        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.toolIcon, compact && styles.toolIconCompact]}>
        <Ionicons
          name={item.icon}
          size={compact ? 18 : 20}
          color={item.accent || colors.teal}
        />
      </View>

      <Text
        style={[styles.toolTitle, compact && styles.toolTitleCompact]}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      <Text
        style={[
          styles.toolDescription,

          compact && styles.toolDescriptionCompact,
        ]}
        numberOfLines={2}
      >
        {item.description}
      </Text>

      <View style={styles.openBadge}>
        <Text style={styles.openBadgeText}>OPEN</Text>
      </View>
    </Pressable>
  );
}

/*         =
   SCREEN
        = */

export default function MoreScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isSmall = width < 370;

  const isTablet = width >= 768;

  const isDesktop = width >= 1100;

  const cardWidth: `${number}%` = isDesktop
    ? "23.7%"
    : isTablet
      ? "31.7%"
      : "48.2%";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/*        ====
          HEADER
             ==== */}

      <View
        style={[
          styles.topHeader,

          {
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={[styles.headerInner, isTablet && styles.headerInnerLarge]}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>

          <View style={styles.headerTextArea}>
            <Text style={styles.appTitle} numberOfLines={1}>
              CA AI Business
            </Text>

            <Text style={styles.appSubtitle} numberOfLines={1}>
              Retail Shop
            </Text>
          </View>

          <View style={styles.headerSpacer} />

          <View style={styles.ownerButton}>
            <Ionicons name="person" size={13} color="#CDE3EB" />

            {!isSmall && (
              <Text style={styles.ownerText} numberOfLines={1}>
                Business Owner
              </Text>
            )}
          </View>
        </View>
      </View>

      {/*        ====
          CONTENT
             ==== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,

          {
            paddingBottom: 100 + insets.bottom,
          },
        ]}
      >
        <View style={[styles.main, isTablet && styles.mainLarge]}>
          {/*        
              TITLE
                  */}

          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text
                style={[styles.pageTitle, isSmall && styles.pageTitleSmall]}
              >
                Business Owner tools
              </Text>

              <Text style={styles.pageSubtitle}>
                Business owner • only assigned tools are shown
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/business-selection")}
              style={({ pressed }) => [
                styles.switchButton,

                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.switchButtonText}>Switch Business</Text>
            </Pressable>
          </View>

          {/*        
              BUSINESS INFO
                  */}

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color="#31718A"
            />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Retail Shop -</Text> Business, staff
              and data remain separate for this selected workspace.
            </Text>
          </View>

          {/*        
              TOOL GRID
                  */}

          <View style={styles.toolGrid}>
            {tools.map((item) => (
              <ToolCard
                key={item.id}
                item={item}
                width={cardWidth}
                compact={isSmall}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/*        ====
          BOTTOM NAV
             ==== */}

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
          style={styles.navButton}
        >
          <Text style={styles.navIcon}>⌂</Text>

          <Text style={styles.navText}>Home</Text>
        </Pressable>

        {/* SALES */}
        <Pressable
          onPress={() => router.push("/sales")}
          style={styles.navButton}
        >
          <Text style={styles.navIcon}>🧾</Text>

          <Text style={styles.navText}>Sales</Text>
        </Pressable>

        {/* PURCHASES */}
        <Pressable
          onPress={() => router.push("/purchases")}
          style={styles.navButton}
        >
          <Text style={styles.navIcon}>📥</Text>

          <Text style={styles.navText}>Purchases</Text>
        </Pressable>

        {/* MORE - ACTIVE */}
        <Pressable
          onPress={() => router.push("/more")}
          style={[styles.navButton, styles.navButtonActive]}
        >
          <Text style={[styles.navIcon, styles.navIconActive]}>▦</Text>

          <Text style={styles.navActiveText}>More</Text>
        </Pressable>
      </View>
    </View>
  );
}

/*         =
   STYLES
        = */

const styles = StyleSheet.create({
  /*        ====
       ROOT
           ==== */

  container: {
    flex: 1,

    backgroundColor: "#F2F7F9",
  },

  /*        ====
       HEADER
           ==== */

  topHeader: {
    width: "100%",

    backgroundColor: colors.primary,

    shadowColor: "#001520",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.18,

    shadowRadius: 7,

    elevation: 6,
  },

  headerInner: {
    width: "100%",

    minHeight: 62,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 12,

    gap: 8,

    alignSelf: "center",
  },

  headerInnerLarge: {
    maxWidth: 1050,
  },

  logo: {
    width: 37,

    height: 37,

    flexShrink: 0,

    borderRadius: 11,

    borderWidth: 1,

    backgroundColor: "#E4BE45",

    alignItems: "center",

    justifyContent: "center",
  },

  logoText: {
    color: colors.primary,

    fontSize: 13,

    fontWeight: "900",
  },

  headerTextArea: {
    flexShrink: 1,

    minWidth: 0,
  },

  appTitle: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "900",
  },

  appSubtitle: {
    color: "#CFE0E8",

    fontSize: 8.5,

    marginTop: 1,
  },

  headerSpacer: {
    flex: 1,
  },

  ownerButton: {
    minHeight: 32,

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 9,

    borderRadius: 16,

    backgroundColor: "rgba(255,255,255,0.10)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.20)",
  },

  ownerText: {
    color: "#FFFFFF",

    fontSize: 9,

    fontWeight: "800",
  },

  /*        ====
       CONTENT
           ==== */

  scrollContent: {
    flexGrow: 1,
  },

  main: {
    width: "100%",

    alignSelf: "center",

    paddingHorizontal: 9,

    paddingTop: 14,
  },

  mainLarge: {
    maxWidth: 1050,

    paddingHorizontal: 14,
  },

  /*        ====
       TITLE
           ==== */

  titleRow: {
    flexDirection: "row",

    alignItems: "flex-start",

    justifyContent: "space-between",

    gap: 9,

    marginBottom: 9,
  },

  titleContent: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: "#132434",

    fontSize: 18,

    fontWeight: "900",
  },

  pageTitleSmall: {
    fontSize: 16,
  },

  pageSubtitle: {
    color: "#75838D",

    fontSize: 10,

    lineHeight: 11,

    marginTop: 3,
  },

  switchButton: {
    height: 40,
    width: 120,
    flexShrink: 0,

    paddingHorizontal: 11,

    paddingVertical: 7,

    backgroundColor: "#087E75",

    borderRadius: 10,
  },

  switchButtonText: {
    color: "#E7F5F3",
    display: "flex",
    fontSize: 10,
    alignSelf: "center",
    alignItems: "center",
    marginTop: 5,
    fontWeight: "800",
  },

  /*        ====
       INFO
           ==== */

  infoCard: {
    width: "100%",

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 7,

    backgroundColor: "#E8F5FB",

    borderWidth: 1,

    borderColor: "#C2DFEA",

    borderRadius: 11,

    paddingHorizontal: 10,

    paddingVertical: 8,

    marginBottom: 10,
  },

  infoText: {
    flex: 1,

    color: "#456875",

    fontSize: 11,

    lineHeight: 11,
  },

  infoBold: {
    color: "#275970",

    fontWeight: "900",
  },

  /*        ====
       GRID
           ==== */

  toolGrid: {
    width: "100%",

    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 8,
  },

  /*        ====
       CARD
           ==== */

  toolCard: {
    minHeight: 140,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E0E7EB",

    borderRadius: 15,

    paddingHorizontal: 10,

    paddingVertical: 9,

    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#183746",

    shadowOffset: {
      width: 0,

      height: 3,
    },

    shadowOpacity: 0.055,

    shadowRadius: 7,

    elevation: 2,
  },

  toolCardCompact: {
    minHeight: 108,

    paddingHorizontal: 8,

    paddingVertical: 8,

    borderRadius: 13,
  },

  toolIcon: {
    width: 50,

    height: 50,

    borderRadius: 20,

    backgroundColor: "#ebf8f6",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 7,
  },

  toolIconCompact: {
    width: 32,

    height: 32,

    borderRadius: 10,

    marginBottom: 6,
  },

  toolTitle: {
    width: "100%",

    color: "#172938",

    fontSize: 12,

    lineHeight: 13,

    fontWeight: "900",
    textAlign: "center",
  },

  toolTitleCompact: {
    fontSize: 10,

    lineHeight: 12,
  },

  toolDescription: {
    width: "100%",

    color: "#7B878F",

    fontSize: 9,

    lineHeight: 10,

    marginTop: 3,

    flexGrow: 1,
    textAlign: "center",
  },

  toolDescriptionCompact: {
    fontSize: 8,

    lineHeight: 9,
  },

  openBadge: {
    alignSelf: "center",

    backgroundColor: "#E4F7ED",

    borderRadius: 99,

    paddingHorizontal: 6,

    paddingVertical: 3,

    marginTop: 5,
  },

  openBadgeText: {
    color: "#168F6B",

    fontSize: 9,

    fontWeight: "900",
  },

  cardPressed: {
    opacity: 0.74,

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

  navButtonActive: {
    backgroundColor: "#E5F5F2",
  },

  navIcon: {
    color: colors.mutedText,

    fontSize: 19,

    marginBottom: 2,
  },

  navIconActive: {
    color: colors.teal,
  },

  navActiveText: {
    color: colors.teal,

    fontSize: 9,

    fontWeight: "800",
  },

  navText: {
    color: colors.mutedText,

    fontSize: 9,

    fontWeight: "800",
  },
});
