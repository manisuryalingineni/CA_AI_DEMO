import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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

import { router, useFocusEffect } from "expo-router";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { Picker } from "@react-native-picker/picker";

import { colors } from "../../src/theme/colors";

import {
  loadOpenPaymentDocuments,
  loadPayments,
  savePayment,
} from "../../src/services/paymentService";

import type {
  OpenPaymentDocument,
  PaymentMode,
  PaymentRecord,
} from "../../src/types/payment";

/* =========================================================
   HELPERS
========================================================= */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function modeLabel(mode: PaymentMode): string {
  switch (mode) {
    case "CASH":
      return "Cash";

    case "UPI":
      return "UPI";

    case "BANK":
      return "Bank";

    case "CARD":
      return "Card";

    case "CHEQUE":
      return "Cheque";

    default:
      return mode;
  }
}

/* =========================================================
   SCREEN
========================================================= */

export default function PaymentsScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isSmall = width < 370;

  const isTablet = width >= 700;

  /* =======================================================
     DATA
  ======================================================= */

  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [openDocuments, setOpenDocuments] = useState<OpenPaymentDocument[]>([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [saving, setSaving] = useState(false);

  /* =======================================================
     FORM
  ======================================================= */

  const [documentKey, setDocumentKey] = useState("");

  const [amount, setAmount] = useState("");

  const [mode, setMode] = useState<PaymentMode>("UPI");

  const [paymentDate, setPaymentDate] = useState(todayIso());

  const [reference, setReference] = useState("");

  const [chequeNumber, setChequeNumber] = useState("");

  const [chequeBank, setChequeBank] = useState("");

  const [chequeDate, setChequeDate] = useState("");

  /* =======================================================
     TOAST
  ======================================================= */

  const [toastVisible, setToastVisible] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showSavedToast = useCallback(() => {
    toastOpacity.stopAnimation();

    toastOpacity.setValue(0);

    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,

        duration: 180,

        useNativeDriver: true,
      }),

      Animated.delay(1700),

      Animated.timing(toastOpacity, {
        toValue: 0,

        duration: 180,

        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  }, [toastOpacity]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);

      const [history, documents] = await Promise.all([
        loadPayments(),

        loadOpenPaymentDocuments(),
      ]);

      setPayments(history);

      setOpenDocuments(documents);
    } catch (error) {
      Alert.alert(
        "Unable to load payments",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );

  /* =======================================================
     SELECTED DOCUMENT
  ======================================================= */

  const selectedDocument = useMemo(() => {
    return openDocuments.find(
      (item) => `${item.documentType}:${item.id}` === documentKey,
    );
  }, [documentKey, openDocuments]);

  useEffect(() => {
    if (!selectedDocument) {
      return;
    }

    setAmount(String(selectedDocument.dueAmount));
  }, [selectedDocument]);

  /* =======================================================
     FORM ACTIONS
  ======================================================= */

  const resetForm = useCallback(() => {
    setDocumentKey("");

    setAmount("");

    setMode("UPI");

    setPaymentDate(todayIso());

    setReference("");

    setChequeNumber("");

    setChequeBank("");

    setChequeDate("");
  }, []);

  const openForm = () => {
    resetForm();

    if (openDocuments.length > 0) {
      const first = openDocuments[0];

      setDocumentKey(`${first.documentType}:${first.id}`);

      setAmount(String(first.dueAmount));
    }

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);

    resetForm();
  };

  /* =======================================================
     SAVE PAYMENT
  ======================================================= */

  const handleSave = async () => {
    if (!selectedDocument) {
      Alert.alert(
        "Open document required",

        "Please select an invoice or purchase bill.",
      );

      return;
    }

    const numericAmount = Number(amount) || 0;

    if (numericAmount <= 0) {
      Alert.alert(
        "Invalid amount",

        "Enter a payment amount greater than zero.",
      );

      return;
    }

    if (numericAmount > selectedDocument.dueAmount) {
      Alert.alert(
        "Amount too high",

        `Outstanding amount is ${formatCurrency(selectedDocument.dueAmount)}.`,
      );

      return;
    }

    try {
      setSaving(true);

      await savePayment({
        documentType: selectedDocument.documentType,

        documentId: selectedDocument.id,

        amount: numericAmount,

        mode,

        paymentDate,

        reference,

        chequeNumber: mode === "CHEQUE" ? chequeNumber : undefined,

        chequeBank: mode === "CHEQUE" ? chequeBank : undefined,

        chequeDate: mode === "CHEQUE" ? chequeDate : undefined,
      });

      await refreshData();

      setShowForm(false);

      resetForm();

      showSavedToast();
    } catch (error) {
      Alert.alert(
        "Unable to save payment",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     FULL SCREEN PAYMENT FORM
  ======================================================= */

  const paymentForm = (
    <Modal
      visible={showForm}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeForm}
    >
      <SafeAreaView style={styles.formScreen} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.formKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* FORM HEADER */}

          <View style={styles.fullFormHeader}>
            <Pressable
              onPress={closeForm}
              disabled={saving}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backIconButton,

                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={isSmall ? 18 : 20}
                color="#173042"
              />
            </Pressable>

            <View style={styles.fullFormHeaderText}>
              <Text
                style={[styles.formTitle, isSmall && styles.formTitleSmall]}
              >
                Record payment
              </Text>

              <Text style={styles.formSubtitle} numberOfLines={1}>
                Allocate receipt or payment to an open document
              </Text>
            </View>
          </View>

          {/* FORM CONTENT */}

          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.formContent,

              isTablet && styles.formContentTablet,

              {
                paddingBottom: 95 + insets.bottom,
              },
            ]}
          >
            {/* PAYMENT DETAILS */}

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Payment details</Text>

              {/* OPEN DOCUMENT */}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>OPEN DOCUMENT</Text>

                <View style={styles.pickerField}>
                  <Picker
                    selectedValue={documentKey}
                    onValueChange={(value: string) => setDocumentKey(value)}
                    enabled={!saving}
                    style={styles.picker}
                  >
                    {openDocuments.length === 0 ? (
                      <Picker.Item label="No open invoices or bills" value="" />
                    ) : (
                      openDocuments.map((item) => (
                        <Picker.Item
                          key={`${item.documentType}:${item.id}`}
                          value={`${item.documentType}:${item.id}`}
                          label={`${item.documentNumber} • ${item.partyName} • ${formatCurrency(
                            item.dueAmount,
                          )}`}
                        />
                      ))
                    )}
                  </Picker>
                </View>

                {selectedDocument && (
                  <View style={styles.outstandingRow}>
                    <Text style={styles.outstandingLabel}>Outstanding</Text>

                    <Text style={styles.outstandingAmount}>
                      {formatCurrency(selectedDocument.dueAmount)}
                    </Text>
                  </View>
                )}
              </View>

              {/* AMOUNT */}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>AMOUNT</Text>

                <View style={styles.amountInputWrapper}>
                  <Text style={styles.rupeePrefix}>₹</Text>

                  <TextInput
                    value={amount}
                    onChangeText={(value) =>
                      setAmount(value.replace(/[^0-9.]/g, ""))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#99A3AA"
                    style={styles.amountInput}
                  />
                </View>
              </View>

              {/* MODE */}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>MODE</Text>

                <View style={styles.modeGrid}>
                  {(
                    ["CASH", "UPI", "BANK", "CARD", "CHEQUE"] as PaymentMode[]
                  ).map((item) => {
                    const active = item === mode;

                    return (
                      <Pressable
                        key={item}
                        onPress={() => setMode(item)}
                        style={({ pressed }) => [
                          styles.modeButton,

                          active && styles.modeButtonActive,

                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modeText,

                            active && styles.modeTextActive,
                          ]}
                        >
                          {modeLabel(item)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* PAYMENT DATE */}

              <View style={styles.fieldBlockLast}>
                <Text style={styles.label}>PAYMENT DATE</Text>

                <View style={styles.dateField}>
                  <TextInput
                    value={paymentDate}
                    onChangeText={setPaymentDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#99A3AA"
                    style={styles.dateInput}
                  />

                  <Ionicons name="calendar-outline" size={16} color="#60727E" />
                </View>
              </View>
            </View>

            {/* REFERENCE */}

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Reference</Text>

              <View style={styles.fieldBlockLast}>
                <Text style={styles.label}>UTR / RECEIPT REFERENCE</Text>

                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Enter UTR or receipt number"
                  placeholderTextColor="#99A3AA"
                  style={styles.input}
                />
              </View>
            </View>

            {/* CHEQUE DETAILS */}

            {mode === "CHEQUE" && (
              <View style={styles.formCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={15}
                      color={colors.teal}
                    />
                  </View>

                  <Text style={styles.sectionTitleNoMargin}>
                    Cheque details
                  </Text>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>CHEQUE NUMBER</Text>

                  <TextInput
                    value={chequeNumber}
                    onChangeText={(value) =>
                      setChequeNumber(value.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Six-digit cheque number"
                    placeholderTextColor="#99A3AA"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>BANK AND BRANCH</Text>

                  <TextInput
                    value={chequeBank}
                    onChangeText={setChequeBank}
                    placeholder="Bank / branch"
                    placeholderTextColor="#99A3AA"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldBlockLast}>
                  <Text style={styles.label}>CHEQUE DATE</Text>

                  <View style={styles.dateField}>
                    <TextInput
                      value={chequeDate}
                      onChangeText={setChequeDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#99A3AA"
                      style={styles.dateInput}
                    />

                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#60727E"
                    />
                  </View>
                </View>

                <View style={styles.chequeInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color="#2C7187"
                  />

                  <Text style={styles.chequeInfoText}>
                    Cheque number, bank/branch and cheque date will be stored
                    with this payment.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* FORM BOTTOM ACTIONS */}

          <View
            style={[
              styles.formBottomBar,

              {
                paddingBottom: Math.max(8, insets.bottom),
              },
            ]}
          >
            <Pressable
              onPress={closeForm}
              disabled={saving}
              style={({ pressed }) => [
                styles.cancelButton,

                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving || !selectedDocument}
              style={({ pressed }) => [
                styles.saveButton,

                (saving || !selectedDocument) && styles.disabledButton,

                pressed && !saving && styles.pressed,
              ]}
            >
              <Ionicons
                name={saving ? "hourglass-outline" : "checkmark"}
                size={15}
                color="#FFFFFF"
              />

              <Text style={styles.saveText}>
                {saving ? "Saving..." : "Save payment"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  /* =======================================================
     MAIN PAGE
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* =================================================
            MAIN HEADER
        ================================================= */}

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

          {/* APP NAME */}

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
              <Ionicons name="person" size={11} color="#D4E6ED" />

              <Text style={styles.ownerPillText}>Business Owner</Text>
            </View>
          )}
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
              paddingBottom: 96 + insets.bottom,
            },
          ]}
        >
          {/* TITLE */}

          <View style={styles.titleRow}>
            <View style={styles.titleArea}>
              <Text
                style={[styles.pageTitle, isSmall && styles.pageTitleSmall]}
              >
                Receipts & payments
              </Text>

              <Text style={styles.pageSubtitle}>
                Cash, UPI, bank, card or cheque
              </Text>
            </View>

            <Pressable
              onPress={openForm}
              style={({ pressed }) => [
                styles.recordButton,

                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />

              <Text style={styles.recordText}>Record</Text>
            </Pressable>
          </View>

          {/* =================================================
              PAYMENT LIST
          ================================================= */}

          {loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading payments...</Text>
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="card-outline" size={23} color={colors.teal} />
              </View>

              <Text style={styles.emptyTitle}>No payments</Text>

              <Text style={styles.emptyText}>
                Record a receipt or vendor payment.
              </Text>

              <Pressable
                onPress={openForm}
                style={({ pressed }) => [
                  styles.emptyRecordButton,

                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />

                <Text style={styles.emptyRecordText}>Record payment</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.paymentList}>
              {payments.map((payment) => {
                const isReceipt = payment.direction === "RECEIPT";

                return (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View
                      style={[
                        styles.paymentIconBox,

                        !isReceipt && styles.paymentIconBoxOutgoing,
                      ]}
                    >
                      <Ionicons
                        name={isReceipt ? "download-outline" : "push-outline"}
                        size={17}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={styles.paymentMain}>
                      <Text style={styles.partyName} numberOfLines={1}>
                        {payment.partyName}
                      </Text>

                      <Text style={styles.paymentMeta} numberOfLines={1}>
                        {displayDate(payment.paymentDate)}

                        {" • "}

                        {modeLabel(payment.mode)}

                        {" • "}

                        {payment.documentNumber}
                      </Text>

                      {!!payment.reference && (
                        <Text style={styles.referenceText} numberOfLines={1}>
                          {payment.reference}
                        </Text>
                      )}
                    </View>

                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(payment.amount)}
                      </Text>

                      <View
                        style={[
                          styles.directionBadge,

                          isReceipt ? styles.receiptBadge : styles.paymentBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.directionText,

                            isReceipt ? styles.receiptText : styles.paymentText,
                          ]}
                        >
                          {isReceipt ? "RECEIPT" : "PAYMENT"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
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
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>▦</Text>

            <Text style={styles.navText}>More</Text>
          </Pressable>
        </View>

        {/* PAYMENT FORM */}

        {paymentForm}

        {/* =================================================
            SUCCESS TOAST
        ================================================= */}

        {toastVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,

              {
                opacity: toastOpacity,

                transform: [
                  {
                    translateY: toastOpacity.interpolate({
                      inputRange: [0, 1],

                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.toastIcon}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>

            <View style={styles.toastContent}>
              <Text style={styles.toastTitle}>Payment saved</Text>

              <Text style={styles.toastSubtitle}>
                Balance updated successfully
              </Text>
            </View>
          </Animated.View>
        )}
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

  /* =====================================================
       MAIN HEADER
    ===================================================== */

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

  /* MAIN PAGE BACK BUTTON */

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

    fontSize: 13,

    fontWeight: "900",
  },

  appSubtitle: {
    color: "#D5E6EE",

    fontSize: 8,

    marginTop: 1,
  },

  headerSpacer: {
    flex: 1,
  },

  ownerPill: {
    minHeight: 29,

    flexShrink: 0,

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 7,

    borderRadius: 15,

    backgroundColor: "rgba(255,255,255,0.10)",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.16)",
  },

  ownerPillText: {
    color: "#FFFFFF",

    fontSize: 7.5,

    fontWeight: "800",
  },

  /* =====================================================
       MAIN CONTENT
    ===================================================== */

  content: {
    width: "100%",

    alignSelf: "center",

    paddingHorizontal: 10,

    paddingTop: 14,
  },

  contentTablet: {
    maxWidth: 850,

    paddingHorizontal: 16,
  },

  titleRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginBottom: 10,
  },

  titleArea: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: "#142638",

    fontSize: 18,

    fontWeight: "900",
  },

  pageTitleSmall: {
    fontSize: 16,
  },

  pageSubtitle: {
    color: "#78858D",

    fontSize: 8.5,

    lineHeight: 12,

    marginTop: 2,
  },

  recordButton: {
    minHeight: 38,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 3,

    paddingHorizontal: 11,

    borderRadius: 11,

    backgroundColor: "#0A958B",
  },

  recordText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "900",
  },

  pressed: {
    opacity: 0.76,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  /* =====================================================
       EMPTY STATE
    ===================================================== */

  emptyCard: {
    minHeight: 235,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DDE5E8",

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 18,

    paddingVertical: 20,
  },

  emptyIconBox: {
    width: 48,

    height: 48,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 14,

    backgroundColor: "#ECF8F6",
  },

  emptyTitle: {
    color: "#142638",

    fontSize: 15,

    fontWeight: "900",

    marginTop: 11,
  },

  emptyText: {
    color: "#7A878E",

    fontSize: 9,

    marginTop: 3,

    textAlign: "center",
  },

  emptyRecordButton: {
    minHeight: 36,

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    marginTop: 13,

    paddingHorizontal: 12,

    borderRadius: 10,

    backgroundColor: "#0A958B",
  },

  emptyRecordText: {
    color: "#FFFFFF",

    fontSize: 9,

    fontWeight: "900",
  },

  /* =====================================================
       PAYMENT CARDS
    ===================================================== */

  paymentList: {
    gap: 7,
  },

  paymentCard: {
    minHeight: 78,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DEE6E9",

    borderRadius: 13,

    paddingHorizontal: 10,

    paddingVertical: 8,

    shadowColor: "#173541",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 4,

    elevation: 1,
  },

  paymentIconBox: {
    width: 35,

    height: 35,

    borderRadius: 11,

    backgroundColor: "#5BAE9C",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 8,
  },

  paymentIconBoxOutgoing: {
    backgroundColor: "#7F99AD",
  },

  paymentMain: {
    flex: 1,

    minWidth: 0,
  },

  partyName: {
    color: "#142638",

    fontSize: 11,

    fontWeight: "900",
  },

  paymentMeta: {
    color: "#6F7D85",

    fontSize: 7.5,

    marginTop: 3,
  },

  referenceText: {
    color: "#89949A",

    fontSize: 7,

    marginTop: 2,
  },

  paymentRight: {
    flexShrink: 0,

    alignItems: "flex-end",

    marginLeft: 7,
  },

  paymentAmount: {
    color: "#142638",

    fontSize: 11,

    fontWeight: "900",
  },

  directionBadge: {
    borderRadius: 99,

    paddingHorizontal: 5,

    paddingVertical: 2,

    marginTop: 3,
  },

  receiptBadge: {
    backgroundColor: "#E7F6EE",
  },

  paymentBadge: {
    backgroundColor: "#EEF2F5",
  },

  directionText: {
    fontSize: 5.8,

    fontWeight: "900",
  },

  receiptText: {
    color: "#21845F",
  },

  paymentText: {
    color: "#667A88",
  },

  /* =====================================================
       FULL SCREEN FORM
    ===================================================== */

  formScreen: {
    flex: 1,

    backgroundColor: "#F3F7F9",
  },

  formKeyboard: {
    flex: 1,
  },

  fullFormHeader: {
    minHeight: 58,

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingHorizontal: 10,

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,

    borderBottomColor: "#DEE6E9",

    elevation: 3,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 3,
  },

  backIconButton: {
    width: 34,

    height: 34,

    borderRadius: 10,

    backgroundColor: "#EFF4F6",

    alignItems: "center",

    justifyContent: "center",
  },

  fullFormHeaderText: {
    flex: 1,

    minWidth: 0,
  },

  formTitle: {
    color: "#152636",

    fontSize: 17,

    fontWeight: "900",
  },

  formTitleSmall: {
    fontSize: 15,
  },

  formSubtitle: {
    color: "#7C8991",

    fontSize: 8,

    marginTop: 1,
  },

  formScroll: {
    flex: 1,
  },

  formContent: {
    width: "100%",

    alignSelf: "center",

    paddingHorizontal: 10,

    paddingTop: 10,
  },

  formContentTablet: {
    maxWidth: 720,

    paddingHorizontal: 16,
  },

  formCard: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#DCE5E9",

    borderRadius: 14,

    padding: 11,

    marginBottom: 9,
  },

  sectionTitle: {
    color: "#173042",

    fontSize: 11,

    fontWeight: "900",

    marginBottom: 10,
  },

  sectionHeaderRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginBottom: 10,
  },

  sectionIcon: {
    width: 27,

    height: 27,

    borderRadius: 8,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#EAF7F5",
  },

  sectionTitleNoMargin: {
    color: "#173042",

    fontSize: 11,

    fontWeight: "900",
  },

  fieldBlock: {
    marginBottom: 10,
  },

  fieldBlockLast: {
    marginBottom: 0,
  },

  label: {
    color: "#536773",

    fontSize: 7.5,

    fontWeight: "900",

    marginBottom: 4,

    letterSpacing: 0.25,
  },

  input: {
    minHeight: 41,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D0DBE1",

    borderRadius: 10,

    paddingHorizontal: 11,

    color: "#203240",

    fontSize: 11,
  },

  pickerField: {
    minHeight: 42,

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D0DBE1",

    borderRadius: 10,

    overflow: "hidden",
  },

  picker: {
    minHeight: 42,

    color: "#203240",

    fontSize: 11,
  },

  outstandingRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 3,

    marginTop: 5,
  },

  outstandingLabel: {
    color: "#75838B",

    fontSize: 7.5,
  },

  outstandingAmount: {
    color: "#9C6218",

    fontSize: 9,

    fontWeight: "900",
  },

  amountInputWrapper: {
    minHeight: 44,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#C9D8DE",

    borderRadius: 10,

    paddingHorizontal: 11,
  },

  rupeePrefix: {
    color: "#334B59",

    fontSize: 15,

    fontWeight: "900",

    marginRight: 5,
  },

  amountInput: {
    flex: 1,

    minHeight: 42,

    color: "#132B3A",

    fontSize: 14,

    fontWeight: "800",

    paddingVertical: 0,
  },

  modeGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 5,
  },

  modeButton: {
    minWidth: 58,

    minHeight: 34,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 9,

    borderRadius: 9,

    backgroundColor: "#F1F5F6",

    borderWidth: 1,

    borderColor: "#DBE4E7",
  },

  modeButtonActive: {
    backgroundColor: "#E4F5F2",

    borderColor: "#86CCC2",
  },

  modeText: {
    color: "#69777F",

    fontSize: 8,

    fontWeight: "800",
  },

  modeTextActive: {
    color: "#087E75",

    fontWeight: "900",
  },

  dateField: {
    minHeight: 41,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D0DBE1",

    borderRadius: 10,

    paddingHorizontal: 11,
  },

  dateInput: {
    flex: 1,

    minHeight: 39,

    color: "#203240",

    fontSize: 11,

    paddingVertical: 0,
  },

  chequeInfo: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 6,

    padding: 8,

    backgroundColor: "#EAF7FC",

    borderWidth: 1,

    borderColor: "#C4E0E9",

    borderRadius: 9,

    marginTop: 9,
  },

  chequeInfoText: {
    flex: 1,

    color: "#3D6D7E",

    fontSize: 7.5,

    lineHeight: 11,
  },

  /* =====================================================
       FORM BOTTOM BAR
    ===================================================== */

  formBottomBar: {
    minHeight: 60,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "flex-end",

    gap: 7,

    paddingHorizontal: 10,

    paddingTop: 7,

    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,

    borderTopColor: "#DDE5E9",

    elevation: 8,

    shadowColor: "#173541",

    shadowOffset: {
      width: 0,
      height: -2,
    },

    shadowOpacity: 0.07,

    shadowRadius: 6,
  },

  cancelButton: {
    minHeight: 39,

    paddingHorizontal: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#E9F6F4",

    borderRadius: 10,
  },

  cancelText: {
    color: "#087C73",

    fontSize: 9.5,

    fontWeight: "900",
  },

  saveButton: {
    minHeight: 39,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 15,

    backgroundColor: "#0A958B",

    borderRadius: 10,
  },

  saveText: {
    color: "#FFFFFF",

    fontSize: 9.5,

    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.45,
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

    minHeight: 44,

    borderRadius: 13,

    alignItems: "center",

    justifyContent: "center",
  },

  navIcon: {
    color: colors.mutedText,

    fontSize: 17,

    marginBottom: 1,
  },

  navText: {
    color: colors.mutedText,

    fontSize: 8,

    fontWeight: "800",
  },

  /* =====================================================
       TOAST
    ===================================================== */

  toast: {
    position: "absolute",

    left: 12,

    right: 12,

    bottom: 77,

    minHeight: 50,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D4E7E3",

    borderRadius: 12,

    paddingHorizontal: 9,

    shadowColor: "#143631",

    shadowOffset: {
      width: 0,

      height: 4,
    },

    shadowOpacity: 0.14,

    shadowRadius: 10,

    elevation: 12,

    zIndex: 999,
  },

  toastIcon: {
    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: "#0A958B",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 8,
  },

  toastContent: {
    flex: 1,
  },

  toastTitle: {
    color: "#173A35",

    fontSize: 9.5,

    fontWeight: "900",
  },

  toastSubtitle: {
    color: "#75827F",

    fontSize: 7,

    marginTop: 1,
  },
});
