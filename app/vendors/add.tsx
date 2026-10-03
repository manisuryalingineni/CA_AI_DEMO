import React, {
  useRef,
  useState,
} from "react";

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

import {
  router,
} from "expo-router";

import {
  Picker,
} from "@react-native-picker/picker";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  saveVendor,
} from "../../src/services/vendorService";

import type {
  CreateVendorInput,
} from "../../src/types/vendor";

import {
  colors,
} from "../../src/theme/colors";

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
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

/* =========================================================
   ADD VENDOR
========================================================= */

export default function AddVendorScreen() {
  const {
    width,
  } =
    useWindowDimensions();

  const isLargeForm =
    width >= 700;

  const isSmall =
    width < 370;

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    mobile,
    setMobile,
  ] =
    useState("");

  const [
    gstin,
    setGstin,
  ] =
    useState("");

  const [
    state,
    setState,
  ] =
    useState(
      "Andhra Pradesh",
    );

  const [
    creditDays,
    setCreditDays,
  ] =
    useState("0");

  const [
    openingBalance,
    setOpeningBalance,
  ] =
    useState("0");

  const [
    businessDetail,
    setBusinessDetail,
  ] =
    useState("");

  const [
    address,
    setAddress,
  ] =
    useState("");

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
      new Animated.Value(
        0,
      ),
    ).current;

  const showSuccessToast =
    () => {
      toastOpacity.stopAnimation();

      toastOpacity.setValue(
        0,
      );

      setToastVisible(
        true,
      );

      Animated.timing(
        toastOpacity,
        {
          toValue: 1,

          duration: 180,

          useNativeDriver:
            true,
        },
      ).start();

      setTimeout(() => {
        Animated.timing(
          toastOpacity,
          {
            toValue: 0,

            duration: 180,

            useNativeDriver:
              true,
          },
        ).start(() => {
          setToastVisible(
            false,
          );
        });
      }, 1000);
    };

  /* =======================================================
     BACK / CANCEL
  ======================================================= */

  const handleBack =
    () => {
      if (saving) {
        return;
      }

      router.back();
    };

  const handleCancel =
    () => {
      if (saving) {
        return;
      }

      router.replace(
        "/dashboard",
      );
    };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave =
    async () => {
      if (saving) {
        return;
      }

      const vendorName =
        name.trim();

      const vendorMobile =
        mobile.trim();

      /* ===================================================
         NAME
      =================================================== */

      if (!vendorName) {
        Alert.alert(
          "Required",

          "Please enter vendor name.",
        );

        return;
      }

      /* ===================================================
         MOBILE
      =================================================== */

      if (!vendorMobile) {
        Alert.alert(
          "Required",

          "Please enter mobile number.",
        );

        return;
      }

      if (
        !/^\d{10}$/.test(
          vendorMobile,
        )
      ) {
        Alert.alert(
          "Invalid mobile number",

          "Please enter a valid 10-digit mobile number.",
        );

        return;
      }

      /* ===================================================
         GSTIN
      =================================================== */

      const cleanedGstin =
        gstin
          .trim()
          .toUpperCase();

      if (
        cleanedGstin &&
        cleanedGstin.length !==
          15
      ) {
        Alert.alert(
          "Invalid GSTIN",

          "GSTIN must contain 15 characters.",
        );

        return;
      }

      /* ===================================================
         CREDIT DAYS
      =================================================== */

      const parsedCreditDays =
        Number(
          creditDays,
        ) || 0;

      if (
        parsedCreditDays <
        0
      ) {
        Alert.alert(
          "Invalid credit days",

          "Credit days cannot be negative.",
        );

        return;
      }

      /* ===================================================
         OPENING BALANCE
      =================================================== */

      const parsedOpeningBalance =
        Number(
          openingBalance,
        ) || 0;

      if (
        parsedOpeningBalance <
        0
      ) {
        Alert.alert(
          "Invalid opening balance",

          "Opening balance cannot be negative.",
        );

        return;
      }

      const input:
        CreateVendorInput =
        {
          name:
            vendorName,

          mobile:
            vendorMobile,

          gstin:
            cleanedGstin ||
            undefined,

          state,

          creditDays:
            parsedCreditDays,

          openingBalance:
            parsedOpeningBalance,

          businessDetail:
            businessDetail
              .trim() ||
            undefined,

          address:
            address
              .trim() ||
            undefined,
        };

      try {
        setSaving(
          true,
        );

        await saveVendor(
          input,
        );

        showSuccessToast();

        /*
         * Give the user enough time
         * to see the success toast.
         */

        setTimeout(() => {
          router.replace(
            "/dashboard",
          );
        }, 1200);
      } catch (error) {
        Alert.alert(
          "Unable to save vendor",

          error instanceof Error
            ? error.message
            : "Something went wrong.",
        );

        setSaving(
          false,
        );
      }
    };

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
      <KeyboardAvoidingView
        style={
          styles.keyboard
        }
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={
            styles.container
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerLeft
              }
            >
              {/* BACK */}

              <Pressable
                onPress={
                  handleBack
                }
                disabled={
                  saving
                }
                hitSlop={
                  10
                }
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({
                  pressed,
                }) => [
                  styles.backButton,

                  pressed &&
                    !saving &&
                    styles.backButtonPressed,

                  saving &&
                    styles.backButtonDisabled,
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={
                    19
                  }
                  color={
                    colors.primary
                  }
                />
              </Pressable>

              {/* TITLE */}

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
                  numberOfLines={
                    1
                  }
                >
                  Add Vendor
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                  numberOfLines={
                    1
                  }
                >
                  Create a new retail vendor
                </Text>
              </View>
            </View>

            {/* LOGO */}

            <View
              style={
                styles.logo
              }
            >
              <Text
                style={
                  styles.logoText
                }
              >
                CA
              </Text>
            </View>
          </View>

          {/* =================================================
              FORM
          ================================================= */}

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,

              isLargeForm &&
                styles.scrollContentLarge,
            ]}
          >
            <View
              style={[
                styles.formCard,

                isLargeForm &&
                  styles.formCardLarge,
              ]}
            >
              <Text
                style={
                  styles.formTitle
                }
              >
                Vendor Information
              </Text>

              <Text
                style={
                  styles.formDescription
                }
              >
                Enter the vendor&apos;s basic and account details.
              </Text>

              {/* =================================================
                  NAME / MOBILE
              ================================================= */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                {/* NAME */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Vendor Name{" "}

                    <Text
                      style={
                        styles.required
                      }
                    >
                      *
                    </Text>
                  </Text>

                  <TextInput
                    value={
                      name
                    }
                    onChangeText={
                      setName
                    }
                    placeholder="Enter vendor name"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    autoCapitalize="words"
                    autoComplete="off"
                    importantForAutofill="no"
                    editable={
                      !saving
                    }
                    style={
                      styles.input
                    }
                  />
                </View>

                {/* MOBILE */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Mobile Number{" "}

                    <Text
                      style={
                        styles.required
                      }
                    >
                      *
                    </Text>
                  </Text>

                  <TextInput
                    value={
                      mobile
                    }
                    onChangeText={(
                      value,
                    ) =>
                      setMobile(
                        value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            10,
                          ),
                      )
                    }
                    placeholder="10-digit mobile number"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    importantForAutofill="yes"
                    maxLength={
                      10
                    }
                    editable={
                      !saving
                    }
                    style={
                      styles.input
                    }
                  />
                </View>
              </View>

              {/* =================================================
                  GST / STATE
              ================================================= */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                {/* GSTIN */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    GSTIN
                  </Text>

                  <TextInput
                    value={
                      gstin
                    }
                    onChangeText={(
                      value,
                    ) =>
                      setGstin(
                        value
                          .toUpperCase()
                          .replace(
                            /\s/g,
                            "",
                          )
                          .slice(
                            0,
                            15,
                          ),
                      )
                    }
                    placeholder="Optional GSTIN"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    autoCapitalize="characters"
                    autoComplete="off"
                    importantForAutofill="no"
                    editable={
                      !saving
                    }
                    maxLength={
                      15
                    }
                    style={
                      styles.input
                    }
                  />
                </View>

                {/* STATE */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    State
                  </Text>

                  <View
                    style={
                      styles.stateField
                    }
                  >
                    <Text
                      style={
                        styles.stateValue
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {state ||
                        "Select state"}
                    </Text>

                    <View
                      style={
                        styles.stateArrow
                      }
                      pointerEvents="none"
                    >
                      <Ionicons
                        name="chevron-down"
                        size={
                          15
                        }
                        color={
                          colors.mutedText
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.hiddenPickerContainer
                      }
                    >
                      <Picker
                        selectedValue={
                          state
                        }
                        onValueChange={(
                          value:
                            string,
                        ) =>
                          setState(
                            value,
                          )
                        }
                        enabled={
                          !saving
                        }
                        style={
                          styles.hiddenPicker
                        }
                      >
                        {STATES.map(
                          (
                            item,
                          ) => (
                            <Picker.Item
                              key={
                                item
                              }
                              label={
                                item
                              }
                              value={
                                item
                              }
                            />
                          ),
                        )}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              {/* =================================================
                  CREDIT / OPENING BALANCE
              ================================================= */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                {/* CREDIT DAYS */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Credit Days
                  </Text>

                  <TextInput
                    value={
                      creditDays
                    }
                    onChangeText={(
                      value,
                    ) =>
                      setCreditDays(
                        value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="number-pad"
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    editable={
                      !saving
                    }
                    style={
                      styles.input
                    }
                  />
                </View>

                {/* OPENING BALANCE */}

                <View
                  style={
                    styles.formField
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Opening Balance
                  </Text>

                  <TextInput
                    value={
                      openingBalance
                    }
                    onChangeText={(
                      value,
                    ) => {
                      const cleaned =
                        value.replace(
                          /[^0-9.]/g,
                          "",
                        );

                      const parts =
                        cleaned.split(
                          ".",
                        );

                      if (
                        parts.length >
                        2
                      ) {
                        return;
                      }

                      setOpeningBalance(
                        cleaned,
                      );
                    }}
                    placeholder="0"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="decimal-pad"
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    editable={
                      !saving
                    }
                    style={
                      styles.input
                    }
                  />
                </View>
              </View>

              {/* =================================================
                  VENDOR DETAILS
              ================================================= */}

              <View
                style={
                  styles.fullField
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Vendor Details
                </Text>

                <TextInput
                  value={
                    businessDetail
                  }
                  onChangeText={
                    setBusinessDetail
                  }
                  placeholder="Example: Distributor / wholesaler"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  autoComplete="off"
                  importantForAutofill="no"
                  editable={
                    !saving
                  }
                  style={
                    styles.input
                  }
                />
              </View>

              {/* =================================================
                  ADDRESS
              ================================================= */}

              <View
                style={
                  styles.fullField
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Address
                </Text>

                <TextInput
                  value={
                    address
                  }
                  onChangeText={
                    setAddress
                  }
                  placeholder="Vendor address"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  autoComplete="street-address"
                  importantForAutofill="no"
                  multiline
                  numberOfLines={
                    4
                  }
                  textAlignVertical="top"
                  editable={
                    !saving
                  }
                  style={[
                    styles.input,

                    styles.addressInput,
                  ]}
                />
              </View>
            </View>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <View
              style={[
                styles.actions,

                isLargeForm &&
                  styles.actionsLarge,
              ]}
            >
              <Pressable
                onPress={
                  handleCancel
                }
                disabled={
                  saving
                }
                style={({
                  pressed,
                }) => [
                  styles.cancelButton,

                  pressed &&
                    !saving &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  handleSave
                }
                disabled={
                  saving
                }
                style={({
                  pressed,
                }) => [
                  styles.saveButton,

                  saving &&
                    styles.disabledButton,

                  pressed &&
                    !saving &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save Vendor"}
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
                  styles.toast
                }
              >
                <View
                  style={
                    styles.toastIcon
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={
                      15
                    }
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.toastTextContainer
                  }
                >
                  <Text
                    style={
                      styles.toastTitle
                    }
                  >
                    Vendor saved
                  </Text>

                  <Text
                    style={
                      styles.toastMessage
                    }
                  >
                    Vendor saved successfully
                  </Text>
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
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================================================
       ROOT
    ===================================================== */

    safeArea: {
      flex: 1,

      backgroundColor:
        colors.background,
    },

    keyboard: {
      flex: 1,

      width: "100%",
    },

    container: {
      flex: 1,

      width: "100%",

      backgroundColor:
        colors.background,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 76,

      backgroundColor:
        colors.primary,

      paddingHorizontal: 18,

      paddingVertical: 12,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      elevation: 6,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.15,

      shadowRadius: 4,
    },

    headerLeft: {
      flex: 1,

      flexDirection: "row",

      alignItems: "center",

      minWidth: 0,
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

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#D9E3E7",

      marginRight: 10,

      elevation: 4,

      shadowColor:
        "#000000",

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

    backButtonDisabled: {
      opacity: 0.5,
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

    headerTitleSmall: {
      fontSize: 16,
    },

    headerSubtitle: {
      color: "#D6E3EC",

      fontSize: 11,

      marginTop: 3,
    },

    logo: {
      width: 42,

      height: 42,

      flexShrink: 0,

      borderRadius: 13,

      backgroundColor:
        colors.gold,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 10,
    },

    logoText: {
      color:
        colors.primary,

      fontSize: 14,

      fontWeight: "900",
    },

    /* =====================================================
       SCROLL
    ===================================================== */

    scrollContent: {
      padding: 16,

      paddingBottom: 30,

      flexGrow: 1,
    },

    scrollContentLarge: {
      paddingHorizontal: 24,

      paddingTop: 24,
    },

    /* =====================================================
       FORM CARD
    ===================================================== */

    formCard: {
      width: "100%",

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 20,

      padding: 20,
    },

    formCardLarge: {
      maxWidth: 850,

      alignSelf: "center",
    },

    formTitle: {
      color:
        colors.text,

      fontSize: 17,

      fontWeight: "800",
    },

    formDescription: {
      color:
        colors.mutedText,

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
      flexDirection:
        "column",
    },

    formField: {
      flex: 1,
    },

    fullField: {
      width: "100%",

      marginTop: 16,
    },

    label: {
      color:
        colors.text,

      fontSize: 12,

      fontWeight: "700",

      marginBottom: 6,
    },

    required: {
      color:
        colors.error,
    },

    input: {
      minHeight: 46,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 10,

      paddingHorizontal: 12,

      color:
        colors.text,

      fontSize: 13,
    },

    addressInput: {
      minHeight: 90,

      paddingTop: 12,

      paddingBottom: 12,
    },

    /* =====================================================
       STATE
    ===================================================== */

    stateField: {
      height: 46,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 10,

      paddingHorizontal: 12,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      position: "relative",

      overflow: "hidden",
    },

    stateValue: {
      flex: 1,

      color:
        colors.text,

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

      justifyContent:
        "center",
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

    actions: {
      width: "100%",

      flexDirection: "row",

      gap: 12,

      marginTop: 16,

      marginBottom: 10,
    },

    actionsLarge: {
      maxWidth: 850,

      alignSelf: "center",
    },

    cancelButton: {
      flex: 1,

      minHeight: 48,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.card,

      alignItems: "center",

      justifyContent:
        "center",
    },

    cancelButtonText: {
      color:
        colors.text,

      fontSize: 13,

      fontWeight: "800",
    },

    saveButton: {
      flex: 1.4,

      minHeight: 48,

      borderRadius: 11,

      backgroundColor:
        colors.primary,

      alignItems: "center",

      justifyContent:
        "center",
    },

    saveButtonText: {
      color: "#FFFFFF",

      fontSize: 13,

      fontWeight: "800",
    },

    disabledButton: {
      opacity: 0.6,
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
       TOAST
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

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        "#D4E7E3",

      paddingHorizontal: 12,

      paddingVertical: 9,

      elevation: 12,

      shadowColor:
        "#143631",

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

      justifyContent:
        "center",

      backgroundColor:
        colors.teal,

      marginRight: 10,
    },

    toastTextContainer: {
      flex: 1,
    },

    toastTitle: {
      color:
        colors.text,

      fontSize: 11,

      fontWeight: "900",
    },

    toastMessage: {
      color:
        colors.mutedText,

      fontSize: 9,

      fontWeight: "600",

      marginTop: 2,
    },
  });