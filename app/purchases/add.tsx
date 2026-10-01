import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../src/theme/colors';
import { loadProducts } from '../../src/services/productService';
import { loadVendors } from '../../src/services/vendorService';
import type { Product } from '../../src/types/product';
import type { Vendor } from '../../src/types/vendor';

type ProductOption = {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  purchasePrice: number;
  gstRate: number;
  availableStock: number;
};

type PurchaseItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  discount: string;
  unit: string;
  hsn: string;
  availableStock: number;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AddPurchaseScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [vendor, setVendor] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
   * Load real vendors and products from SQLite.
   *
   * The service layer is responsible for
   * resolving the current business.
   */
  useEffect(() => {
    let mounted = true;

    const loadPurchaseData = async () => {
      try {
        setLoadingData(true);

        const [vendorData, productData] = await Promise.all([
          loadVendors(),
          loadProducts(),
        ]);

        if (!mounted) {
          return;
        }

        setVendors(vendorData);

        const mappedProducts: ProductOption[] = productData.map(
          product => ({
            id: product.id,
            name: product.name,
            hsn: product.hsn ?? '',
            unit: product.unit,
            purchasePrice: Number(product.purchasePrice) || 0,
            gstRate: Number(product.gstRate) || 0,
            availableStock: Number(product.openingStock) || 0,
          }),
        );

        setProducts(mappedProducts);
      } catch (error) {
        console.error(
          'Failed to load purchase data:',
          error,
        );

        if (mounted) {
          Alert.alert(
            'Unable to load data',
            'Products or vendors could not be loaded.',
          );
        }
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    };

    loadPurchaseData();

    return () => {
      mounted = false;
    };
  }, []);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let gstAmount = 0;
    let discount = 0;

    items.forEach(item => {
      const quantity =
        Number(item.quantity) || 0;

      const unitPrice =
        Number(item.unitPrice) || 0;

      const gstRate =
        Number(item.gstRate) || 0;

      const itemDiscount =
        Number(item.discount) || 0;

      const gross =
        quantity * unitPrice;

      const taxableAmount =
        Math.max(
          gross - itemDiscount,
          0,
        );

      subtotal += taxableAmount;
      discount += itemDiscount;

      gstAmount +=
        (taxableAmount * gstRate) / 100;
    });

    const totalAmount =
      subtotal + gstAmount;

    const paid = Math.max(
      Number(paidAmount) || 0,
      0,
    );

    const due = Math.max(
      totalAmount - paid,
      0,
    );

    let paymentStatus:
      | 'UNPAID'
      | 'PARTIAL'
      | 'PAID' = 'UNPAID';

    if (
      paid > 0 &&
      paid < totalAmount
    ) {
      paymentStatus = 'PARTIAL';
    }

    if (
      totalAmount > 0 &&
      paid >= totalAmount
    ) {
      paymentStatus = 'PAID';
    }

    return {
      subtotal,
      gstAmount,
      discount,
      totalAmount,
      paid,
      due,
      paymentStatus,
    };
  }, [items, paidAmount]);

  const updateItem = (
    id: string,
    field: keyof PurchaseItem,
    value: string,
  ) => {
    setItems(current =>
      current.map(item =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  /*
   * Current inventory is NOT a purchase limit.
   *
   * Example:
   * Current stock = 24
   * Purchase quantity = 10
   * Resulting stock = 34
   *
   * The availableStock value is kept only
   * for display/reference purposes.
   */
  const addProductToPurchase = (
    product: ProductOption,
  ) => {
    if (!vendor) {
      Alert.alert(
        'Select Vendor',
        'Please select a vendor before selecting a product.',
      );
      return;
    }

    const existingItem = items.find(
      item =>
        item.productId === product.id,
    );

    const currentQuantity =
      Number(existingItem?.quantity) || 0;

    if (existingItem) {
      updateItem(
        existingItem.id,
        'quantity',
        String(currentQuantity + 1),
      );
    } else {
      setItems(current => [
        ...current,
        {
          id: `item_${Date.now()}_${Math.random()}`,
          productId: product.id,
          productName: product.name,
          quantity: '1',
          unitPrice: String(
            product.purchasePrice,
          ),
          gstRate: String(
            product.gstRate,
          ),
          discount: '0',
          unit: product.unit,
          hsn: product.hsn,
          availableStock:
            product.availableStock,
        },
      ]);
    }

    setProductSearch('');
  };

  const removeItem = (id: string) => {
    setItems(current =>
      current.filter(
        item => item.id !== id,
      ),
    );
  };

  const getSelectedQuantity = (
    productId: string,
  ) => {
    const item = items.find(
      current =>
        current.productId ===
        productId,
    );

    return (
      Number(item?.quantity) || 0
    );
  };

  const filteredProducts = useMemo(() => {
    const search =
      productSearch
        .trim()
        .toLowerCase();

    if (!vendor || !search) {
      return [];
    }

    return products.filter(
      product =>
        product.name
          .toLowerCase()
          .includes(search) ||
        product.hsn
          .toLowerCase()
          .includes(search),
    );
  }, [
    products,
    productSearch,
    vendor,
  ]);

  const filteredVendors = useMemo(() => {
    const search =
      vendorSearch
        .trim()
        .toLowerCase();

    if (!search) {
      return vendors.slice(0, 8);
    }

    return vendors
      .filter(item => {
        const nameMatch =
          item.name
            .toLowerCase()
            .includes(search);

        const mobileMatch =
          item.mobile
            ?.toLowerCase()
            .includes(search);

        const gstinMatch =
          item.gstin
            ?.toLowerCase()
            .includes(search);

        return (
          nameMatch ||
          mobileMatch ||
          gstinMatch
        );
      })
      .slice(0, 8);
  }, [
    vendors,
    vendorSearch,
  ]);

  const selectedVendor = useMemo(
    () =>
      vendors.find(
        item =>
          item.id === vendor,
      ) ?? null,
    [vendors, vendor],
  );

  const selectVendor = (
    selected: Vendor,
  ) => {
    setVendor(selected.id);
    setVendorSearch(selected.name);
    setVendorDropdownOpen(false);
    setProductSearch('');
    setItems([]);
  };

  const handleSave = async () => {
    if (!vendor.trim()) {
      Alert.alert(
        'Required',
        'Please select a vendor.',
      );
      return;
    }

    if (!invoiceNumber.trim()) {
      Alert.alert(
        'Required',
        'Please enter the invoice number.',
      );
      return;
    }

    if (!purchaseDate.trim()) {
      Alert.alert(
        'Required',
        'Please enter the purchase date.',
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert(
        'Required',
        'Please add at least one product.',
      );
      return;
    }

    if (
      calculations.totalAmount <= 0
    ) {
      Alert.alert(
        'Invalid purchase',
        'Purchase total must be greater than zero.',
      );
      return;
    }

    if (
      calculations.paid >
      calculations.totalAmount
    ) {
      Alert.alert(
        'Invalid payment',
        'Paid amount cannot be greater than the purchase total.',
      );
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);

    try {
      /*
       * UI-only for this step.
       *
       * The next step will connect this form
       * to purchaseService.savePurchase().
       *
       * Expected final flow:
       *
       * Vendor
       *   ↓
       * Purchase Bill
       *   ↓
       * Purchase Items
       *   ↓
       * Save Purchase
       *   ↓
       * Increase Inventory
       *   ↓
       * Create Inventory Movement
       */

      Alert.alert(
        'Purchase',
        'Purchase form is ready to connect.',
      );

      router.back();
    } catch (error) {
      console.error(
        'Failed to save purchase:',
        error,
      );

      Alert.alert(
        'Unable to save purchase',
        'Something went wrong while saving the purchase.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={styles.backIcon}
              >
                ‹
              </Text>
            </Pressable>

            <View>
              <Text
                style={styles.headerTitle}
              >
                Add Purchase
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                Purchase bill and stock inward
              </Text>
            </View>
          </View>

          <View
            style={styles.logoCircle}
          >
            <Text
              style={styles.logoText}
            >
              CA
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            isWide &&
              styles.contentWide,
          ]}
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* Purchase Details */}
          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}
            >
              Purchase Details
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Enter the basic purchase information.
            </Text>

            <View
              style={
                isWide
                  ? styles.row
                  : undefined
              }
            >
              {/* Vendor */}
              <View
                style={[
                  styles.field,
                  isWide &&
                    styles.halfField,
                ]}
              >
                <Text
                  style={styles.label}
                >
                  Vendor{' '}
                  <Text
                    style={
                      styles.required
                    }
                  >
                    *
                  </Text>
                </Text>

                <View
                  style={
                    styles.vendorContainer
                  }
                >
                  <TextInput
                    value={
                      vendorSearch
                    }
                    onChangeText={value => {
                      setVendorSearch(
                        value,
                      );
                      setVendor('');
                      setVendorDropdownOpen(
                        true,
                      );
                    }}
                    onFocus={() =>
                      setVendorDropdownOpen(
                        true,
                      )
                    }
                    placeholder="Search vendor..."
                    placeholderTextColor={
                      colors.mutedText
                    }
                    style={
                      styles.input
                    }
                    editable={
                      !loadingData
                    }
                  />

                  {vendorDropdownOpen &&
                    !loadingData && (
                      <View
                        style={
                          styles.vendorSuggestions
                        }
                      >
                        {filteredVendors.length >
                        0 ? (
                          filteredVendors.map(
                            item => (
                              <Pressable
                                key={
                                  item.id
                                }
                                style={
                                  styles.vendorSuggestion
                                }
                                onPress={() =>
                                  selectVendor(
                                    item,
                                  )
                                }
                              >
                                <View
                                  style={
                                    styles.vendorSuggestionAvatar
                                  }
                                >
                                  <Text
                                    style={
                                      styles.vendorSuggestionAvatarText
                                    }
                                  >
                                    {item.name
                                      .charAt(
                                        0,
                                      )
                                      .toUpperCase()}
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.vendorSuggestionMain
                                  }
                                >
                                  <Text
                                    style={
                                      styles.vendorSuggestionName
                                    }
                                  >
                                    {
                                      item.name
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.vendorSuggestionMeta
                                    }
                                  >
                                    {item.mobile ||
                                      'No mobile'}
                                    {item.gstin
                                      ? ` • ${item.gstin}`
                                      : ''}
                                  </Text>
                                </View>
                              </Pressable>
                            ),
                          )
                        ) : (
                          <View
                            style={
                              styles.noVendorResult
                            }
                          >
                            <Text
                              style={
                                styles.noVendorResultText
                              }
                            >
                              No vendors found
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                </View>

                {selectedVendor && (
                  <View
                    style={
                      styles.selectedVendorInfo
                    }
                  >
                    <Text
                      style={
                        styles.selectedVendorText
                      }
                    >
                      Selected:{' '}
                      {
                        selectedVendor.name
                      }
                    </Text>

                    {selectedVendor.mobile ? (
                      <Text
                        style={
                          styles.selectedVendorMeta
                        }
                      >
                        {
                          selectedVendor.mobile
                        }
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Invoice Number */}
              <View
                style={[
                  styles.field,
                  isWide &&
                    styles.halfField,
                ]}
              >
                <Text
                  style={styles.label}
                >
                  Invoice Number{' '}
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
                    invoiceNumber
                  }
                  onChangeText={
                    setInvoiceNumber
                  }
                  placeholder="Enter invoice number"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />
              </View>
            </View>

            {/* Purchase Date */}
            <View style={styles.field}>
              <Text
                style={styles.label}
              >
                Purchase Date
              </Text>

              <TextInput
                value={
                  purchaseDate
                }
                onChangeText={
                  setPurchaseDate
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={
                  colors.mutedText
                }
                style={
                  styles.input
                }
              />
            </View>
          </View>

          {/* Purchase Items */}
          <View style={styles.card}>
            <View
              style={
                styles.sectionHeaderRow
              }
            >
              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Purchase Items
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Search and add products to this
                  purchase.
                </Text>
              </View>
            </View>

            {/* Loading */}
            {loadingData ? (
              <View
                style={
                  styles.loadingContainer
                }
              >
                <ActivityIndicator
                  size="small"
                  color={colors.teal}
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading products and vendors...
                </Text>
              </View>
            ) : null}

            {/* Product Search */}
            {!loadingData && (
              <>
                <View
                  style={
                    styles.searchContainer
                  }
                >
                  <Text
                    style={
                      styles.searchIcon
                    }
                  >
                    ⌕
                  </Text>

                  <TextInput
                    value={
                      productSearch
                    }
                    onChangeText={
                      setProductSearch
                    }
                    placeholder={
                      vendor
                        ? 'Search products...'
                        : 'Select a vendor first...'
                    }
                    placeholderTextColor={
                      colors.mutedText
                    }
                    style={
                      styles.searchInput
                    }
                    editable={
                      Boolean(vendor)
                    }
                  />

                  {productSearch.length >
                    0 && (
                    <Pressable
                      onPress={() =>
                        setProductSearch(
                          '',
                        )
                      }
                      style={
                        styles.clearSearchButton
                      }
                    >
                      <Text
                        style={
                          styles.clearSearchText
                        }
                      >
                        ×
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Product Suggestions */}
                {productSearch.trim()
                    .length > 0 &&
                  filteredProducts.length >
                    0 && (
                    <View
                      style={
                        styles.productSuggestions
                      }
                    >
                      {filteredProducts.map(
                        product => (
                          <Pressable
                            key={
                              product.id
                            }
                            style={
                              styles.productSuggestion
                            }
                            onPress={() =>
                              addProductToPurchase(
                                product,
                              )
                            }
                          >
                            <View
                              style={
                                styles.productSuggestionMain
                              }
                            >
                              <Text
                                style={
                                  styles.productSuggestionName
                                }
                              >
                                {
                                  product.name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.productSuggestionMeta
                                }
                              >
                                HSN{' '}
                                {product.hsn ||
                                  'N/A'}{' '}
                                • GST{' '}
                                {
                                  product.gstRate
                                }
                                % •{' '}
                                {
                                  product.unit
                                }
                              </Text>

                              <Text
                                style={
                                  styles.productSuggestionStock
                                }
                              >
                                Current stock:{' '}
                                {
                                  product.availableStock
                                }{' '}
                                {
                                  product.unit
                                }

                                {getSelectedQuantity(
                                  product.id,
                                ) > 0
                                  ? ` • Selected: ${getSelectedQuantity(
                                      product.id,
                                    )}`
                                  : ''}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.productSuggestionRight
                              }
                            >
                              <Text
                                style={
                                  styles.productSuggestionPrice
                                }
                              >
                                ₹
                                {
                                  product.purchasePrice
                                }
                              </Text>

                              <Text
                                style={
                                  styles.productSuggestionAction
                                }
                              >
                                + Add
                              </Text>
                            </View>
                          </Pressable>
                        ),
                      )}
                    </View>
                  )}

                {!vendor ? (
                  <View
                    style={
                      styles.vendorRequiredBox
                    }
                  >
                    <Text
                      style={
                        styles.vendorRequiredTitle
                      }
                    >
                      Select a vendor to add products
                    </Text>

                    <Text
                      style={
                        styles.vendorRequiredText
                      }
                    >
                      Once a vendor is selected,
                      search here to select products
                      for the purchase bill.
                    </Text>
                  </View>
                ) : null}

                {vendor &&
                  productSearch.trim()
                    .length > 0 &&
                  filteredProducts.length ===
                    0 && (
                    <View
                      style={
                        styles.noProductResult
                      }
                    >
                      <Text
                        style={
                          styles.noProductResultText
                        }
                      >
                        No products found for this search
                      </Text>
                    </View>
                  )}
              </>
            )}

            {/* Selected Items */}
            {items.length === 0 ? (
              <View
                style={
                  styles.emptyItems
                }
              >
                <View
                  style={
                    styles.emptyItemsIcon
                  }
                >
                  <Text
                    style={
                      styles.emptyItemsIconText
                    }
                  >
                    +
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyItemsTitle
                  }
                >
                  No items added
                </Text>

                <Text
                  style={
                    styles.emptyItemsText
                  }
                >
                  Search for a product above to add it
                  to this purchase.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.itemsList
                }
              >
                {items.map(
                  (item, index) => {
                    const quantity =
                      Number(
                        item.quantity,
                      ) || 0;

                    const unitPrice =
                      Number(
                        item.unitPrice,
                      ) || 0;

                    const gstRate =
                      Number(
                        item.gstRate,
                      ) || 0;

                    const discount =
                      Number(
                        item.discount,
                      ) || 0;

                    const taxableAmount =
                      Math.max(
                        quantity *
                          unitPrice -
                          discount,
                        0,
                      );

                    const gstAmount =
                      (taxableAmount *
                        gstRate) /
                      100;

                    const itemTotal =
                      taxableAmount +
                      gstAmount;

                    return (
                      <View
                        key={
                          item.id
                        }
                        style={
                          styles.cartItem
                        }
                      >
                        {/* Item Header */}
                        <View
                          style={
                            styles.cartItemHeader
                          }
                        >
                          <View
                            style={
                              styles.cartItemNumber
                            }
                          >
                            <Text
                              style={
                                styles.cartItemNumberText
                              }
                            >
                              {index +
                                1}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.cartItemInfo
                            }
                          >
                            <Text
                              style={
                                styles.cartItemName
                              }
                            >
                              {
                                item.productName
                              }
                            </Text>

                            <Text
                              style={
                                styles.cartItemMeta
                              }
                            >
                              HSN{' '}
                              {item.hsn ||
                                'N/A'}{' '}
                              • GST{' '}
                              {
                                item.gstRate
                              }
                              % •{' '}
                              {
                                item.unit
                              }
                            </Text>

                            <Text
                              style={
                                styles.cartStockText
                              }
                            >
                              Current stock:{' '}
                              {
                                item.availableStock
                              }{' '}
                              {
                                item.unit
                              }
                            </Text>
                          </View>

                          <Pressable
                            style={
                              styles.cartRemoveButton
                            }
                            onPress={() =>
                              removeItem(
                                item.id,
                              )
                            }
                          >
                            <Text
                              style={
                                styles.cartRemoveText
                              }
                            >
                              ×
                            </Text>
                          </Pressable>
                        </View>

                        {/* Item Controls */}
                        <View
                          style={[
                            styles.cartControls,
                            !isWide &&
                              styles.cartControlsMobile,
                          ]}
                        >
                          {/* Quantity */}
                          <View
                            style={
                              styles.cartControl
                            }
                          >
                            <Text
                              style={
                                styles.cartControlLabel
                              }
                            >
                              Quantity
                            </Text>

                            <View
                              style={
                                styles.quantityControl
                              }
                            >
                              <Pressable
                                style={
                                  styles.quantityButton
                                }
                                onPress={() => {
                                  const nextQuantity =
                                    Math.max(
                                      quantity -
                                        1,
                                      1,
                                    );

                                  updateItem(
                                    item.id,
                                    'quantity',
                                    String(
                                      nextQuantity,
                                    ),
                                  );
                                }}
                              >
                                <Text
                                  style={
                                    styles.quantityButtonText
                                  }
                                >
                                  −
                                </Text>
                              </Pressable>

                              <TextInput
                                value={
                                  item.quantity
                                }
                                onChangeText={value => {
                                  const cleaned =
                                    value.replace(
                                      /[^0-9.]/g,
                                      '',
                                    );

                                  updateItem(
                                    item.id,
                                    'quantity',
                                    cleaned,
                                  );
                                }}
                                keyboardType="numeric"
                                style={
                                  styles.quantityInput
                                }
                              />

                              <Pressable
                                style={
                                  styles.quantityButton
                                }
                                onPress={() => {
                                  const nextQuantity =
                                    quantity +
                                    1;

                                  updateItem(
                                    item.id,
                                    'quantity',
                                    String(
                                      nextQuantity,
                                    ),
                                  );
                                }}
                              >
                                <Text
                                  style={
                                    styles.quantityButtonText
                                  }
                                >
                                  +
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Purchase Price */}
                          <View
                            style={
                              styles.cartControl
                            }
                          >
                            <Text
                              style={
                                styles.cartControlLabel
                              }
                            >
                              Purchase Price
                            </Text>

                            <TextInput
                              value={
                                item.unitPrice
                              }
                              onChangeText={value =>
                                updateItem(
                                  item.id,
                                  'unitPrice',
                                  value.replace(
                                    /[^0-9.]/g,
                                    '',
                                  ),
                                )
                              }
                              keyboardType="numeric"
                              style={
                                styles.cartPriceInput
                              }
                            />
                          </View>

                          {/* GST */}
                          <View
                            style={
                              styles.cartControlSmall
                            }
                          >
                            <Text
                              style={
                                styles.cartControlLabel
                              }
                            >
                              GST
                            </Text>

                            <View
                              style={
                                styles.gstDisplay
                              }
                            >
                              <Text
                                style={
                                  styles.gstDisplayText
                                }
                              >
                                {
                                  item.gstRate
                                }
                                %
                              </Text>
                            </View>
                          </View>

                          {/* Amount */}
                          <View
                            style={[
                              styles.cartAmount,
                              !isWide &&
                                styles.cartAmountMobile,
                            ]}
                          >
                            <Text
                              style={
                                styles.cartControlLabel
                              }
                            >
                              Amount
                            </Text>

                            <Text
                              style={
                                styles.cartAmountValue
                              }
                            >
                              {formatCurrency(
                                itemTotal,
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  },
                )}
              </View>
            )}

            {/* Add More Items */}
            <Pressable
              style={
                styles.addMoreItemsButton
              }
              onPress={() =>
                setProductSearch('')
              }
            >
              <Text
                style={
                  styles.addMoreItemsIcon
                }
              >
                +
              </Text>

              <Text
                style={
                  styles.addMoreItemsText
                }
              >
                Add More Items
              </Text>
            </Pressable>
          </View>

          {/* Payment */}
          <View style={styles.card}>
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
              Record the amount paid against this
              purchase.
            </Text>

            <View
              style={
                isWide
                  ? styles.row
                  : undefined
              }
            >
              <View
                style={[
                  styles.field,
                  isWide &&
                    styles.halfField,
                ]}
              >
                <Text
                  style={styles.label}
                >
                  Paid Amount
                </Text>

                <TextInput
                  value={
                    paidAmount
                  }
                  onChangeText={
                    value =>
                      setPaidAmount(
                        value.replace(
                          /[^0-9.]/g,
                          '',
                        ),
                      )
                  }
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />
              </View>

              <View
                style={[
                  styles.field,
                  isWide &&
                    styles.halfField,
                ]}
              >
                <Text
                  style={styles.label}
                >
                  Payment Status
                </Text>

                <View
                  style={
                    styles.statusInput
                  }
                >
                  <Text
                    style={[
                      styles.statusText,
                      calculations.paymentStatus ===
                        'PAID' &&
                        styles.paidText,
                      calculations.paymentStatus ===
                        'PARTIAL' &&
                        styles.partialText,
                      calculations.paymentStatus ===
                        'UNPAID' &&
                        styles.unpaidText,
                    ]}
                  >
                    {
                      calculations.paymentStatus
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}
            >
              Notes
            </Text>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add purchase notes..."
              placeholderTextColor={
                colors.mutedText
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
              ]}
            />
          </View>

          {/* Summary */}
          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              Purchase Summary
            </Text>

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
                Subtotal
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatCurrency(
                  calculations.subtotal,
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
                Discount
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                -{' '}
                {formatCurrency(
                  calculations.discount,
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
                  calculations.gstAmount,
                )}
              </Text>
            </View>

            <View
              style={styles.divider}
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                Total Purchase
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                {formatCurrency(
                  calculations.totalAmount,
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
                Paid
              </Text>

              <Text
                style={
                  styles.paidValue
                }
              >
                {formatCurrency(
                  calculations.paid,
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
                Due
              </Text>

              <Text
                style={
                  styles.dueValue
                }
              >
                {formatCurrency(
                  calculations.due,
                )}
              </Text>
            </View>
          </View>

          {/* Save */}
          <View
            style={
              styles.actionContainer
            }
          >
            <Pressable
              style={
                styles.cancelButton
              }
              onPress={() =>
                router.back()
              }
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
              style={[
                styles.saveButton,
                saving &&
                  styles.saveButtonDisabled,
              ]}
              onPress={
                handleSave
              }
              disabled={saving}
            >
              <Text
                style={
                  styles.saveButtonText
                }
              >
                {saving
                  ? 'Saving...'
                  : 'Save Purchase'}
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.bottomSpace
            }
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  page: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: colors.text,
    marginTop: -3,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
  },

  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    padding: 16,
  },

  contentWide: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 12,
    color: colors.mutedText,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  field: {
    marginBottom: 14,
  },

  halfField: {
    flex: 1,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  required: {
    color: colors.error,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },

  /* Vendor */

  vendorContainer: {
    position: 'relative',
    zIndex: 20,
  },

  vendorSuggestions: {
    position: 'absolute',
    top: 51,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 8,
  },

  vendorSuggestion: {
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  vendorSuggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  vendorSuggestionAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  vendorSuggestionMain: {
    flex: 1,
  },

  vendorSuggestionName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  vendorSuggestionMeta: {
    marginTop: 3,
    fontSize: 11,
    color: colors.mutedText,
  },

  noVendorResult: {
    padding: 16,
    alignItems: 'center',
  },

  noVendorResultText: {
    color: colors.mutedText,
    fontSize: 12,
  },

  selectedVendorInfo: {
    marginTop: 7,
    paddingHorizontal: 3,
  },

  selectedVendorText: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '800',
  },

  selectedVendorMeta: {
    marginTop: 2,
    color: colors.mutedText,
    fontSize: 11,
  },

  loadingContainer: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.mutedText,
  },

  /* Search */

  searchContainer: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 8,
  },

  searchIcon: {
    fontSize: 23,
    color: colors.mutedText,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontSize: 14,
  },

  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearSearchText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 20,
  },

  productSuggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    marginBottom: 14,
  },

  productSuggestion: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  productSuggestionMain: {
    flex: 1,
  },

  productSuggestionName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  productSuggestionMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedText,
  },

  productSuggestionStock: {
    marginTop: 4,
    fontSize: 11,
    color: colors.success,
    fontWeight: '800',
  },

  productSuggestionRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  productSuggestionAction: {
    marginTop: 4,
    fontSize: 11,
    color: colors.teal,
    fontWeight: '800',
  },

  productSuggestionPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.teal,
  },

  vendorRequiredBox: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  vendorRequiredTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  vendorRequiredText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
  },

  noProductResult: {
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 14,
  },

  noProductResultText: {
    fontSize: 13,
    color: colors.mutedText,
  },

  /* Empty state */

  emptyItems: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },

  emptyItemsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyItemsIconText: {
    fontSize: 26,
    color: colors.teal,
    fontWeight: '700',
  },

  emptyItemsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  emptyItemsText: {
    marginTop: 5,
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    maxWidth: 360,
  },

  /* Cart */

  itemsList: {
    gap: 12,
  },

  cartItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.background,
    padding: 14,
  },

  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cartItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  cartItemNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  cartItemInfo: {
    flex: 1,
  },

  cartItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  cartItemMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedText,
  },

  cartStockText: {
    marginTop: 4,
    fontSize: 11,
    color: colors.success,
    fontWeight: '800',
  },

  cartRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartRemoveText: {
    color: colors.error,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },

  cartControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  cartControlsMobile: {
    flexWrap: 'wrap',
  },

  cartControl: {
    flex: 1,
    minWidth: 150,
  },

  cartControlSmall: {
    width: 80,
  },

  cartControlLabel: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedText,
  },

  quantityControl: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  quantityButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  quantityButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  quantityInput: {
    flex: 1,
    height: 42,
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  cartPriceInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  gstDisplay: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.card,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  gstDisplayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  cartAmount: {
    minWidth: 120,
    alignItems: 'flex-end',
  },

  cartAmountMobile: {
    alignItems: 'flex-start',
  },

  cartAmountValue: {
    height: 44,
    paddingTop: 11,
    color: colors.teal,
    fontSize: 15,
    fontWeight: '900',
  },

  addMoreItemsButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.teal,
    backgroundColor: '#f4fbfa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  addMoreItemsIcon: {
    fontSize: 20,
    color: colors.teal,
    fontWeight: '700',
  },

  addMoreItemsText: {
    fontSize: 13,
    color: colors.teal,
    fontWeight: '800',
  },

  /* Payment */

  statusInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },

  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },

  paidText: {
    color: colors.success,
  },

  partialText: {
    color: colors.warning,
  },

  unpaidText: {
    color: colors.error,
  },

  /* Summary */

  summaryCard: {
    backgroundColor: colors.teal,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  summaryLabel: {
    color: '#dbe6ed',
    fontSize: 13,
  },

  summaryValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    marginVertical: 8,
  },

  totalLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  totalValue: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '900',
  },

  paidValue: {
    color: '#8de0bd',
    fontSize: 13,
    fontWeight: '800',
  },

  dueValue: {
    color: '#ffb4ae',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Actions */

  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 10,
  },

  cancelButton: {
    minWidth: 110,
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  saveButton: {
    minWidth: 150,
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 30,
  },
});