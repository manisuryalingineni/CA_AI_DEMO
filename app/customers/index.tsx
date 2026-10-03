import React, { useCallback, useMemo, useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { loadCustomers } from "../../src/services/customerService";

import type { Customer } from "../../src/types/customer";

import { colors } from "../../src/theme/colors";

/* =========================================================
   HELPERS
========================================================= */

function money(value: number | undefined): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function customerInitial(name: string): string {
  const value = name.trim();

  return value ? value.charAt(0).toUpperCase() : "C";
}

function customerBalanceDue(customer: Customer): number {
  /*
   * Current Customer model exposes openingBalance.
   * If customerService is later updated to return
   * a calculated balanceDue field, this UI will
   * automatically prefer that value.
   */
  const customerWithDue = customer as Customer & {
    balanceDue?: number;
  };

  if (
    typeof customerWithDue.balanceDue === "number" &&
    Number.isFinite(customerWithDue.balanceDue)
  ) {
    return customerWithDue.balanceDue;
  }

  return Number(customer.openingBalance || 0);
}

/* =========================================================
   CUSTOMER CARD
========================================================= */

function CustomerCard({ customer }: { customer: Customer }) {
  const balanceDue = customerBalanceDue(customer);

  return (
    <View style={styles.customerCard}>
      {/* AVATAR */}

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{customerInitial(customer.name)}</Text>
      </View>

      {/* CUSTOMER DETAILS */}

      <View style={styles.customerContent}>
        {/* NAME */}

        <Text style={styles.customerName} numberOfLines={1}>
          {customer.name}
        </Text>

        {/* MOBILE */}

        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={13} color={colors.mutedText} />

          <Text style={styles.detailText} numberOfLines={1}>
            {customer.mobile || "No mobile number"}
          </Text>
        </View>

        {/* GSTIN */}

        <View style={styles.detailRow}>
          <Ionicons
            name="document-text-outline"
            size={13}
            color={colors.mutedText}
          />

          <Text style={styles.detailText} numberOfLines={1}>
            {customer.gstin
              ? `GSTIN: ${customer.gstin}`
              : "GSTIN: Not provided"}
          </Text>
        </View>

        {/* ADDRESS */}

        <View style={[styles.detailRow, styles.addressRow]}>
          <Ionicons
            name="location-outline"
            size={13}
            color={colors.mutedText}
            style={styles.addressIcon}
          />

          <Text
            style={[styles.detailText, styles.addressText]}
            numberOfLines={2}
          >
            {customer.address || "Address not provided"}
          </Text>
        </View>
      </View>

      {/* BALANCE DUE */}

      <View style={styles.balanceArea}>
        <Text style={styles.balanceLabel}>BALANCE DUE</Text>

        <Text
          style={[
            styles.balanceValue,

            balanceDue > 0 && styles.balanceValueDue,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {money(balanceDue)}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function CustomersScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isLarge = width >= 700;

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  /* =======================================================
     LOAD CUSTOMERS
  ======================================================= */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const result = await loadCustomers();

      setCustomers(result);
    } catch (error) {
      Alert.alert(
        "Unable to load customers",

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
     FILTER
  ======================================================= */

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.name,
        customer.mobile,
        customer.gstin,
        customer.state,
        customer.businessDetail,
        customer.address,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [customers, search]);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
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

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Customers</Text>

            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Saved retail customers
            </Text>
          </View>

          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,

            isLarge && styles.contentLarge,

            {
              paddingBottom: 105 + insets.bottom,
            },
          ]}
        >
          {/* =================================================
              TOP ROW
          ================================================= */}

          <View style={styles.topRow}>
            <View style={styles.titleArea}>
              <Text style={styles.pageTitle}>Customer master</Text>

              <Text style={styles.pageSubtitle}>
                View saved customers or create a new customer.
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/customers/add")}
              style={({ pressed }) => [
                styles.addButton,

                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="add" size={17} color="#FFFFFF" />

              <Text style={styles.addButtonText}>Add Customer</Text>
            </Pressable>
          </View>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="people-outline" size={21} color={colors.teal} />
            </View>

            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Total customers</Text>

              <Text style={styles.summaryValue}>{customers.length}</Text>
            </View>
          </View>

          {/* =================================================
              SEARCH
          ================================================= */}

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={17}
              color={colors.mutedText}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, mobile, GSTIN or address"
              placeholderTextColor={colors.mutedText}
              style={styles.searchInput}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {!!search && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={colors.mutedText}
                />
              </Pressable>
            )}
          </View>

          {/* =================================================
              CUSTOMER LIST
          ================================================= */}

          {loading ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="hourglass-outline"
                  size={24}
                  color={colors.teal}
                />
              </View>

              <Text style={styles.emptyTitle}>Loading customers</Text>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={25} color={colors.teal} />
              </View>

              <Text style={styles.emptyTitle}>
                {search ? "No matching customers" : "No customers"}
              </Text>

              <Text style={styles.emptyDescription}>
                {search
                  ? "Try a different search."
                  : "Add your first customer to get started."}
              </Text>

              {!search && (
                <Pressable
                  onPress={() => router.push("/customers/add")}
                  style={styles.emptyAddButton}
                >
                  <Text style={styles.emptyAddText}>+ Add Customer</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.list}>
              {filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* =================================================
            BOTTOM NAVIGATION
        ================================================= */}

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

          {/* MORE */}

          <Pressable
            onPress={() => router.push("/more")}
            style={[styles.navButton, styles.navButtonActive]}
          >
            <Text style={styles.navIcon}>▦</Text>

            <Text style={styles.navActiveText}>More</Text>
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
  safeArea: {
    flex: 1,

    backgroundColor: colors.background,
  },

  screen: {
    flex: 1,

    backgroundColor: colors.background,
  },

  /* =====================================================
       HEADER
    ===================================================== */

  header: {
    minHeight: 76,

    backgroundColor: colors.primary,

    paddingHorizontal: 14,

    paddingVertical: 12,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    elevation: 6,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.15,

    shadowRadius: 4,
  },

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

    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#D6E3EC",

    fontSize: 11,

    marginTop: 3,
  },

  logo: {
    width: 42,

    height: 40,

    flexShrink: 0,

    borderRadius: 13,

    backgroundColor: colors.gold,

    alignItems: "center",

    justifyContent: "center",
  },

  logoText: {
    color: colors.primary,

    fontSize: 14,

    fontWeight: "900",
  },

  /* =====================================================
       CONTENT
    ===================================================== */

  content: {
    width: "100%",

    padding: 14,
  },

  contentLarge: {
    maxWidth: 900,

    alignSelf: "center",

    paddingTop: 22,
  },

  topRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    marginBottom: 12,
  },

  titleArea: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: colors.text,

    fontSize: 18,

    fontWeight: "900",
  },

  pageSubtitle: {
    color: colors.mutedText,

    fontSize: 10,

    lineHeight: 14,

    marginTop: 3,
  },

  addButton: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 12,

    borderRadius: 11,

    backgroundColor: colors.teal,
  },

  addButtonText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /* =====================================================
       SUMMARY
    ===================================================== */

  summaryCard: {
    minHeight: 66,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    backgroundColor: "#EAF7F4",

    borderWidth: 1,

    borderColor: "#D3E8E3",

    borderRadius: 14,

    padding: 11,

    marginBottom: 10,
  },

  summaryIcon: {
    width: 40,

    height: 40,

    borderRadius: 12,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",
  },

  summaryText: {
    flex: 1,
  },

  summaryLabel: {
    color: colors.mutedText,

    fontSize: 9,
  },

  summaryValue: {
    color: colors.text,

    fontSize: 17,

    fontWeight: "900",

    marginTop: 2,
  },

  /* =====================================================
       SEARCH
    ===================================================== */

  searchBox: {
    minHeight: 45,

    flexDirection: "row",

    alignItems: "center",

    gap: 7,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 12,

    paddingHorizontal: 11,

    marginBottom: 11,
  },

  searchInput: {
    flex: 1,

    color: colors.text,

    fontSize: 11,

    paddingVertical: 10,
  },

  /* =====================================================
       LIST
    ===================================================== */

  list: {
    gap: 8,
  },

  customerCard: {
    width: "100%",

    minHeight: 118,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 16,

    paddingHorizontal: 12,

    paddingVertical: 12,

    elevation: 1,

    shadowColor: colors.primary,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.04,

    shadowRadius: 5,
  },

  avatar: {
    width: 43,

    height: 43,

    flexShrink: 0,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E8F6F3",

    alignSelf: "flex-start",

    marginTop: 2,
  },

  avatarText: {
    color: colors.teal,

    fontSize: 17,

    fontWeight: "900",
  },

  customerContent: {
    flex: 1,

    minWidth: 0,

    paddingRight: 4,
  },

  customerName: {
    color: colors.text,

    fontSize: 12.5,

    fontWeight: "900",

    marginBottom: 4,
  },

  detailRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: 3,
  },

  detailText: {
    flex: 1,

    color: colors.mutedText,

    fontSize: 8.5,

    lineHeight: 12,
  },

  addressRow: {
    alignItems: "flex-start",
  },

  addressIcon: {
    marginTop: 1,
  },

  addressText: {
    lineHeight: 12,
  },

  /* =====================================================
       BALANCE DUE
    ===================================================== */

  balanceArea: {
    width: 105,

    minHeight: 72,

    flexShrink: 0,

    alignItems: "flex-end",

    justifyContent: "center",

    paddingLeft: 10,

    borderLeftWidth: 1,

    borderLeftColor: "#E7EEF1",
  },

  balanceLabel: {
    color: colors.mutedText,

    fontSize: 6.8,

    fontWeight: "900",

    letterSpacing: 0.35,

    textAlign: "right",
  },

  balanceValue: {
    width: "100%",

    color: colors.text,

    fontSize: 12,

    fontWeight: "900",

    marginTop: 5,

    textAlign: "right",
  },

  balanceValueDue: {
    color: "#B35C34",
  },

  /* =====================================================
       EMPTY
    ===================================================== */

  emptyCard: {
    minHeight: 220,

    alignItems: "center",

    justifyContent: "center",

    padding: 20,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 16,
  },

  emptyIconBox: {
    width: 50,

    height: 50,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E8F6F3",

    marginBottom: 9,
  },

  emptyTitle: {
    color: colors.text,

    fontSize: 14,

    fontWeight: "900",

    textAlign: "center",
  },

  emptyDescription: {
    color: colors.mutedText,

    fontSize: 9,

    textAlign: "center",

    marginTop: 4,
  },

  emptyAddButton: {
    minHeight: 38,

    marginTop: 12,

    paddingHorizontal: 14,

    borderRadius: 10,

    backgroundColor: colors.teal,

    alignItems: "center",

    justifyContent: "center",
  },

  emptyAddText: {
    color: "#FFFFFF",

    fontSize: 9,

    fontWeight: "900",
  },

  /* =====================================================
       BOTTOM NAVIGATION
    ===================================================== */

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
