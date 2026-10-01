import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
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
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { loadCustomers } from "../../src/services/customerService";
import { loadProducts } from "../../src/services/productService";
import { saveSale } from "../../src/services/saleService";

import type { Customer } from "../../src/types/customer";
import type { Product } from "../../src/types/product";

import type {
  PaymentMethod,
  PaymentStatus,
} from "../../src/types/sale";

import { colors } from "../../src/theme/colors";

/* =========================================================
   TYPES
========================================================= */

type CartItem = {
  product: Product;
  quantity: number;
};

type ScreenSize =
  | "small"
  | "phone"
  | "tablet"
  | "desktop";

/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(date: string): string {
  if (!date) return "";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calculateItem(item: CartItem) {
  const baseAmount =
    item.product.salePrice * item.quantity;

  const gstAmount =
    (baseAmount * item.product.gstRate) / 100;

  const totalAmount =
    baseAmount + gstAmount;

  return {
    baseAmount,
    gstAmount,
    totalAmount,
  };
}

/* =========================================================
   FIELD LABEL
========================================================= */

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? " *" : ""}
    </Text>
  );
}

/* =========================================================
   COMPACT INPUT
========================================================= */

type FormInputProps = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
};

function FormInput({
  value,
  placeholder,
  onChangeText,
  editable = true,
  keyboardType = "default",
}: FormInputProps) {
  return (
    <View style={styles.inputShell}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B949C"
        editable={editable}
        keyboardType={keyboardType}
        style={styles.formInput}
      />
    </View>
  );
}

/* =========================================================
   POS SCREEN
========================================================= */

export default function POSScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const screenSize: ScreenSize =
    width < 360
      ? "small"
      : width < 768
        ? "phone"
        : width < 1100
          ? "tablet"
          : "desktop";

  const isSmall =
    screenSize === "small";

  const isWide =
    screenSize === "tablet" ||
    screenSize === "desktop";

  /* =======================================================
     DATA
  ======================================================= */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] =
    useState<Customer | null>(null);

  const [
    showCustomers,
    setShowCustomers,
  ] = useState(false);

  const [
    customerSearch,
    setCustomerSearch,
  ] = useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<Product | null>(null);

  const [
    showProducts,
    setShowProducts,
  ] = useState(false);

  const [
    productSearch,
    setProductSearch,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [rate, setRate] =
    useState("");

  const [gstRate, setGstRate] =
    useState("");

  const [
    documentDate,
    setDocumentDate,
  ] = useState(todayString());

  const [
    dueDate,
    setDueDate,
  ] = useState(todayString());

  const [supply] = useState(
    "Within state (CGST + SGST)",
  );

  const [branch, setBranch] =
    useState("");

  const [
    salesperson,
    setSalesperson,
  ] = useState("");

  const [
    delivery,
    setDelivery,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [paymentMethod] =
    useState<PaymentMethod>("CASH");

  const [paidAmount] =
    useState("");

  const [saving, setSaving] =
    useState(false);


  const [toastVisible, setToastVisible] =
  useState(false);

const toastOpacity =
  useRef(new Animated.Value(0)).current;

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(async () => {
      try {
        const [
          loadedProducts,
          loadedCustomers,
        ] =
          await Promise.all([
            loadProducts(),
            loadCustomers(),
          ]);

        setProducts(
          loadedProducts,
        );

        setCustomers(
          loadedCustomers,
        );
      } catch (error) {
        Alert.alert(
          "Unable to load POS",
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        );
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  /* =======================================================
     FILTER CUSTOMERS
  ======================================================= */

  const filteredCustomers =
    useMemo(() => {
      const query =
        customerSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return customers.slice(
          0,
          8,
        );
      }

      return customers
        .filter((customer) => {
          return (
            customer.name
              .toLowerCase()
              .includes(query) ||
            customer.mobile
              .toLowerCase()
              .includes(query) ||
            customer.gstin
              ?.toLowerCase()
              .includes(query)
          );
        })
        .slice(0, 8);
    }, [
      customers,
      customerSearch,
    ]);

    const showSuccessToast = () => {
  setToastVisible(true);

  Animated.sequence([
    Animated.timing(
      toastOpacity,
      {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      },
    ),

    Animated.delay(1800),

    Animated.timing(
      toastOpacity,
      {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      },
    ),
  ]).start(() => {
    setToastVisible(false);
  });
};

  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const query =
        productSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return products.slice(
          0,
          10,
        );
      }

      return products
        .filter((product) => {
          return (
            product.name
              .toLowerCase()
              .includes(query) ||
            product.barcode
              ?.toLowerCase()
              .includes(query) ||
            product.brand
              ?.toLowerCase()
              .includes(query) ||
            product.hsn
              ?.toLowerCase()
              .includes(query)
          );
        })
        .slice(0, 10);
    }, [
      products,
      productSearch,
    ]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal =
    useMemo(() => {
      return cart.reduce(
        (sum, item) => {
          return (
            sum +
            item.product.salePrice *
              item.quantity
          );
        },
        0,
      );
    }, [cart]);

  const gstAmount =
    useMemo(() => {
      return cart.reduce(
        (sum, item) => {
          return (
            sum +
            calculateItem(item).gstAmount
          );
        },
        0,
      );
    }, [cart]);

  const totalAmount =
    useMemo(() => {
      return subtotal + gstAmount;
    }, [
      subtotal,
      gstAmount,
    ]);

  const numericPaidAmount =
    Number(paidAmount) || 0;

  const dueAmount =
    Math.max(
      totalAmount -
        numericPaidAmount,
      0,
    );

  const paymentStatus:
    PaymentStatus =
    numericPaidAmount >=
    totalAmount
      ? "PAID"
      : numericPaidAmount > 0
        ? "PARTIAL"
        : "DUE";

  /* =======================================================
     CUSTOMER
  ======================================================= */

  const selectCustomer = (
    customer: Customer,
  ) => {
    setSelectedCustomer(
      customer,
    );

    setCustomerSearch("");

    setShowCustomers(false);
  };

  /* =======================================================
     PRODUCT SELECT
  ======================================================= */

  const selectProduct = (
    product: Product,
  ) => {
    setSelectedProduct(
      product,
    );

    setProductSearch(
      product.name,
    );

    setRate(
      String(
        product.salePrice,
      ),
    );

    setGstRate(
      String(
        product.gstRate,
      ),
    );

    setQuantity("1");

    setShowProducts(false);
  };

  /* =======================================================
     ADD LINE
  ======================================================= */

  const handleAddLine = () => {
    if (!selectedProduct) {
      Alert.alert(
        "Select item",
        "Please select an item or service.",
      );

      return;
    }

    const qty =
      Number(quantity);

    if (
      !qty ||
      qty <= 0
    ) {
      Alert.alert(
        "Invalid quantity",
        "Please enter a valid quantity.",
      );

      return;
    }

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.product.id ===
            selectedProduct.id,
        );

      if (existing) {
        return current.map(
          (item) =>
            item.product.id ===
            selectedProduct.id
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    qty,
                }
              : item,
        );
      }

      return [
        ...current,
        {
          product:
            selectedProduct,
          quantity: qty,
        },
      ];
    });

    setSelectedProduct(null);

    setProductSearch("");

    setQuantity("1");

    setRate("");

    setGstRate("");
  };

  /* =======================================================
     REMOVE ITEM
  ======================================================= */

  const removeItem = (
    productId: string,
  ) => {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product.id !==
          productId,
      ),
    );
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSaveSale =
    async () => {
      if (!cart.length) {
        Alert.alert(
          "Add items",
          "Please add at least one item to the tax invoice.",
        );

        return;
      }

      try {
        setSaving(true);

        const saleItems =
          cart.map((item) => {
            const calculated =
              calculateItem(
                item,
              );

            return {
              productId:
                item.product.id,

              quantity:
                item.quantity,

              unitPrice:
                item.product
                  .salePrice,

              gstRate:
                item.product
                  .gstRate,

              gstAmount:
                calculated
                  .gstAmount,

              discount: 0,

              totalAmount:
                calculated
                  .totalAmount,
            };
          });

        const sale =
          await saveSale({
            customerId:
              selectedCustomer
                ?.id,

            saleDate:
              documentDate,

            subtotal,

            gstAmount,

            discount: 0,

            totalAmount,

            paidAmount:
              numericPaidAmount,

            dueAmount,

            paymentMethod,

            paymentStatus,

            notes:
              notes.trim() ||
              undefined,

            items:
              saleItems,
          });

        Alert.alert(
          "Tax invoice saved",
          `Invoice total ${formatCurrency(
            sale.totalAmount,
          )} saved successfully.`,
          [
            {
              text: "OK",

              onPress: () => {
                setCart([]);

                setNotes("");

                setSelectedCustomer(
                  null,
                );
              },
            },
          ],
        );
      } catch (error) {
        Alert.alert(
          "Unable to save invoice",

          error instanceof Error
            ? error.message
            : "Something went wrong.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        "top",
        "bottom",
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,

            isWide &&
              styles.scrollContentWide,

            {
              paddingBottom:
                20 +
                insets.bottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={[
              styles.formContainer,

              isSmall &&
                styles.formContainerSmall,
            ]}
          >
            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={
                styles.topRow
              }
            >
              <View
                style={
                  styles.titleArea
                }
              >
                <Text
                  style={[
                    styles.pageTitle,

                    isSmall &&
                      styles.pageTitleSmall,
                  ]}
                >
                  Tax invoice
                </Text>

                <Text
                  style={[
                    styles.pageSubtitle,

                    isSmall &&
                      styles.pageSubtitleSmall,
                  ]}
                >
                  Create customer sales
                  invoice
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.back()
                }
                style={({ pressed }) => [
                  styles.closeButton,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color="#142132"
                />
              </Pressable>
            </View>

            {/* =================================================
                INFO
            ================================================= */}

            <View
              style={
                styles.infoBox
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#3D718B"
              />

              <Text
                style={
                  styles.infoText
                }
              >
                Retail Shop invoice
                details
              </Text>
            </View>

            {/* =================================================
                CUSTOMER
            ================================================= */}

            <View
              style={
                styles.fieldBlock
              }
            >
              <FieldLabel required>
                CUSTOMER
              </FieldLabel>

              <Pressable
                onPress={() =>
                  setShowCustomers(
                    (value) =>
                      !value,
                  )
                }
                style={
                  styles.selectField
                }
              >
                <View
                  style={
                    styles.selectLeft
                  }
                >
                  <View
                    style={
                      styles.fieldIcon
                    }
                  >
                    <Ionicons
                      name="person-outline"
                      size={15}
                      color={colors.teal}
                    />
                  </View>

                  <Text
                    style={
                      styles.selectText
                    }
                    numberOfLines={1}
                  >
                    {selectedCustomer
                      ? selectedCustomer.name
                      : "Walk-in Customer"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color="#66727A"
                />
              </Pressable>

              {showCustomers && (
                <View
                  style={
                    styles.dropdown
                  }
                >
                  <View
                    style={
                      styles.dropdownSearch
                    }
                  >
                    <Ionicons
                      name="search-outline"
                      size={15}
                      color="#7B858D"
                    />

                    <TextInput
                      value={
                        customerSearch
                      }
                      onChangeText={
                        setCustomerSearch
                      }
                      placeholder="Search customer"
                      placeholderTextColor="#8B9298"
                      style={
                        styles.dropdownSearchInput
                      }
                    />
                  </View>

                  <Pressable
                    onPress={() => {
                      setSelectedCustomer(
                        null,
                      );

                      setShowCustomers(
                        false,
                      );
                    }}
                    style={
                      styles.dropdownRow
                    }
                  >
                    <Text
                      style={
                        styles.dropdownTitle
                      }
                    >
                      Walk-in Customer
                    </Text>

                    <Text
                      style={
                        styles.dropdownMeta
                      }
                    >
                      Cash counter customer
                    </Text>
                  </Pressable>

                  {filteredCustomers.map(
                    (customer) => (
                      <Pressable
                        key={
                          customer.id
                        }
                        onPress={() =>
                          selectCustomer(
                            customer,
                          )
                        }
                        style={
                          styles.dropdownRow
                        }
                      >
                        <Text
                          style={
                            styles.dropdownTitle
                          }
                        >
                          {
                            customer.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.dropdownMeta
                          }
                        >
                          {
                            customer.mobile
                          }
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              )}
            </View>

            {/* =================================================
                DOCUMENT DATE + DUE DATE
            ================================================= */}

            <View
              style={[
                styles.twoColumn,

                !isWide &&
                  styles.twoColumnMobile,
              ]}
            >
              <View
                style={
                  styles.columnField
                }
              >
                <FieldLabel>
                  DOCUMENT DATE
                </FieldLabel>

                <Pressable
                  style={
                    styles.inputShell
                  }
                >
                  <Text
                    style={
                      styles.dateText
                    }
                  >
                    {displayDate(
                      documentDate,
                    )}
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#263746"
                  />
                </Pressable>
              </View>

              <View
                style={
                  styles.columnField
                }
              >
                <FieldLabel>
                  DUE DATE
                </FieldLabel>

                <Pressable
                  style={
                    styles.inputShell
                  }
                >
                  <Text
                    style={
                      styles.dateText
                    }
                  >
                    {displayDate(
                      dueDate,
                    )}
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#263746"
                  />
                </Pressable>
              </View>
            </View>

            {/* =================================================
                SUPPLY
            ================================================= */}

            <View
              style={
                styles.fieldBlock
              }
            >
              <FieldLabel>
                SUPPLY
              </FieldLabel>

              <Pressable
                style={
                  styles.selectField
                }
              >
                <View
                  style={
                    styles.selectLeft
                  }
                >
                  <View
                    style={
                      styles.fieldIcon
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={colors.teal}
                    />
                  </View>

                  <Text
                    style={
                      styles.selectText
                    }
                    numberOfLines={1}
                  >
                    {supply}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color="#66727A"
                />
              </Pressable>
            </View>

            {/* =================================================
                BRANCH / SALESPERSON
            ================================================= */}

            <View
              style={[
                styles.twoColumn,

                !isWide &&
                  styles.twoColumnMobile,
              ]}
            >
              <View
                style={
                  styles.columnField
                }
              >
                <FieldLabel>
                  COUNTER / BRANCH
                </FieldLabel>

                <FormInput
                  value={branch}
                  onChangeText={
                    setBranch
                  }
                  placeholder="Counter or branch"
                />
              </View>

              <View
                style={
                  styles.columnField
                }
              >
                <FieldLabel>
                  SALESPERSON
                </FieldLabel>

                <FormInput
                  value={
                    salesperson
                  }
                  onChangeText={
                    setSalesperson
                  }
                  placeholder="Salesperson"
                />
              </View>
            </View>

            {/* =================================================
                DELIVERY
            ================================================= */}

            <View
              style={
                styles.fieldBlock
              }
            >
              <FieldLabel>
                DELIVERY / PICKUP
              </FieldLabel>

              <FormInput
                value={delivery}
                onChangeText={
                  setDelivery
                }
                placeholder="Delivery or pickup"
              />
            </View>

            {/* =================================================
                ITEM SECTION
            ================================================= */}

            <View
              style={
                styles.itemCard
              }
            >
              <View
                style={
                  styles.itemHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.itemCardTitle
                    }
                  >
                    Add item
                  </Text>

                  <Text
                    style={
                      styles.itemCardSubtitle
                    }
                  >
                    Add product or service
                  </Text>
                </View>

                <View
                  style={
                    styles.itemBadge
                  }
                >
                  <Text
                    style={
                      styles.itemBadgeText
                    }
                  >
                    {cart.length} line
                    {cart.length === 1
                      ? ""
                      : "s"}
                  </Text>
                </View>
              </View>

              {/* ITEM + QTY */}

              <View
                style={
                  styles.itemTopRow
                }
              >
                <View
                  style={
                    styles.itemProductColumn
                  }
                >
                  <FieldLabel>
                    ITEM
                  </FieldLabel>

                  <Pressable
                    onPress={() =>
                      setShowProducts(
                        (value) =>
                          !value,
                      )
                    }
                    style={
                      styles.selectField
                    }
                  >
                    <Text
                      style={
                        styles.selectText
                      }
                      numberOfLines={1}
                    >
                      {selectedProduct
                        ? selectedProduct.name
                        : "Select item"}
                    </Text>

                    <Ionicons
                      name="chevron-down"
                      size={15}
                      color="#66727A"
                    />
                  </Pressable>

                  {showProducts && (
                    <View
                      style={
                        styles.productDropdown
                      }
                    >
                      <View
                        style={
                          styles.dropdownSearch
                        }
                      >
                        <Ionicons
                          name="search-outline"
                          size={15}
                          color="#7B858D"
                        />

                        <TextInput
                          value={
                            productSearch
                          }
                          onChangeText={
                            setProductSearch
                          }
                          placeholder="Search product"
                          placeholderTextColor="#8B9298"
                          style={
                            styles.dropdownSearchInput
                          }
                        />
                      </View>

                      {filteredProducts.map(
                        (product) => (
                          <Pressable
                            key={
                              product.id
                            }
                            onPress={() =>
                              selectProduct(
                                product,
                              )
                            }
                            style={
                              styles.productDropdownRow
                            }
                          >
                            <View
                              style={
                                styles.productDropdownInfo
                              }
                            >
                              <Text
                                style={
                                  styles.dropdownTitle
                                }
                                numberOfLines={1}
                              >
                                {
                                  product.name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.dropdownMeta
                                }
                              >
                                {
                                  product.unit
                                }{" "}
                                • GST{" "}
                                {
                                  product.gstRate
                                }
                                %
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.productDropdownPrice
                              }
                            >
                              {formatCurrency(
                                product.salePrice,
                              )}
                            </Text>
                          </Pressable>
                        ),
                      )}
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.qtyColumn
                  }
                >
                  <FieldLabel>
                    QTY
                  </FieldLabel>

                  <FormInput
                    value={quantity}
                    onChangeText={
                      setQuantity
                    }
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* RATE + GST */}

              <View
                style={
                  styles.itemTopRow
                }
              >
                <View
                  style={
                    styles.itemProductColumn
                  }
                >
                  <FieldLabel>
                    RATE
                  </FieldLabel>

                  <FormInput
                    value={rate}
                    onChangeText={
                      setRate
                    }
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View
                  style={
                    styles.qtyColumn
                  }
                >
                  <FieldLabel>
                    GST %
                  </FieldLabel>

                  <FormInput
                    value={gstRate}
                    onChangeText={
                      setGstRate
                    }
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* ADD BUTTON */}

              <Pressable
                onPress={
                  handleAddLine
                }
                style={({ pressed }) => [
                  styles.addLineButton,

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.addLineButtonText
                  }
                >
                  Add line
                </Text>
              </Pressable>

              {/* CART */}

              {cart.length === 0 ? (
                <View
                  style={
                    styles.emptyLineBox
                  }
                >
                  <Ionicons
                    name="receipt-outline"
                    size={18}
                    color="#9AA5AD"
                  />

                  <Text
                    style={
                      styles.noLinesText
                    }
                  >
                    No lines added
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.cartList
                  }
                >
                  {cart.map(
                    (item) => {
                      const calculated =
                        calculateItem(
                          item,
                        );

                      return (
                        <View
                          key={
                            item.product
                              .id
                          }
                          style={
                            styles.cartRow
                          }
                        >
                          <View
                            style={
                              styles.cartInfo
                            }
                          >
                            <Text
                              style={
                                styles.cartName
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {
                                item.product
                                  .name
                              }
                            </Text>

                            <Text
                              style={
                                styles.cartMeta
                              }
                            >
                              {
                                item.quantity
                              }{" "}
                              ×{" "}
                              {formatCurrency(
                                item.product
                                  .salePrice,
                              )}{" "}
                              • GST{" "}
                              {
                                item.product
                                  .gstRate
                              }
                              %
                            </Text>
                          </View>

                          <View
                            style={
                              styles.cartRight
                            }
                          >
                            <Text
                              style={
                                styles.cartAmount
                              }
                            >
                              {formatCurrency(
                                calculated.totalAmount,
                              )}
                            </Text>

                            <Pressable
                              onPress={() =>
                                removeItem(
                                  item.product
                                    .id,
                                )
                              }
                              style={
                                styles.deleteButton
                              }
                            >
                              <Ionicons
                                name="trash-outline"
                                size={14}
                                color="#C94740"
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    },
                  )}
                </View>
              )}
            </View>

            {/* =================================================
                SUMMARY
            ================================================= */}

            <View
              style={
                styles.summaryCard
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
                  {formatCurrency(
                    subtotal,
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
                  {formatCurrency(
                    gstAmount,
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
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Total
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatCurrency(
                    totalAmount,
                  )}
                </Text>
              </View>
            </View>

            {/* =================================================
                NOTES
            ================================================= */}

            <View
              style={
                styles.fieldBlock
              }
            >
              <FieldLabel>
                NOTES
              </FieldLabel>

              <TextInput
                value={notes}
                onChangeText={
                  setNotes
                }
                placeholder="Optional reference or terms"
                placeholderTextColor="#8B9298"
                multiline
                textAlignVertical="top"
                style={
                  styles.notesInput
                }
              />
            </View>

            {/* =================================================
                ACTION BUTTONS
            ================================================= */}

            <View
              style={
                styles.actionRow
              }
            >
              <Pressable
                onPress={() =>
                  router.back()
                }
                style={({ pressed }) => [
                  styles.cancelButton,

                  pressed &&
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
                disabled={
                  saving ||
                  !cart.length
                }
                onPress={
                  handleSaveSale
                }
                style={({ pressed }) => [
                  styles.saveButton,

                  (saving ||
                    !cart.length) &&
                    styles.saveButtonDisabled,

                  pressed &&
                    !saving &&
                    styles.buttonPressed,
                ]}
              >
                {saving && (
                  <Ionicons
                    name="hourglass-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save invoice"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     ROOT
  ======================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: "#0D3550",
  },

  flex: {
    flex: 1,
  },

  scroll: {
    flex: 1,
    backgroundColor: "#EEF3F6",
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 6,
  },

  scrollContentWide: {
    paddingHorizontal: 20,
  },

  /* =======================================================
     FORM
  ======================================================= */

  formContainer: {
    width: "100%",
    maxWidth: 720,

    alignSelf: "center",

    backgroundColor: "#F7F9FB",

    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,

    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,

    minHeight: "100%",
  },

  formContainerSmall: {
    paddingHorizontal: 11,
    paddingTop: 13,

    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 14,
  },

  titleArea: {
    flex: 1,
    minWidth: 0,
  },

  pageTitle: {
    color: "#152536",
    fontSize: 21,
    fontWeight: "900",
  },

  pageTitleSmall: {
    fontSize: 18,
  },

  pageSubtitle: {
    color: "#7B858E",
    fontSize: 10,
    marginTop: 2,
  },

  pageSubtitleSmall: {
    fontSize: 9,
  },

  closeButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    backgroundColor: "#EDF0F2",

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 8,
  },

  pressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  /* =======================================================
     INFO
  ======================================================= */

  infoBox: {
    minHeight: 40,

    flexDirection: "row",
    alignItems: "center",

    gap: 7,

    backgroundColor: "#EAF6FE",

    borderWidth: 1,
    borderColor: "#C5E0EF",

    borderRadius: 11,

    paddingHorizontal: 11,

    marginBottom: 12,
  },

  infoText: {
    color: "#3D718B",
    fontSize: 10,
    fontWeight: "600",
  },

  /* =======================================================
     FIELDS
  ======================================================= */

  fieldBlock: {
    width: "100%",
    marginBottom: 10,
  },

  fieldLabel: {
    color: "#3B4B58",

    fontSize: 8.5,
    fontWeight: "900",

    marginBottom: 4,

    letterSpacing: 0.3,
  },

  /* =======================================================
     INPUTS
  ======================================================= */

  inputShell: {
    width: "100%",

    minHeight: 43,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#D7E0E6",

    borderRadius: 11,

    paddingHorizontal: 10,
  },

  formInput: {
    flex: 1,

    minHeight: 40,

    color: "#253544",

    fontSize: 13,

    paddingVertical: 0,
  },

  dateText: {
    flex: 1,

    color: "#253544",

    fontSize: 13,
    fontWeight: "500",
  },

  /* =======================================================
     SELECT
  ======================================================= */

  selectField: {
    minHeight: 43,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#D7E0E6",

    borderRadius: 11,

    paddingHorizontal: 10,

    gap: 7,
  },

  selectLeft: {
    flex: 1,

    minWidth: 0,

    flexDirection: "row",
    alignItems: "center",

    gap: 8,
  },

  fieldIcon: {
    width: 27,
    height: 27,

    borderRadius: 8,

    backgroundColor: "#E8F6F4",

    alignItems: "center",
    justifyContent: "center",
  },

  selectText: {
    flex: 1,

    minWidth: 0,

    color: "#253544",

    fontSize: 13,
    fontWeight: "500",
  },

  /* =======================================================
     RESPONSIVE COLUMNS
  ======================================================= */

  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },

  twoColumnMobile: {
    flexDirection: "column",
    gap: 0,
  },

  columnField: {
    flex: 1,
    marginBottom: 10,
  },

  /* =======================================================
     DROPDOWN
  ======================================================= */

  dropdown: {
    marginTop: 5,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#D8E1E7",

    borderRadius: 11,

    overflow: "hidden",

    elevation: 5,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.09,
    shadowRadius: 8,
  },

  dropdownSearch: {
    height: 39,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,

    gap: 7,

    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F3",
  },

  dropdownSearchInput: {
    flex: 1,

    height: 38,

    color: "#253544",

    fontSize: 11,
  },

  dropdownRow: {
    paddingHorizontal: 11,
    paddingVertical: 8,

    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F3",
  },

  dropdownTitle: {
    color: "#253544",

    fontSize: 11,

    fontWeight: "800",
  },

  dropdownMeta: {
    color: "#83909A",

    fontSize: 8,

    marginTop: 2,
  },

  /* =======================================================
     ITEM CARD
  ======================================================= */

  itemCard: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E0E7EC",

    borderRadius: 15,

    padding: 11,

    marginTop: 1,
    marginBottom: 12,

    shadowColor: "#183243",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.04,
    shadowRadius: 7,

    elevation: 1,
  },

  itemHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 8,
  },

  itemCardTitle: {
    color: "#203141",

    fontSize: 13,

    fontWeight: "900",
  },

  itemCardSubtitle: {
    color: "#7F8991",

    fontSize: 8,

    marginTop: 1,
  },

  itemBadge: {
    backgroundColor: "#E8F6F4",

    borderRadius: 99,

    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  itemBadgeText: {
    color: colors.teal,

    fontSize: 7,

    fontWeight: "900",
  },

  itemTopRow: {
    flexDirection: "row",

    gap: 7,

    marginBottom: 7,

    alignItems: "flex-end",
  },

  itemProductColumn: {
    flex: 1,

    minWidth: 0,
  },

  qtyColumn: {
    width: 78,
  },

  /* =======================================================
     PRODUCT DROPDOWN
  ======================================================= */

  productDropdown: {
    marginTop: 4,

    borderWidth: 1,
    borderColor: "#D8E1E7",

    borderRadius: 10,

    overflow: "hidden",

    backgroundColor: "#FFFFFF",

    maxHeight: 250,
  },

  productDropdownRow: {
    minHeight: 46,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 9,
    paddingVertical: 6,

    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F3",
  },

  productDropdownInfo: {
    flex: 1,
    minWidth: 0,
  },

  productDropdownPrice: {
    color: colors.teal,

    fontSize: 10,

    fontWeight: "900",

    marginLeft: 7,
  },

  /* =======================================================
     ADD LINE
  ======================================================= */

  addLineButton: {
    minHeight: 43,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    backgroundColor: "#0A968C",

    borderRadius: 11,

    marginTop: 1,
  },

  addLineButtonText: {
    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.8,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  /* =======================================================
     EMPTY LINE
  ======================================================= */

  emptyLineBox: {
    flexDirection: "row",
    alignItems: "center",

    gap: 6,

    paddingTop: 10,
  },

  noLinesText: {
    color: "#8A949C",

    fontSize: 9,
  },

  /* =======================================================
     CART
  ======================================================= */

  cartList: {
    marginTop: 9,

    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
  },

  cartRow: {
    minHeight: 54,

    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 7,

    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F3",
  },

  cartInfo: {
    flex: 1,
    minWidth: 0,
  },

  cartName: {
    color: "#203141",

    fontSize: 11,

    fontWeight: "900",
  },

  cartMeta: {
    color: "#7B858D",

    fontSize: 8,

    marginTop: 2,
  },

  cartRight: {
    alignItems: "flex-end",

    gap: 4,

    marginLeft: 7,
  },

  cartAmount: {
    color: "#203141",

    fontSize: 10,

    fontWeight: "900",
  },

  deleteButton: {
    width: 26,
    height: 26,

    borderRadius: 8,

    backgroundColor: "#FFF0EF",

    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     SUMMARY
  ======================================================= */

  summaryCard: {
    width: "100%",

    alignSelf: "flex-end",

    backgroundColor: "#FFFFFF",

    borderRadius: 14,

    paddingHorizontal: 14,
    paddingVertical: 12,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#E7ECEF",
  },

  summaryRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 7,
  },

  summaryLabel: {
    color: "#4C5963",

    fontSize: 9.5,
  },

  summaryValue: {
    color: "#203141",

    fontSize: 9.5,

    fontWeight: "900",
  },

  summaryDivider: {
    height: 1,

    backgroundColor: "#E3E8EC",

    marginBottom: 7,
  },

  totalRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",
  },

  totalLabel: {
    color: "#152333",

    fontSize: 13,

    fontWeight: "900",
  },

  totalValue: {
    color: "#152333",

    fontSize: 13,

    fontWeight: "900",
  },

  /* =======================================================
     NOTES
  ======================================================= */

  notesInput: {
    minHeight: 66,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#D7E0E6",

    borderRadius: 11,

    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 9,

    color: "#253544",

    fontSize: 12,
  },

  /* =======================================================
     ACTIONS
  ======================================================= */

  actionRow: {
    flexDirection: "row",

    justifyContent: "flex-end",

    alignItems: "center",

    gap: 8,

    marginTop: 2,
  },

  cancelButton: {
    minHeight: 43,

    paddingHorizontal: 17,

    backgroundColor: "#E8F6F4",

    borderRadius: 11,

    alignItems: "center",

    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#087E75",

    fontSize: 12,

    fontWeight: "900",
  },

  saveButton: {
    minHeight: 43,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    paddingHorizontal: 17,

    backgroundColor: "#0A968C",

    borderRadius: 11,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  saveButtonText: {
    color: "#FFFFFF",

    fontSize: 12,

    fontWeight: "900",
  },
});