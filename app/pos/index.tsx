import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { loadCustomers } from '../../src/services/customerService';
import { loadProducts } from '../../src/services/productService';
import { saveSale } from '../../src/services/saleService';

import type { Customer } from '../../src/types/customer';
import type { Product } from '../../src/types/product';
import type {
  PaymentMethod,
  PaymentStatus,
} from '../../src/types/sale';

import { colors } from '../../src/theme/colors';

type CartItem = {
  product: Product;
  quantity: number;
};

const PAYMENT_METHODS: {
  label: string;
  value: PaymentMethod;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Cash',
    value: 'CASH',
    icon: 'cash-outline',
  },
  {
    label: 'UPI',
    value: 'UPI',
    icon: 'phone-portrait-outline',
  },
  {
    label: 'Card',
    value: 'CARD',
    icon: 'card-outline',
  },
  {
    label: 'Cheque',
    value: 'CHEQUE',
    icon: 'document-text-outline',
  },
  {
    label: 'Credit',
    value: 'CREDIT',
    icon: 'time-outline',
  },
];

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
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

export default function POSScreen() {
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 700;

  const [products, setProducts] =
    useState<Product[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [search, setSearch] =
    useState('');

  const [customerSearch, setCustomerSearch] =
    useState('');

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [showCustomers, setShowCustomers] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('CASH');

  const [paidAmount, setPaidAmount] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loadedProducts, loadedCustomers] =
        await Promise.all([
          loadProducts(),
          loadCustomers(),
        ]);

      setProducts(loadedProducts);
      setCustomers(loadedCustomers);
    } catch (error) {
      Alert.alert(
        'Unable to load POS',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filteredProducts = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return products.slice(0, 20);
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
      .slice(0, 20);
  }, [products, search]);

  const filteredCustomers = useMemo(() => {
    const query =
      customerSearch.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 10);
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
      .slice(0, 10);
  }, [customers, customerSearch]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      return (
        sum +
        item.product.salePrice *
          item.quantity
      );
    }, 0);
  }, [cart]);

  const gstAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      return (
        sum +
        calculateItem(item).gstAmount
      );
    }, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  const numericPaidAmount =
    Number(paidAmount) || 0;

  const dueAmount = Math.max(
    totalAmount - numericPaidAmount,
    0,
  );

  const paymentStatus: PaymentStatus =
    numericPaidAmount >= totalAmount
      ? 'PAID'
      : numericPaidAmount > 0
        ? 'PARTIAL'
        : 'DUE';

  const addProduct = (product: Product) => {
    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.product.id ===
            product.id,
        );

      if (existing) {
        return current.map((item) =>
          item.product.id ===
          product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
        },
      ];
    });

    setSearch('');
  };

  const updateQuantity = (
    productId: string,
    quantity: number,
  ) => {
    if (quantity <= 0) {
      setCart((current) =>
        current.filter(
          (item) =>
            item.product.id !==
            productId,
        ),
      );
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product.id ===
        productId
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  };

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

  const selectCustomer = (
    customer: Customer,
  ) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomers(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const handleSaveSale = async () => {
    if (!cart.length) {
      Alert.alert(
        'Add products',
        'Please add at least one product to the sale.',
      );
      return;
    }

    if (numericPaidAmount > totalAmount) {
      Alert.alert(
        'Invalid payment',
        'Paid amount cannot be greater than the sale total.',
      );
      return;
    }

    if (
      paymentMethod === 'CREDIT' &&
      numericPaidAmount >= totalAmount
    ) {
      Alert.alert(
        'Payment method',
        'Credit sales should have an outstanding amount.',
      );
      return;
    }

    try {
      setSaving(true);

      const saleItems = cart.map(
        (item) => {
          const calculated =
            calculateItem(item);

          return {
            productId:
              item.product.id,
            quantity:
              item.quantity,
            unitPrice:
              item.product.salePrice,
            gstRate:
              item.product.gstRate,
            gstAmount:
              calculated.gstAmount,
            discount: 0,
            totalAmount:
              calculated.totalAmount,
          };
        },
      );

      const sale =
        await saveSale({
          customerId:
            selectedCustomer?.id,
          saleDate:
            todayString(),
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
            notes.trim() || undefined,
          items: saleItems,
        });

      Alert.alert(
        'Sale saved',
        `Sale total ${formatCurrency(
          sale.totalAmount,
        )} has been saved successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setPaidAmount('');
              setNotes('');
              setSelectedCustomer(null);
              setPaymentMethod('CASH');
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Unable to save sale',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.navy}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              POS Sale
            </Text>
            <Text style={styles.headerSubtitle}>
              Create GST invoice and counter sale
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="cart-outline"
              size={22}
              color="#FFFFFF"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            isLargeScreen &&
              styles.contentLarge,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.mainLayout,
              isLargeScreen &&
                styles.mainLayoutLarge,
            ]}
          >
            <View
              style={[
                styles.leftColumn,
                isLargeScreen &&
                  styles.leftColumnLarge,
              ]}
            >
              {/* CUSTOMER */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View
                    style={styles.sectionIcon}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.teal}
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Customer
                    </Text>
                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Select party for this sale
                    </Text>
                  </View>
                </View>

                {selectedCustomer ? (
                  <View
                    style={
                      styles.selectedCustomer
                    }
                  >
                    <View
                      style={
                        styles.customerAvatar
                      }
                    >
                      <Text
                        style={
                          styles.customerAvatarText
                        }
                      >
                        {selectedCustomer.name
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.customerInfo
                      }
                    >
                      <Text
                        style={
                          styles.customerName
                        }
                      >
                        {selectedCustomer.name}
                      </Text>

                      <Text
                        style={
                          styles.customerMobile
                        }
                      >
                        {selectedCustomer.mobile}
                      </Text>
                    </View>

                    <Pressable
                      onPress={
                        clearCustomer
                      }
                      style={
                        styles.clearButton
                      }
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={colors.red}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View
                      style={styles.inputWrapper}
                    >
                      <Ionicons
                        name="search-outline"
                        size={18}
                        color={colors.muted}
                      />

                      <TextInput
                        value={
                          customerSearch
                        }
                        onChangeText={(text) => {
                          setCustomerSearch(
                            text,
                          );
                          setShowCustomers(
                            true,
                          );
                        }}
                        onFocus={() =>
                          setShowCustomers(
                            true,
                          )
                        }
                        placeholder="Search customer or mobile"
                        placeholderTextColor={
                          colors.muted
                        }
                        style={styles.input}
                      />
                    </View>

                    {showCustomers && (
                      <View
                        style={
                          styles.customerResults
                        }
                      >
                        <Pressable
                          style={
                            styles.walkInRow
                          }
                          onPress={() => {
                            setSelectedCustomer(
                              null,
                            );
                            setCustomerSearch(
                              '',
                            );
                            setShowCustomers(
                              false,
                            );
                          }}
                        >
                          <View
                            style={
                              styles.walkInIcon
                            }
                          >
                            <Ionicons
                              name="person"
                              size={18}
                              color={
                                colors.teal
                              }
                            />
                          </View>

                          <View>
                            <Text
                              style={
                                styles.resultName
                              }
                            >
                              Walk-in Customer
                            </Text>
                            <Text
                              style={
                                styles.resultMeta
                              }
                            >
                              Cash counter customer
                            </Text>
                          </View>
                        </Pressable>

                        {filteredCustomers.map(
                          (customer) => (
                            <Pressable
                              key={
                                customer.id
                              }
                              style={
                                styles.customerResult
                              }
                              onPress={() =>
                                selectCustomer(
                                  customer,
                                )
                              }
                            >
                              <View
                                style={
                                  styles.smallAvatar
                                }
                              >
                                <Text
                                  style={
                                    styles.smallAvatarText
                                  }
                                >
                                  {customer.name
                                    .charAt(
                                      0,
                                    )
                                    .toUpperCase()}
                                </Text>
                              </View>

                              <View
                                style={
                                  styles.resultInfo
                                }
                              >
                                <Text
                                  style={
                                    styles.resultName
                                  }
                                >
                                  {
                                    customer.name
                                  }
                                </Text>
                                <Text
                                  style={
                                    styles.resultMeta
                                  }
                                >
                                  {
                                    customer.mobile
                                  }
                                </Text>
                              </View>
                            </Pressable>
                          ),
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* PRODUCT SEARCH */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View
                    style={styles.sectionIcon}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={18}
                      color={colors.teal}
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Add Products
                    </Text>
                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Search products and add to cart
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.searchContainer}
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={colors.muted}
                  />

                  <TextInput
                    value={search}
                    onChangeText={
                      setSearch
                    }
                    placeholder="Search product, barcode or HSN"
                    placeholderTextColor={
                      colors.muted
                    }
                    style={styles.input}
                  />
                </View>

                <View
                  style={styles.productList}
                >
                  {filteredProducts.length ===
                  0 ? (
                    <View
                      style={
                        styles.emptyProducts
                      }
                    >
                      <Ionicons
                        name="cube-outline"
                        size={30}
                        color={colors.muted}
                      />

                      <Text
                        style={
                          styles.emptyTitle
                        }
                      >
                        No products found
                      </Text>

                      <Text
                        style={
                          styles.emptyText
                        }
                      >
                        Add products first from Products.
                      </Text>
                    </View>
                  ) : (
                    filteredProducts.map(
                      (product) => (
                        <Pressable
                          key={product.id}
                          style={
                            styles.productRow
                          }
                          onPress={() =>
                            addProduct(
                              product,
                            )
                          }
                        >
                          <View
                            style={
                              styles.productIcon
                            }
                          >
                            <Ionicons
                              name="cube"
                              size={18}
                              color={
                                colors.teal
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.productInfo
                            }
                          >
                            <Text
                              style={
                                styles.productName
                              }
                              numberOfLines={1}
                            >
                              {product.name}
                            </Text>

                            <Text
                              style={
                                styles.productMeta
                              }
                            >
                              {product.unit}
                              {'  •  '}
                              GST {product.gstRate}%
                              {product.barcode
                                ? `  •  ${product.barcode}`
                                : ''}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.productPrice
                            }
                          >
                            <Text
                              style={
                                styles.priceText
                              }
                            >
                              {formatCurrency(
                                product.salePrice,
                              )}
                            </Text>

                            <View
                              style={
                                styles.addIcon
                              }
                            >
                              <Ionicons
                                name="add"
                                size={18}
                                color="#FFFFFF"
                              />
                            </View>
                          </View>
                        </Pressable>
                      ),
                    )
                  )}
                </View>
              </View>

              {/* CART */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View
                    style={styles.sectionIcon}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={18}
                      color={colors.teal}
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Current Sale
                    </Text>
                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      {cart.length} item
                      {cart.length === 1
                        ? ''
                        : 's'} in cart
                    </Text>
                  </View>
                </View>

                {cart.length === 0 ? (
                  <View
                    style={
                      styles.emptyCart
                    }
                  >
                    <Ionicons
                      name="cart-outline"
                      size={38}
                      color={colors.line}
                    />

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      Cart is empty
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Search and tap a product above to add it.
                    </Text>
                  </View>
                ) : (
                  cart.map((item) => {
                    const calculated =
                      calculateItem(item);

                    return (
                      <View
                        key={
                          item.product.id
                        }
                        style={
                          styles.cartRow
                        }
                      >
                        <View
                          style={
                            styles.cartProductInfo
                          }
                        >
                          <Text
                            style={
                              styles.cartProductName
                            }
                            numberOfLines={1}
                          >
                            {item.product.name}
                          </Text>

                          <Text
                            style={
                              styles.cartProductMeta
                            }
                          >
                            {formatCurrency(
                              item.product.salePrice,
                            )}{' '}
                            × {item.quantity}
                            {'  •  '}
                            GST {item.product.gstRate}%
                          </Text>
                        </View>

                        <View
                          style={
                            styles.quantityControl
                          }
                        >
                          <Pressable
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity -
                                  1,
                              )
                            }
                          >
                            <Ionicons
                              name="remove"
                              size={15}
                              color={
                                colors.navy
                              }
                            />
                          </Pressable>

                          <Text
                            style={
                              styles.quantityText
                            }
                          >
                            {item.quantity}
                          </Text>

                          <Pressable
                            style={
                              styles.quantityButton
                            }
                            onPress={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity +
                                  1,
                              )
                            }
                          >
                            <Ionicons
                              name="add"
                              size={15}
                              color={
                                colors.navy
                              }
                            />
                          </Pressable>
                        </View>

                        <View
                          style={
                            styles.cartAmount
                          }
                        >
                          <Text
                            style={
                              styles.cartTotal
                            }
                          >
                            {formatCurrency(
                              calculated.totalAmount,
                            )}
                          </Text>

                          <Pressable
                            onPress={() =>
                              removeItem(
                                item.product.id,
                              )
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color={
                                colors.red
                              }
                            />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* RIGHT / SUMMARY */}
            <View
              style={[
                styles.rightColumn,
                isLargeScreen &&
                  styles.rightColumnLarge,
              ]}
            >
              {/* TOTALS */}
              <View style={styles.summaryCard}>
                <Text
                  style={styles.summaryTitle}
                >
                  Sale Summary
                </Text>

                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Subtotal
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
                  style={styles.summaryRow}
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
                  style={styles.summaryDivider}
                />

                <View
                  style={styles.totalRow}
                >
                  <Text
                    style={styles.totalLabel}
                  >
                    Total
                  </Text>

                  <Text
                    style={styles.totalValue}
                  >
                    {formatCurrency(
                      totalAmount,
                    )}
                  </Text>
                </View>
              </View>

              {/* PAYMENT */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View
                    style={styles.sectionIcon}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={18}
                      color={colors.teal}
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Payment
                    </Text>
                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Select payment method
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.paymentGrid}
                >
                  {PAYMENT_METHODS.map(
                    (method) => {
                      const active =
                        paymentMethod ===
                        method.value;

                      return (
                        <Pressable
                          key={
                            method.value
                          }
                          style={[
                            styles.paymentMethod,
                            active &&
                              styles.paymentMethodActive,
                          ]}
                          onPress={() =>
                            setPaymentMethod(
                              method.value,
                            )
                          }
                        >
                          <Ionicons
                            name={
                              method.icon
                            }
                            size={19}
                            color={
                              active
                                ? colors.teal
                                : colors.muted
                            }
                          />

                          <Text
                            style={[
                              styles.paymentLabel,
                              active &&
                                styles.paymentLabelActive,
                            ]}
                          >
                            {method.label}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>

                <Text
                  style={styles.fieldLabel}
                >
                  Amount Paid
                </Text>

                <View
                  style={styles.amountInput}
                >
                  <Text
                    style={
                      styles.currencyPrefix
                    }
                  >
                    ₹
                  </Text>

                  <TextInput
                    value={paidAmount}
                    onChangeText={
                      setPaidAmount
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={
                      colors.muted
                    }
                    style={
                      styles.amountTextInput
                    }
                  />

                  <Pressable
                    onPress={() =>
                      setPaidAmount(
                        totalAmount.toFixed(
                          2,
                        ),
                      )
                    }
                    style={
                      styles.fullPaidButton
                    }
                  >
                    <Text
                      style={
                        styles.fullPaidText
                      }
                    >
                      FULL
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={styles.paymentStatusBox}
                >
                  <View>
                    <Text
                      style={
                        styles.statusLabel
                      }
                    >
                      Payment Status
                    </Text>

                    <Text
                      style={
                        styles.statusValue
                      }
                    >
                      {paymentStatus}
                    </Text>
                  </View>

                  <View
                    style={styles.dueBlock}
                  >
                    <Text
                      style={
                        styles.statusLabel
                      }
                    >
                      Due
                    </Text>

                    <Text
                      style={[
                        styles.dueValue,
                        dueAmount === 0 &&
                          styles.paidValue,
                      ]}
                    >
                      {formatCurrency(
                        dueAmount,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* NOTES */}
              <View style={styles.card}>
                <Text
                  style={styles.fieldLabel}
                >
                  Notes
                </Text>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional sale notes"
                  placeholderTextColor={
                    colors.muted
                  }
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
              </View>

              {/* SAVE */}
              <Pressable
                style={[
                  styles.saveButton,
                  (saving ||
                    !cart.length) &&
                    styles.saveButtonDisabled,
                ]}
                disabled={
                  saving || !cart.length
                }
                onPress={
                  handleSaveSale
                }
              >
                <Ionicons
                  name={
                    saving
                      ? 'hourglass-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={21}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {saving
                    ? 'Saving Sale...'
                    : 'Save Sale'}
                </Text>
              </Pressable>

              <Text
                style={styles.invoiceHint}
              >
                Sale will be stored locally in this device.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  flex: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingBottom: 30,
  },

  contentLarge: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1200,
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainLayout: {
    gap: 14,
  },

  mainLayoutLarge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  leftColumn: {
    gap: 14,
  },

  leftColumnLarge: {
    flex: 1.55,
  },

  rightColumn: {
    gap: 14,
  },

  rightColumnLarge: {
    flex: 0.9,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  inputWrapper: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
  },

  searchContainer: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
  },

  input: {
    flex: 1,
    minHeight: 44,
    marginLeft: 9,
    color: colors.ink,
    fontSize: 13,
  },

  customerResults: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    overflow: 'hidden',
  },

  walkInRow: {
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4FAF9',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  walkInIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DDF2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  customerResult: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: '#FFFFFF',
  },

  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF1F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  smallAvatarText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  resultInfo: {
    flex: 1,
  },

  resultName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },

  resultMeta: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  selectedCustomer: {
    minHeight: 58,
    borderRadius: 13,
    backgroundColor: '#F3FAF8',
    borderWidth: 1,
    borderColor: '#D6ECE8',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
  },

  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  customerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  customerMobile: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productList: {
    marginTop: 8,
  },

  productRow: {
    minHeight: 62,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E8F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },

  productMeta: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },

  productPrice: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  priceText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },

  addIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyProducts: {
    paddingVertical: 28,
    alignItems: 'center',
  },

  emptyCart: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },

  cartRow: {
    minHeight: 68,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  cartProductInfo: {
    flex: 1,
    minWidth: 0,
  },

  cartProductName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },

  cartProductMeta: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 7,
  },

  quantityButton: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: '#F0F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityText: {
    minWidth: 28,
    textAlign: 'center',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },

  cartAmount: {
    alignItems: 'flex-end',
    minWidth: 76,
  },

  cartTotal: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },

  summaryCard: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    padding: 17,
  },

  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  summaryLabel: {
    color: '#C9D9E2',
    fontSize: 11,
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 5,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },

  totalLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  totalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 15,
  },

  paymentMethod: {
    minWidth: 72,
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  paymentMethodActive: {
    backgroundColor: '#E8F6F4',
    borderColor: colors.teal,
  },

  paymentLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },

  paymentLabelActive: {
    color: colors.teal,
  },

  fieldLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },

  amountInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    backgroundColor: '#FAFCFD',
  },

  currencyPrefix: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  amountTextInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 8,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },

  fullPaidButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E8F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  fullPaidText: {
    color: colors.teal,
    fontSize: 9,
    fontWeight: '900',
  },

  paymentStatusBox: {
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#F5F8FA',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusLabel: {
    color: colors.muted,
    fontSize: 9,
  },

  statusValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  dueBlock: {
    alignItems: 'flex-end',
  },

  dueValue: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },

  paidValue: {
    color: colors.green,
  },

  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 11,
    color: colors.ink,
    fontSize: 12,
    backgroundColor: '#FAFCFD',
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  invoiceHint: {
    color: colors.muted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: -5,
  },
});