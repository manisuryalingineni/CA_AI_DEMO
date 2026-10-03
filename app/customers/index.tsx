import React, { useEffect, useRef, useState } from "react";

import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import { Picker } from "@react-native-picker/picker";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { saveCustomer, editCustomer } from "../../src/services/customerService";

import { getCustomerById } from "../../src/repositories/customerRepository";

import type { CreateCustomerInput, Customer } from "../../src/types/customer";

import { colors } from "../../src/theme/colors";

/* =========================================================
   STATES
========================================================= */

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/* =========================================================
   CUSTOMER FORM
========================================================= */

interface CustomerFormProps {
  customer?: Customer | null;

  onClose: () => void;

  onSaved: () => void;
}

function CustomerForm({ customer, onClose, onSaved }: CustomerFormProps) {
  const { width } = useWindowDimensions();

  const isEditMode = Boolean(customer);

  const isLargeForm = width >= 700;

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [name, setName] = useState("");

  const [mobile, setMobile] = useState("");

  const [gstin, setGstin] = useState("");

  const [state, setState] = useState("Andhra Pradesh");

  const [creditDays, setCreditDays] = useState("0");

  const [openingBalance, setOpeningBalance] = useState("0");

  const [businessDetail, setBusinessDetail] = useState("");

  const [address, setAddress] = useState("");

  const [saving, setSaving] = useState(false);

  /* =======================================================
     TOAST
  ======================================================= */

  const [toastVisible, setToastVisible] = useState(false);

  const [toastTitle, setToastTitle] = useState("Customer saved");

  const [toastMessage, setToastMessage] = useState(
    "Customer saved successfully",
  );

  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showSuccessToast = (title: string, message: string) => {
    setToastTitle(title);

    setToastMessage(message);

    toastOpacity.stopAnimation();

    toastOpacity.setValue(0);

    setToastVisible(true);

    Animated.timing(toastOpacity, {
      toValue: 1,

      duration: 180,

      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,

        duration: 180,

        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 1000);
  };

  /* =======================================================
     LOAD / RESET FORM
  ======================================================= */

  useEffect(() => {
    if (customer) {
      setName(customer.name ?? "");

      setMobile(customer.mobile ?? "");

      setGstin(customer.gstin ?? "");

      setState(customer.state || "Andhra Pradesh");

      setCreditDays(String(customer.creditDays ?? 0));

      setOpeningBalance(String(customer.openingBalance ?? 0));

      setBusinessDetail(customer.businessDetail ?? "");

      setAddress(customer.address ?? "");

      return;
    }

    setName("");

    setMobile("");

    setGstin("");

    setState("Andhra Pradesh");

    setCreditDays("0");

    setOpeningBalance("0");

    setBusinessDetail("");

    setAddress("");
  }, [customer]);

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    if (saving) {
      return;
    }

    onClose();
  };

  /* =======================================================
     SAVE CUSTOMER
  ======================================================= */

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const customerName = name.trim();

    const customerMobile = mobile.trim();

    /* ===================================================
         NAME
      =================================================== */

    if (!customerName) {
      Alert.alert(
        "Required",

        "Please enter customer name.",
      );

      return;
    }

    /* ===================================================
         MOBILE
      =================================================== */

    if (!customerMobile) {
      Alert.alert(
        "Required",

        "Please enter mobile number.",
      );

      return;
    }

    if (!/^\d{10}$/.test(customerMobile)) {
      Alert.alert(
        "Invalid mobile number",

        "Please enter a valid 10-digit mobile number.",
      );

      return;
    }

    /* ===================================================
         GSTIN
      =================================================== */

    const cleanedGstin = gstin.trim().toUpperCase();

    if (cleanedGstin && cleanedGstin.length !== 15) {
      Alert.alert(
        "Invalid GSTIN",

        "GSTIN must contain 15 characters.",
      );

      return;
    }

    /* ===================================================
         NUMERIC VALUES
      =================================================== */

    const parsedCreditDays = Number(creditDays) || 0;

    const parsedOpeningBalance = Number(openingBalance) || 0;

    if (parsedCreditDays < 0) {
      Alert.alert(
        "Invalid credit days",

        "Credit days cannot be negative.",
      );

      return;
    }

    if (parsedOpeningBalance < 0) {
      Alert.alert(
        "Invalid opening balance",

        "Opening balance cannot be negative.",
      );

      return;
    }

    try {
      setSaving(true);

      /* =================================================
           UPDATE CUSTOMER
        ================================================= */

      if (customer) {
        await editCustomer({
          ...customer,

          name: customerName,

          mobile: customerMobile,

          gstin: cleanedGstin || undefined,

          state,

          creditDays: parsedCreditDays,

          openingBalance: parsedOpeningBalance,

          businessDetail: businessDetail.trim() || undefined,

          address: address.trim() || undefined,
        });

        showSuccessToast(
          "Customer updated",

          "Customer updated successfully",
        );
      } else {

      /* =================================================
           CREATE CUSTOMER
        ================================================= */
        const input: CreateCustomerInput = {
          name: customerName,

          mobile: customerMobile,

          gstin: cleanedGstin || undefined,

          state,

          creditDays: parsedCreditDays,

          openingBalance: parsedOpeningBalance,

          businessDetail: businessDetail.trim() || undefined,

          address: address.trim() || undefined,
        };

        await saveCustomer(input);

        showSuccessToast(
          "Customer saved",

          "Customer saved successfully",
        );
      }

      /*
       * Keep screen visible briefly so
       * user can see success toast.
       */

      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (error) {
      Alert.alert(
        isEditMode ? "Unable to update" : "Unable to save",

        error instanceof Error ? error.message : "Something went wrong.",
      );

      setSaving(false);
    }
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.formSafeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.formKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.formScreen}>
          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.formHeader}>
            <View style={styles.formHeaderLeft}>
              {/* BACK BUTTON */}

              <Pressable
                onPress={handleClose}
                disabled={saving}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [
                  styles.formBackButton,

                  pressed && !saving && styles.formBackButtonPressed,

                  saving && styles.formBackButtonDisabled,
                ]}
              >
                <Ionicons name="arrow-back" size={19} color={colors.primary} />
              </Pressable>

              {/* TITLE */}

              <View style={styles.formHeaderText}>
                <Text style={styles.formHeaderTitle} numberOfLines={1}>
                  {isEditMode ? "Edit Customer" : "Add Customer"}
                </Text>

                <Text style={styles.formHeaderSubtitle} numberOfLines={1}>
                  {isEditMode
                    ? "Update retail customer details"
                    : "Create a new retail customer"}
                </Text>
              </View>
            </View>

            {/* LOGO */}

            <View style={styles.formLogo}>
              <Text style={styles.formLogoText}>CA</Text>
            </View>
          </View>

          {/* =================================================
              FORM
          ================================================= */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.formScroll,

              isLargeForm && styles.formScrollLarge,
            ]}
          >
            <View
              style={[styles.formCard, isLargeForm && styles.formCardLarge]}
            >
              <Text style={styles.formTitle}>Customer Information</Text>

              <Text style={styles.formDescription}>
                Enter the customer&apos;s basic and account details.
              </Text>

              {/* =================================================
                  NAME / MOBILE
              ================================================= */}

              <View style={[styles.formRow, !isLargeForm && styles.formColumn]}>
                <View style={styles.formField}>
                  <Text style={styles.label}>
                    Customer Name <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter customer name"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                    autoCapitalize="words"
                    editable={!saving}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>
                    Mobile Number <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    value={mobile}
                    onChangeText={(value) =>
                      setMobile(value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={styles.input}
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    importantForAutofill="yes"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* =================================================
                  GST / STATE
              ================================================= */}

              <View style={[styles.formRow, !isLargeForm && styles.formColumn]}>
                <View style={styles.formField}>
                  <Text style={styles.label}>GSTIN</Text>

                  <TextInput
                    value={gstin}
                    onChangeText={(value) =>
                      setGstin(
                        value.toUpperCase().replace(/\s/g, "").slice(0, 15),
                      )
                    }
                    placeholder="Optional GSTIN"
                    placeholderTextColor={colors.mutedText}
                    autoCapitalize="characters"
                    style={styles.input}
                    maxLength={15}
                    editable={!saving}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>State</Text>

                  <View style={styles.stateField}>
                    <Text style={styles.stateValue} numberOfLines={1}>
                      {state || "Select state"}
                    </Text>

                    <View style={styles.stateArrow} pointerEvents="none">
                      <Ionicons
                        name="chevron-down"
                        size={15}
                        color={colors.mutedText}
                      />
                    </View>

                    <View style={styles.hiddenPickerContainer}>
                      <Picker
                        selectedValue={state}
                        onValueChange={(value: string) => setState(value)}
                        style={styles.hiddenPicker}
                        enabled={!saving}
                      >
                        {STATES.map((item) => (
                          <Picker.Item key={item} label={item} value={item} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              {/* =================================================
                  CREDIT DAYS / OPENING BALANCE
              ================================================= */}

              <View style={[styles.formRow, !isLargeForm && styles.formColumn]}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Credit Days</Text>

                  <TextInput
                    value={creditDays}
                    onChangeText={(value) =>
                      setCreditDays(value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numeric"
                    style={styles.input}
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    editable={!saving}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Opening Balance</Text>

                  <TextInput
                    value={openingBalance}
                    onChangeText={(value) => {
                      const cleaned = value.replace(/[^0-9.]/g, "");

                      const parts = cleaned.split(".");

                      if (parts.length > 2) {
                        return;
                      }

                      setOpeningBalance(cleaned);
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* =================================================
                  CUSTOMER CATEGORY
              ================================================= */}

              <View style={styles.fullField}>
                <Text style={styles.label}>Customer Category / Loyalty ID</Text>

                <TextInput
                  value={businessDetail}
                  onChangeText={setBusinessDetail}
                  placeholder="Example: Retail customer"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                  editable={!saving}
                />
              </View>

              {/* =================================================
                  ADDRESS
              ================================================= */}

              <View style={styles.fullField}>
                <Text style={styles.label}>Address</Text>

                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Customer address"
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.input, styles.addressInput]}
                  editable={!saving}
                />
              </View>
            </View>

            {/* =================================================
                ACTION BUTTONS
            ================================================= */}

            <View
              style={[
                styles.formActions,

                isLargeForm && styles.formActionsLarge,
              ]}
            >
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.cancelButton,

                  pressed && !saving && styles.buttonPressed,
                ]}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,

                  saving && styles.disabledButton,

                  pressed && !saving && styles.buttonPressed,
                ]}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? "Saving..."
                    : isEditMode
                      ? "Update Customer"
                      : "Save Customer"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* =================================================
              SUCCESS TOAST
          ================================================= */}

          {toastVisible && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toastContainer,

                {
                  opacity: toastOpacity,

                  transform: [
                    {
                      translateY: toastOpacity.interpolate({
                        inputRange: [0, 1],

                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.toast}>
                <View style={styles.toastIcon}>
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                </View>

                <View style={styles.toastTextContainer}>
                  <Text style={styles.toastTitle}>{toastTitle}</Text>

                  <Text style={styles.toastMessage}>{toastMessage}</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   CUSTOMER ROUTE
   app/customers/index.tsx
========================================================= */

export default function CustomersScreen() {
  const { customerId } = useLocalSearchParams<{
    customerId?: string;
  }>();

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [loading, setLoading] = useState(Boolean(customerId));

  useEffect(() => {
    let mounted = true;

    const loadCustomer = async () => {
      /*
       * Normal new customer:
       * /customers
       */

      if (!customerId) {
        if (mounted) {
          setCustomer(null);

          setLoading(false);
        }

        return;
      }

      /*
       * Edit existing customer:
       * /customers?customerId=xxx
       */

      try {
        const result = await getCustomerById(customerId);

        if (mounted) {
          setCustomer(result);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert(
            "Unable to load customer",

            error instanceof Error ? error.message : "Something went wrong.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.formSafeArea} edges={["top", "bottom"]}>
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Loading customer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (customerId && !customer) {
    return (
      <SafeAreaView style={styles.formSafeArea} edges={["top", "bottom"]}>
        <View style={styles.notFoundScreen}>
          <Text style={styles.formTitle}>Customer not found</Text>

          <Text style={styles.formDescription}>
            This customer could not be loaded.
          </Text>

          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={[styles.saveButton, styles.notFoundButton]}
          >
            <Text style={styles.saveButtonText}>Back to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <CustomerForm
      customer={customer}
      onClose={() => {
        router.replace("/dashboard");
      }}
      onSaved={() => {
        router.replace("/dashboard");
      }}
    />
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
       ROOT
    ===================================================== */

  formSafeArea: {
    flex: 1,

    backgroundColor: colors.background,
  },

  formKeyboard: {
    flex: 1,

    width: "100%",
  },

  formScreen: {
    flex: 1,

    width: "100%",

    backgroundColor: colors.background,
  },

  /* =====================================================
       HEADER
    ===================================================== */

  formHeader: {
    minHeight: 76,

    backgroundColor: colors.primary,

    paddingHorizontal: 18,

    paddingVertical: 12,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    elevation: 6,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.15,

    shadowRadius: 4,
  },

  formHeaderLeft: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    minWidth: 0,
  },

  /* =====================================================
       CONSISTENT BACK BUTTON
    ===================================================== */

  formBackButton: {
    width: 34,

    height: 34,

    flexShrink: 0,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D9E3E7",

    marginRight: 10,

    elevation: 4,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,

      height: 1,
    },

    shadowOpacity: 0.15,

    shadowRadius: 3,
  },

  formBackButtonPressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  formBackButtonDisabled: {
    opacity: 0.5,
  },

  formHeaderText: {
    flex: 1,

    minWidth: 0,
  },

  formHeaderTitle: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "800",
  },

  formHeaderSubtitle: {
    color: "#D6E3EC",

    fontSize: 11,

    marginTop: 3,

    marginBottom: 2,
  },

  formLogo: {
    width: 42,

    height: 40,

    flexShrink: 0,

    borderRadius: 13,

    backgroundColor: colors.gold,

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 10,

    marginTop: 3,
  },

  formLogoText: {
    color: colors.primary,

    fontSize: 14,

    fontWeight: "900",
  },

  /* =====================================================
       SCROLL / FORM CARD
    ===================================================== */

  formScroll: {
    padding: 16,

    paddingBottom: 40,

    flexGrow: 1,
  },

  formScrollLarge: {
    paddingHorizontal: 24,

    paddingTop: 24,
  },

  formCard: {
    width: "100%",

    backgroundColor: colors.card,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 20,

    padding: 20,
  },

  formCardLarge: {
    maxWidth: 850,

    alignSelf: "center",
  },

  formTitle: {
    color: colors.text,

    fontSize: 17,

    fontWeight: "800",
  },

  formDescription: {
    color: colors.mutedText,

    fontSize: 12,

    marginTop: 4,

    lineHeight: 18,
  },

  /* =====================================================
       FORM FIELDS
    ===================================================== */

  formRow: {
    flexDirection: "row",

    gap: 12,

    marginTop: 16,
  },

  formColumn: {
    flexDirection: "column",
  },

  formField: {
    flex: 1,
  },

  fullField: {
    width: "100%",

    marginTop: 16,
  },

  label: {
    color: colors.text,

    fontSize: 12,

    fontWeight: "700",

    marginBottom: 6,
  },

  required: {
    color: colors.error,
  },

  input: {
    minHeight: 46,

    backgroundColor: colors.card,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 10,

    paddingHorizontal: 12,

    color: colors.text,

    fontSize: 13,
  },

  addressInput: {
    minHeight: 90,

    paddingTop: 12,

    paddingBottom: 12,
  },

  /* =====================================================
       STATE PICKER
    ===================================================== */

  stateField: {
    height: 46,

    backgroundColor: colors.card,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 10,

    paddingHorizontal: 12,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    position: "relative",

    overflow: "hidden",
  },

  stateValue: {
    flex: 1,

    color: colors.text,

    fontSize: 13,

    fontWeight: "500",

    paddingRight: 30,
  },

  stateArrow: {
    position: "absolute",

    right: 12,

    top: 0,

    bottom: 0,

    width: 24,

    alignItems: "center",

    justifyContent: "center",
  },

  hiddenPickerContainer: {
    position: "absolute",

    left: 0,

    right: 0,

    top: 0,

    bottom: 0,

    opacity: 0.02,
  },

  hiddenPicker: {
    width: "100%",

    height: 46,
  },

  /* =====================================================
       ACTIONS
    ===================================================== */

  formActions: {
    width: "100%",

    flexDirection: "row",

    gap: 12,

    marginTop: 16,

    marginBottom: 10,
  },

  formActionsLarge: {
    maxWidth: 850,

    alignSelf: "center",
  },

  cancelButton: {
    flex: 1,

    minHeight: 48,

    borderRadius: 11,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.card,

    alignItems: "center",

    justifyContent: "center",
  },

  cancelButtonText: {
    color: colors.text,

    fontSize: 13,

    fontWeight: "800",
  },

  saveButton: {
    flex: 1.4,

    minHeight: 48,

    borderRadius: 11,

    backgroundColor: colors.primary,

    alignItems: "center",

    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  /* =====================================================
       SUCCESS TOAST
    ===================================================== */

  toastContainer: {
    position: "absolute",

    left: 14,

    right: 14,

    bottom: 18,

    alignItems: "center",

    zIndex: 999,
  },

  toast: {
    width: "100%",

    maxWidth: 430,

    minHeight: 56,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#D4E7E3",

    paddingHorizontal: 12,

    paddingVertical: 9,

    elevation: 12,

    shadowColor: "#143631",

    shadowOffset: {
      width: 0,

      height: 4,
    },

    shadowOpacity: 0.16,

    shadowRadius: 10,
  },

  toastIcon: {
    width: 32,

    height: 32,

    borderRadius: 16,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.teal,

    marginRight: 10,
  },

  toastTextContainer: {
    flex: 1,
  },

  toastTitle: {
    color: colors.text,

    fontSize: 11,

    fontWeight: "900",
  },

  toastMessage: {
    color: colors.mutedText,

    fontSize: 9,

    fontWeight: "600",

    marginTop: 2,
  },

  /* =====================================================
       LOADING
    ===================================================== */

  loadingScreen: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.background,
  },

  loadingText: {
    color: colors.mutedText,

    fontSize: 14,

    fontWeight: "600",
  },

  /* =====================================================
       NOT FOUND
    ===================================================== */

  notFoundScreen: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: 20,

    backgroundColor: colors.background,
  },

  notFoundButton: {
    width: "100%",

    maxWidth: 400,

    marginTop: 16,

    flex: 0,
  },
});
