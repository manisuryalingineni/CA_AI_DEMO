import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
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
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import { Picker } from '@react-native-picker/picker';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { colors } from '../../src/theme/colors';

import {
  loadPurchases,
  savePurchase,
} from '../../src/services/purchaseService';

import { loadVendors } from '../../src/services/vendorService';

import { loadProducts } from '../../src/services/productService';

import type {
  PurchaseListRow,
  PurchaseStatus,
  SupplyType,
} from '../../src/repositories/purchaseRepository';


/* =========================================================
   LOCAL TYPES
========================================================= */

type VendorOption = {
  id: string;
  name: string;
  state: string;
  gstin?: string;
};


type ProductOption = {
  id: string;
  name: string;
  hsn?: string;
  unit: string;
  purchasePrice: number;
  gstRate: number;
};


type PurchaseItem = {
  id: string;

  productId: string;

  productName: string;

  hsn: string;

  unit: string;

  quantity: string;

  unitPrice: string;

  gstRate: string;

  discount: string;
};


/* =========================================================
   HELPERS
========================================================= */

const todayIso = () =>
  new Date()
    .toISOString()
    .slice(0, 10);


const formatCurrency = (
  value: number,
) =>
  `₹${Number(value || 0).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;


/* =========================================================
   PURCHASE FORM
========================================================= */

interface PurchaseFormProps {
  visible: boolean;

  vendors: VendorOption[];

  products: ProductOption[];

  onClose: () => void;

  onSaved: () => Promise<void>;
}


function PurchaseForm({
  visible,
  vendors,
  products,
  onClose,
  onSaved,
}: PurchaseFormProps) {

  const { width } =
    useWindowDimensions();

  const isWide =
    width >= 760;


  /* =======================================================
     PURCHASE HEADER STATE
  ======================================================= */

  const [vendorId, setVendorId] =
    useState('');

  const [
    invoiceNumber,
    setInvoiceNumber,
  ] = useState('');

  const [
    purchaseDate,
    setPurchaseDate,
  ] = useState(todayIso());

  const [
    dueDate,
    setDueDate,
  ] = useState(todayIso());

  const [
    supplyType,
    setSupplyType,
  ] = useState<SupplyType>(
    'WITHIN_STATE',
  );

  const [
    counterBranch,
    setCounterBranch,
  ] = useState('');

  const [
    salesperson,
    setSalesperson,
  ] = useState('');

  const [
    deliveryMethod,
    setDeliveryMethod,
  ] = useState('');

  const [
    paidAmount,
    setPaidAmount,
  ] = useState('0');

  const [notes, setNotes] =
    useState('');

  const [saving, setSaving] =
    useState(false);


  /* =======================================================
     ADD LINE STATE
  ======================================================= */

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState('');

  const [
    lineQuantity,
    setLineQuantity,
  ] = useState('1');

  const [
    lineRate,
    setLineRate,
  ] = useState('');

  const [
    lineGstRate,
    setLineGstRate,
  ] = useState('');

  const [
    lineDiscount,
    setLineDiscount,
  ] = useState('0');

  const [items, setItems] =
    useState<PurchaseItem[]>([]);


  /* =======================================================
     CURRENT VENDOR / PRODUCT
  ======================================================= */

  const selectedVendor =
    vendors.find(
      vendor =>
        vendor.id === vendorId,
    );


  const selectedProduct =
    products.find(
      product =>
        product.id ===
        selectedProductId,
    );


  /*
   * Whenever product changes,
   * automatically fill purchase price
   * and GST.
   */

  useEffect(() => {

    if (!selectedProduct) {
      setLineRate('');
      setLineGstRate('');
      return;
    }

    setLineRate(
      String(
        selectedProduct.purchasePrice,
      ),
    );

    setLineGstRate(
      String(
        selectedProduct.gstRate,
      ),
    );

  }, [selectedProductId]);


  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm =
    useCallback(() => {

      setVendorId('');

      setInvoiceNumber('');

      setPurchaseDate(
        todayIso(),
      );

      setDueDate(
        todayIso(),
      );

      setSupplyType(
        'WITHIN_STATE',
      );

      setCounterBranch('');

      setSalesperson('');

      setDeliveryMethod('');

      setPaidAmount('0');

      setNotes('');

      setSelectedProductId('');

      setLineQuantity('1');

      setLineRate('');

      setLineGstRate('');

      setLineDiscount('0');

      setItems([]);

    }, []);


  useEffect(() => {

    if (visible) {
      resetForm();
    }

  }, [
    visible,
    resetForm,
  ]);


  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const calculations =
    useMemo(() => {

      let taxableValue = 0;

      let gstAmount = 0;

      let discount = 0;


      items.forEach(item => {

        const quantity =
          Number(
            item.quantity,
          ) || 0;

        const rate =
          Number(
            item.unitPrice,
          ) || 0;

        const gstRate =
          Number(
            item.gstRate,
          ) || 0;

        const itemDiscount =
          Number(
            item.discount,
          ) || 0;


        const gross =
          quantity * rate;


        const taxable =
          Math.max(
            gross -
              itemDiscount,
            0,
          );


        const gst =
          taxable *
          gstRate /
          100;


        taxableValue +=
          taxable;

        gstAmount +=
          gst;

        discount +=
          itemDiscount;

      });


      const totalAmount =
        taxableValue +
        gstAmount;


      const paid =
        Math.max(
          Number(
            paidAmount,
          ) || 0,
          0,
        );


      const due =
        Math.max(
          totalAmount -
            paid,
          0,
        );


      let paymentStatus:
        PurchaseStatus =
        'UNPAID';


      if (
        paid > 0 &&
        paid < totalAmount
      ) {
        paymentStatus =
          'PARTIAL';
      }


      if (
        totalAmount > 0 &&
        paid >= totalAmount
      ) {
        paymentStatus =
          'PAID';
      }


      let cgstAmount = 0;

      let sgstAmount = 0;

      let igstAmount = 0;


      if (
        supplyType ===
        'WITHIN_STATE'
      ) {

        cgstAmount =
          gstAmount / 2;

        sgstAmount =
          gstAmount / 2;

      } else {

        igstAmount =
          gstAmount;

      }


      return {

        taxableValue,

        gstAmount,

        cgstAmount,

        sgstAmount,

        igstAmount,

        discount,

        totalAmount,

        paid,

        due,

        paymentStatus,

      };

    }, [
      items,
      paidAmount,
      supplyType,
    ]);


  /* =======================================================
     ITEM HELPERS
  ======================================================= */

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
              [field]:
                value,
            }
          : item,
      ),
    );

  };


  const changeQuantity = (
    id: string,
    amount: number,
  ) => {

    setItems(current =>
      current.map(item => {

        if (
          item.id !== id
        ) {
          return item;
        }

        const currentQuantity =
          Number(
            item.quantity,
          ) || 1;

        const nextQuantity =
          Math.max(
            currentQuantity +
              amount,
            1,
          );

        return {
          ...item,
          quantity:
            String(
              nextQuantity,
            ),
        };

      }),
    );

  };


  const removeItem = (
    id: string,
  ) => {

    setItems(current =>
      current.filter(
        item =>
          item.id !== id,
      ),
    );

  };


  /* =======================================================
     ADD LINE
  ======================================================= */

  const handleAddLine = () => {

    if (!selectedProduct) {

      Alert.alert(
        'Product required',
        'Please select a product.',
      );

      return;
    }


    const quantity =
      Number(
        lineQuantity,
      ) || 0;


    const rate =
      Number(
        lineRate,
      ) || 0;


    const gstRate =
      Number(
        lineGstRate,
      ) || 0;


    const discount =
      Number(
        lineDiscount,
      ) || 0;


    if (
      quantity <= 0
    ) {

      Alert.alert(
        'Invalid quantity',
        'Quantity must be greater than zero.',
      );

      return;
    }


    if (
      rate < 0
    ) {

      Alert.alert(
        'Invalid rate',
        'Purchase rate cannot be negative.',
      );

      return;
    }


    const existing =
      items.find(
        item =>
          item.productId ===
          selectedProduct.id,
      );


    if (existing) {

      updateItem(
        existing.id,
        'quantity',
        String(
          (
            Number(
              existing.quantity,
            ) || 0
          ) + quantity,
        ),
      );

    } else {

      setItems(current => [
        ...current,

        {
          id:
            `line_${Date.now()}_${Math.random()}`,

          productId:
            selectedProduct.id,

          productName:
            selectedProduct.name,

          hsn:
            selectedProduct.hsn ??
            '',

          unit:
            selectedProduct.unit,

          quantity:
            String(
              quantity,
            ),

          unitPrice:
            String(
              rate,
            ),

          gstRate:
            String(
              gstRate,
            ),

          discount:
            String(
              discount,
            ),
        },
      ]);

    }


    /*
     * Prepare next line.
     */

    setSelectedProductId('');

    setLineQuantity('1');

    setLineRate('');

    setLineGstRate('');

    setLineDiscount('0');

  };


  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave =
    async () => {

      if (!vendorId) {

        Alert.alert(
          'Vendor required',
          'Please select a vendor.',
        );

        return;
      }


      if (!purchaseDate) {

        Alert.alert(
          'Date required',
          'Please enter the document date.',
        );

        return;
      }


      if (!dueDate) {

        Alert.alert(
          'Due date required',
          'Please enter the due date.',
        );

        return;
      }


      if (
        items.length === 0
      ) {

        Alert.alert(
          'Items required',
          'Please add at least one item.',
        );

        return;
      }


      if (
        calculations.totalAmount <=
        0
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
          'Paid amount cannot exceed purchase total.',
        );

        return;
      }


      if (saving) {
        return;
      }


      setSaving(true);


      try {

        await savePurchase({

          vendorId,

          invoiceNumber:
            invoiceNumber.trim() ||
            undefined,

          purchaseDate,

          dueDate,

          supplyType,

          counterBranch:
            counterBranch.trim() ||
            undefined,

          salesperson:
            salesperson.trim() ||
            undefined,

          deliveryMethod:
            deliveryMethod.trim() ||
            undefined,

          subtotal:
            calculations.taxableValue,

          gstAmount:
            calculations.gstAmount,

          cgstAmount:
            calculations.cgstAmount,

          sgstAmount:
            calculations.sgstAmount,

          igstAmount:
            calculations.igstAmount,

          discount:
            calculations.discount,

          totalAmount:
            calculations.totalAmount,

          paidAmount:
            calculations.paid,

          dueAmount:
            calculations.due,

          paymentStatus:
            calculations.paymentStatus,

          notes:
            notes.trim() ||
            undefined,

          items:
            items.map(item => {

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

              const itemDiscount =
                Number(
                  item.discount,
                ) || 0;


              const taxable =
                Math.max(
                  quantity *
                    unitPrice -
                    itemDiscount,
                  0,
                );


              const gstAmount =
                taxable *
                gstRate /
                100;


              const totalAmount =
                taxable +
                gstAmount;


              return {

                productId:
                  item.productId,

                productName:
                  item.productName,

                hsn:
                  item.hsn ||
                  undefined,

                unit:
                  item.unit ||
                  undefined,

                quantity,

                unitPrice,

                gstRate,

                gstAmount,

                discount:
                  itemDiscount,

                totalAmount,

              };

            }),

        });


        await onSaved();


        Alert.alert(
          'Purchase saved',
          'Purchase bill has been saved successfully.',
        );


        onClose();


      } catch (error) {

        Alert.alert(
          'Unable to save purchase',

          error instanceof Error
            ? error.message
            : 'Something went wrong.',
        );

      } finally {

        setSaving(false);

      }

    };


  /* =======================================================
     FORM
  ======================================================= */

  return (

    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >

      <SafeAreaView
        style={styles.formSafeArea}
        edges={[
          'top',
          'bottom',
        ]}
      >

        <KeyboardAvoidingView
          style={
            styles.formKeyboard
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <View
            style={
              styles.formScreen
            }
          >

            {/* FORM HEADER */}

            <View
              style={
                styles.formHeader
              }
            >

              <View
                style={
                  styles.formHeaderText
                }
              >

                <Text
                  style={
                    styles.formTitle
                  }
                >
                  Purchase bill
                </Text>

                <Text
                  style={
                    styles.formSubtitle
                  }
                >
                  Vendor and inward stock flow
                </Text>

              </View>


              <Pressable
                style={
                  styles.closeButton
                }
                onPress={
                  onClose
                }
                disabled={
                  saving
                }
              >

                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>

              </Pressable>

            </View>


            <ScrollView
              contentContainerStyle={[
                styles.formContent,

                isWide &&
                  styles.formContentWide,
              ]}
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >

              {/* INFO */}

              <View
                style={
                  styles.infoBanner
                }
              >

                <Text
                  style={
                    styles.infoBannerText
                  }
                >
                  Retail Shop fields are shown below.
                </Text>

              </View>


              {/* VENDOR */}

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
                  VENDOR *
                </Text>

                <View
                  style={
                    styles.pickerField
                  }
                >

                  <Picker
                    selectedValue={
                      vendorId
                    }
                    onValueChange={(
                      value: string,
                    ) =>
                      setVendorId(
                        value,
                      )
                    }
                    enabled={
                      !saving
                    }
                  >

                    <Picker.Item
                      label="Select vendor"
                      value=""
                    />

                    {vendors.map(
                      vendor => (

                        <Picker.Item
                          key={
                            vendor.id
                          }
                          label={
                            vendor.name
                          }
                          value={
                            vendor.id
                          }
                        />

                      ),
                    )}

                  </Picker>

                </View>

                {selectedVendor ? (

                  <Text
                    style={
                      styles.helperText
                    }
                  >
                    {selectedVendor.gstin
                      ? `GSTIN ${selectedVendor.gstin} • `
                      : ''
                    }
                    {selectedVendor.state}
                  </Text>

                ) : null}

              </View>


              {/* VENDOR INVOICE */}

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
                  VENDOR INVOICE / REFERENCE
                </Text>

                <TextInput
                  value={
                    invoiceNumber
                  }
                  onChangeText={
                    setInvoiceNumber
                  }
                  placeholder="Optional vendor invoice number"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />

              </View>


              {/* DATES */}

              <View
                style={[
                  styles.formRow,

                  !isWide &&
                    styles.formColumn,
                ]}
              >

                <View
                  style={
                    styles.formRowField
                  }
                >

                  <Text
                    style={
                      styles.label
                    }
                  >
                    DOCUMENT DATE
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


                <View
                  style={
                    styles.formRowField
                  }
                >

                  <Text
                    style={
                      styles.label
                    }
                  >
                    DUE DATE
                  </Text>

                  <TextInput
                    value={
                      dueDate
                    }
                    onChangeText={
                      setDueDate
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


              {/* SUPPLY */}

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
                  SUPPLY
                </Text>

                <View
                  style={
                    styles.pickerField
                  }
                >

                  <Picker
                    selectedValue={
                      supplyType
                    }
                    onValueChange={(
                      value:
                        SupplyType,
                    ) =>
                      setSupplyType(
                        value,
                      )
                    }
                  >

                    <Picker.Item
                      label="Within state (CGST + SGST)"
                      value="WITHIN_STATE"
                    />

                    <Picker.Item
                      label="Other State (IGST)"
                      value="OTHER_STATE"
                    />

                  </Picker>

                </View>

              </View>


              {/* OPTIONAL DETAILS */}

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
                  COUNTER OR BRANCH
                </Text>

                <TextInput
                  value={
                    counterBranch
                  }
                  onChangeText={
                    setCounterBranch
                  }
                  placeholder="Counter or branch"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />

              </View>


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
                  SALESPERSON
                </Text>

                <TextInput
                  value={
                    salesperson
                  }
                  onChangeText={
                    setSalesperson
                  }
                  placeholder="Salesperson"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />

              </View>


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
                  DELIVERY OR PICKUP
                </Text>

                <TextInput
                  value={
                    deliveryMethod
                  }
                  onChangeText={
                    setDeliveryMethod
                  }
                  placeholder="Delivery or pickup"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />

              </View>


              {/* ADD ITEM */}

              <View
                style={
                  styles.lineCard
                }
              >

                <Text
                  style={
                    styles.lineCardTitle
                  }
                >
                  Add item or service
                </Text>


                <Text
                  style={
                    styles.label
                  }
                >
                  ITEM
                </Text>

                <View
                  style={
                    styles.pickerField
                  }
                >

                  <Picker
                    selectedValue={
                      selectedProductId
                    }
                    onValueChange={(
                      value: string,
                    ) =>
                      setSelectedProductId(
                        value,
                      )
                    }
                  >

                    <Picker.Item
                      label="Select product"
                      value=""
                    />

                    {products.map(
                      product => (

                        <Picker.Item
                          key={
                            product.id
                          }
                          label={
                            `${product.name} • ${formatCurrency(
                              product.purchasePrice,
                            )}`
                          }
                          value={
                            product.id
                          }
                        />

                      ),
                    )}

                  </Picker>

                </View>


                <View
                  style={[
                    styles.formRow,

                    styles.lineRow,

                    !isWide &&
                      styles.formColumn,
                  ]}
                >

                  {/* QTY */}

                  <View
                    style={
                      styles.formRowField
                    }
                  >

                    <Text
                      style={
                        styles.label
                      }
                    >
                      QTY
                    </Text>

                    <View
                      style={
                        styles.quantityEditor
                      }
                    >

                      <Pressable
                        style={
                          styles.quantityButton
                        }
                        onPress={() => {

                          const current =
                            Number(
                              lineQuantity,
                            ) || 1;

                          setLineQuantity(
                            String(
                              Math.max(
                                current -
                                  1,
                                1,
                              ),
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
                          lineQuantity
                        }
                        onChangeText={
                          value =>
                            setLineQuantity(
                              value.replace(
                                /[^0-9.]/g,
                                '',
                              ),
                            )
                        }
                        keyboardType="decimal-pad"
                        style={
                          styles.quantityInput
                        }
                      />


                      <Pressable
                        style={
                          styles.quantityButton
                        }
                        onPress={() => {

                          const current =
                            Number(
                              lineQuantity,
                            ) || 0;

                          setLineQuantity(
                            String(
                              current +
                                1,
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


                  {/* RATE */}

                  <View
                    style={
                      styles.formRowField
                    }
                  >

                    <Text
                      style={
                        styles.label
                      }
                    >
                      RATE
                    </Text>

                    <TextInput
                      value={
                        lineRate
                      }
                      onChangeText={
                        value =>
                          setLineRate(
                            value.replace(
                              /[^0-9.]/g,
                              '',
                            ),
                          )
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={
                        colors.mutedText
                      }
                      style={
                        styles.input
                      }
                    />

                  </View>


                  {/* GST */}

                  <View
                    style={
                      styles.formRowField
                    }
                  >

                    <Text
                      style={
                        styles.label
                      }
                    >
                      GST %
                    </Text>

                    <TextInput
                      value={
                        lineGstRate
                      }
                      onChangeText={
                        value =>
                          setLineGstRate(
                            value.replace(
                              /[^0-9.]/g,
                              '',
                            ),
                          )
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={
                        colors.mutedText
                      }
                      style={
                        styles.input
                      }
                    />

                  </View>

                </View>


                <Pressable
                  style={
                    styles.addLineButton
                  }
                  onPress={
                    handleAddLine
                  }
                >

                  <Text
                    style={
                      styles.addLineButtonText
                    }
                  >
                    Add line
                  </Text>

                </Pressable>


                {items.length ===
                0 ? (

                  <Text
                    style={
                      styles.noLinesText
                    }
                  >
                    No lines added.
                  </Text>

                ) : (

                  <View
                    style={
                      styles.selectedItems
                    }
                  >

                    {items.map(
                      (
                        item,
                        index,
                      ) => {

                        const quantity =
                          Number(
                            item.quantity,
                          ) || 0;

                        const rate =
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

                        const taxable =
                          Math.max(
                            quantity *
                              rate -
                              discount,
                            0,
                          );

                        const gst =
                          taxable *
                          gstRate /
                          100;

                        const total =
                          taxable +
                          gst;


                        return (

                          <View
                            key={
                              item.id
                            }
                            style={
                              styles.itemCard
                            }
                          >

                            <View
                              style={
                                styles.itemTop
                              }
                            >

                              <View
                                style={{
                                  flex: 1,
                                }}
                              >

                                <Text
                                  style={
                                    styles.itemName
                                  }
                                >
                                  {index +
                                    1}
                                  .{' '}
                                  {
                                    item.productName
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.itemMeta
                                  }
                                >
                                  HSN{' '}
                                  {item.hsn ||
                                    '—'}
                                  {' • '}
                                  {item.unit ||
                                    'Unit'}
                                  {' • GST '}
                                  {
                                    item.gstRate
                                  }
                                  %
                                </Text>

                              </View>


                              <Pressable
                                style={
                                  styles.removeButton
                                }
                                onPress={() =>
                                  removeItem(
                                    item.id,
                                  )
                                }
                              >

                                <Text
                                  style={
                                    styles.removeButtonText
                                  }
                                >
                                  ×
                                </Text>

                              </Pressable>

                            </View>


                            <View
                              style={
                                styles.itemBottom
                              }
                            >

                              <View
                                style={
                                  styles.quantityEditor
                                }
                              >

                                <Pressable
                                  style={
                                    styles.quantityButton
                                  }
                                  onPress={() =>
                                    changeQuantity(
                                      item.id,
                                      -1,
                                    )
                                  }
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
                                  onChangeText={
                                    value =>
                                      updateItem(
                                        item.id,
                                        'quantity',
                                        value.replace(
                                          /[^0-9.]/g,
                                          '',
                                        ),
                                      )
                                  }
                                  keyboardType="decimal-pad"
                                  style={
                                    styles.quantityInput
                                  }
                                />


                                <Pressable
                                  style={
                                    styles.quantityButton
                                  }
                                  onPress={() =>
                                    changeQuantity(
                                      item.id,
                                      1,
                                    )
                                  }
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


                              <Text
                                style={
                                  styles.itemTotal
                                }
                              >
                                {formatCurrency(
                                  total,
                                )}
                              </Text>

                            </View>

                          </View>

                        );

                      },
                    )}

                  </View>

                )}

              </View>


              {/* TOTAL CARD */}

              <View
                style={
                  styles.totalCard
                }
              >

                <View
                  style={
                    styles.totalRow
                  }
                >

                  <Text
                    style={
                      styles.totalRowLabel
                    }
                  >
                    Taxable value
                  </Text>

                  <Text
                    style={
                      styles.totalRowValue
                    }
                  >
                    {formatCurrency(
                      calculations.taxableValue,
                    )}
                  </Text>

                </View>


                {supplyType ===
                'WITHIN_STATE' ? (

                  <>

                    <View
                      style={
                        styles.totalRow
                      }
                    >

                      <Text
                        style={
                          styles.totalRowLabel
                        }
                      >
                        CGST
                      </Text>

                      <Text
                        style={
                          styles.totalRowValue
                        }
                      >
                        {formatCurrency(
                          calculations.cgstAmount,
                        )}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.totalRow
                      }
                    >

                      <Text
                        style={
                          styles.totalRowLabel
                        }
                      >
                        SGST
                      </Text>

                      <Text
                        style={
                          styles.totalRowValue
                        }
                      >
                        {formatCurrency(
                          calculations.sgstAmount,
                        )}
                      </Text>

                    </View>

                  </>

                ) : (

                  <View
                    style={
                      styles.totalRow
                    }
                  >

                    <Text
                      style={
                        styles.totalRowLabel
                      }
                    >
                      IGST
                    </Text>

                    <Text
                      style={
                        styles.totalRowValue
                      }
                    >
                      {formatCurrency(
                        calculations.igstAmount,
                      )}
                    </Text>

                  </View>

                )}


                <View
                  style={
                    styles.totalDivider
                  }
                />


                <View
                  style={
                    styles.totalRow
                  }
                >

                  <Text
                    style={
                      styles.grandTotalLabel
                    }
                  >
                    Total
                  </Text>

                  <Text
                    style={
                      styles.grandTotalValue
                    }
                  >
                    {formatCurrency(
                      calculations.totalAmount,
                    )}
                  </Text>

                </View>

              </View>


              {/* PAYMENT */}

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
                  PAID AMOUNT
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
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  style={
                    styles.input
                  }
                />

                <Text
                  style={
                    styles.helperText
                  }
                >
                  Status:{' '}
                  {
                    calculations.paymentStatus
                  }
                  {' • Due '}
                  {formatCurrency(
                    calculations.due,
                  )}
                </Text>

              </View>


              {/* NOTES */}

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
                  NOTES
                </Text>

                <TextInput
                  value={
                    notes
                  }
                  onChangeText={
                    setNotes
                  }
                  placeholder="Optional reference or terms"
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


              {/* ACTIONS */}

              <View
                style={
                  styles.formActions
                }
              >

                <Pressable
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    onClose
                  }
                  disabled={
                    saving
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
                      styles.disabledButton,
                  ]}
                  onPress={
                    handleSave
                  }
                  disabled={
                    saving
                  }
                >

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save Purchase bill'}
                  </Text>

                </Pressable>

              </View>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </SafeAreaView>

    </Modal>

  );

}


/* =========================================================
   MAIN PURCHASE LIST
========================================================= */

export default function PurchasesScreen() {

  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();


  const [purchases, setPurchases] =
    useState<PurchaseListRow[]>([]);


  const [vendors, setVendors] =
    useState<VendorOption[]>([]);


  const [products, setProducts] =
    useState<ProductOption[]>([]);


  const [search, setSearch] =
    useState('');


  const [
    showPurchaseForm,
    setShowPurchaseForm,
  ] = useState(false);


  const [loading, setLoading] =
    useState(true);


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const refreshData =
    useCallback(async () => {

      try {

        setLoading(true);


        const [
          purchaseData,
          vendorData,
          productData,
        ] =
          await Promise.all([
            loadPurchases(),
            loadVendors(),
            loadProducts(),
          ]);


        setPurchases(
          purchaseData,
        );


        setVendors(
          vendorData.map(
            vendor => ({
              id:
                vendor.id,

              name:
                vendor.name,

              state:
                vendor.state,

              gstin:
                vendor.gstin,
            }),
          ),
        );


        setProducts(
          productData.map(
            product => ({
              id:
                product.id,

              name:
                product.name,

              hsn:
                product.hsn,

              unit:
                product.unit,

              purchasePrice:
                product.purchasePrice,

              gstRate:
                product.gstRate,
            }),
          ),
        );


      } catch (error) {

        Alert.alert(
          'Unable to load purchases',

          error instanceof Error
            ? error.message
            : 'Something went wrong.',
        );

      } finally {

        setLoading(false);

      }

    }, []);


  useFocusEffect(
    useCallback(() => {

      refreshData();

    }, [
      refreshData,
    ]),
  );


  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredPurchases =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();


      if (!query) {
        return purchases;
      }


      return purchases.filter(
        purchase => {

          const vendorName =
            purchase.vendor_name ??
            '';

          const purchaseNumber =
            purchase.purchase_number ??
            '';

          const invoiceNumber =
            purchase.invoice_number ??
            '';


          return (
            vendorName
              .toLowerCase()
              .includes(
                query,
              )
            ||
            purchaseNumber
              .toLowerCase()
              .includes(
                query,
              )
            ||
            invoiceNumber
              .toLowerCase()
              .includes(
                query,
              )
          );

        },
      );

    }, [
      purchases,
      search,
    ]);


  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {

      return purchases.reduce(
        (
          current,
          purchase,
        ) => {

          current.total +=
            Number(
              purchase.total_amount,
            ) || 0;

          current.paid +=
            Number(
              purchase.paid_amount,
            ) || 0;

          current.due +=
            Number(
              purchase.due_amount,
            ) || 0;

          return current;

        },
        {
          total: 0,
          paid: 0,
          due: 0,
        },
      );

    }, [
      purchases,
    ]);


  /* =======================================================
     UI
  ======================================================= */

  return (

    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        'top',
      ]}
    >

      <View
        style={
          styles.container
        }
      >

        {/* HEADER */}

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

            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.replace(
                  '/dashboard',
                )
              }
            >

              <Text
                style={
                  styles.backIcon
                }
              >
                ‹
              </Text>

            </Pressable>


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


            <View>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Purchases
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Vendor and inward stock flow
              </Text>

            </View>

          </View>


          <View
            style={
              styles.profileCircle
            }
          >

            <Text
              style={
                styles.profileText
              }
            >
              RS
            </Text>

          </View>

        </View>


        {/* MAIN */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.content,

            width >= 900 &&
              styles.contentLarge,
          ]}
        >

          {/* TITLE */}

          <View
            style={
              styles.purchaseFlowHeader
            }
          >

            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={
                  styles.flowTitle
                }
              >
                Purchase bills
              </Text>

              <Text
                style={
                  styles.flowSubtitle
                }
              >
                Purchase → Stock → Payable
              </Text>

            </View>


            <Pressable
              style={
                styles.topAddButton
              }
              onPress={() =>
                setShowPurchaseForm(
                  true,
                )
              }
            >

              <Text
                style={
                  styles.topAddButtonText
                }
              >
                + Add
              </Text>

            </Pressable>

          </View>


          {/* INFO */}

          <View
            style={
              styles.infoBanner
            }
          >

            <Text
              style={
                styles.infoBannerText
              }
            >
              Saved purchase bills update stock inward and vendor payable.
            </Text>

          </View>


          {/* SEARCH */}

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
                search
              }
              onChangeText={
                setSearch
              }
              placeholder="Search purchase, vendor or invoice..."
              placeholderTextColor={
                colors.mutedText
              }
              style={
                styles.searchInput
              }
            />

          </View>


          {/* SUMMARY */}

          <View
            style={
              styles.summaryGrid
            }
          >

            <View
              style={
                styles.summaryBox
              }
            >

              <Text
                style={
                  styles.summaryBoxLabel
                }
              >
                Bills
              </Text>

              <Text
                style={
                  styles.summaryBoxValue
                }
              >
                {
                  purchases.length
                }
              </Text>

            </View>


            <View
              style={
                styles.summaryBox
              }
            >

              <Text
                style={
                  styles.summaryBoxLabel
                }
              >
                Purchases
              </Text>

              <Text
                style={
                  styles.summaryBoxValueSmall
                }
              >
                {formatCurrency(
                  summary.total,
                )}
              </Text>

            </View>


            <View
              style={
                styles.summaryBox
              }
            >

              <Text
                style={
                  styles.summaryBoxLabel
                }
              >
                Paid
              </Text>

              <Text
                style={
                  styles.summaryBoxValueSmall
                }
              >
                {formatCurrency(
                  summary.paid,
                )}
              </Text>

            </View>


            <View
              style={
                styles.summaryBox
              }
            >

              <Text
                style={
                  styles.summaryBoxLabel
                }
              >
                To Pay
              </Text>

              <Text
                style={
                  styles.summaryBoxValueSmall
                }
              >
                {formatCurrency(
                  summary.due,
                )}
              </Text>

            </View>

          </View>


          {/* LIST */}

          {loading ? (

            <View
              style={
                styles.emptyCard
              }
            >

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Loading purchases...
              </Text>

            </View>

          ) : filteredPurchases.length ===
            0 ? (

            <View
              style={
                styles.emptyCard
              }
            >

              <Text
                style={
                  styles.emptyIcon
                }
              >
                📥
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {search
                  ? 'No purchases found'
                  : 'No purchase bills yet'}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? 'Try another search.'
                  : 'Tap + Add to create the first purchase bill.'}
              </Text>

            </View>

          ) : (

            <View
              style={
                styles.purchaseList
              }
            >

              {filteredPurchases.map(
                purchase => (

                  <View
                    key={
                      purchase.id
                    }
                    style={
                      styles.purchaseCard
                    }
                  >

                    <View
                      style={
                        styles.purchaseCardTop
                      }
                    >

                      <View
                        style={{
                          flex: 1,
                        }}
                      >

                        <Text
                          style={
                            styles.purchaseNumber
                          }
                        >
                          {
                            purchase.purchase_number
                          }
                          {' • '}
                          {purchase.vendor_name ||
                            'Vendor'}
                        </Text>

                        <Text
                          style={
                            styles.purchaseMeta
                          }
                        >
                          Purchase bill •{' '}
                          {
                            purchase.purchase_date
                          }
                          {purchase.invoice_number
                            ? ` • Ref ${purchase.invoice_number}`
                            : ''
                          }
                        </Text>

                      </View>


                      <View
                        style={
                          styles.purchaseAmountArea
                        }
                      >

                        <Text
                          style={
                            styles.purchaseAmount
                          }
                        >
                          {formatCurrency(
                            purchase.total_amount,
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.purchaseStatus,

                            purchase.payment_status ===
                              'PAID' &&
                              styles.statusPaid,

                            purchase.payment_status ===
                              'PARTIAL' &&
                              styles.statusPartial,

                            purchase.payment_status ===
                              'UNPAID' &&
                              styles.statusUnpaid,
                          ]}
                        >
                          {
                            purchase.payment_status
                          }
                        </Text>

                      </View>

                    </View>


                    <View
                      style={
                        styles.purchaseDivider
                      }
                    />


                    <View
                      style={
                        styles.purchaseStats
                      }
                    >

                      <View
                        style={
                          styles.purchaseStat
                        }
                      >

                        <Text
                          style={
                            styles.purchaseStatLabel
                          }
                        >
                          Taxable
                        </Text>

                        <Text
                          style={
                            styles.purchaseStatValue
                          }
                        >
                          {formatCurrency(
                            purchase.subtotal,
                          )}
                        </Text>

                      </View>


                      <View
                        style={
                          styles.purchaseStat
                        }
                      >

                        <Text
                          style={
                            styles.purchaseStatLabel
                          }
                        >
                          GST
                        </Text>

                        <Text
                          style={
                            styles.purchaseStatValue
                          }
                        >
                          {formatCurrency(
                            purchase.gst_amount,
                          )}
                        </Text>

                      </View>


                      <View
                        style={
                          styles.purchaseStat
                        }
                      >

                        <Text
                          style={
                            styles.purchaseStatLabel
                          }
                        >
                          Due
                        </Text>

                        <Text
                          style={
                            styles.purchaseStatValue
                          }
                        >
                          {formatCurrency(
                            purchase.due_amount,
                          )}
                        </Text>

                      </View>

                    </View>


                    <View
                      style={
                        styles.purchaseActions
                      }
                    >

                      <Pressable
                        style={
                          styles.viewButton
                        }
                        onPress={() =>
                          Alert.alert(
                            purchase.purchase_number,
                            `${purchase.vendor_name || 'Vendor'}\nTotal: ${formatCurrency(
                              purchase.total_amount,
                            )}\nDue: ${formatCurrency(
                              purchase.due_amount,
                            )}`,
                          )
                        }
                      >

                        <Text
                          style={
                            styles.viewButtonText
                          }
                        >
                          View
                        </Text>

                      </Pressable>


                      <Pressable
                        style={
                          styles.pdfButton
                        }
                        onPress={() =>
                          Alert.alert(
                            'PDF',
                            'PDF preview is the next step after this purchase UI is confirmed.',
                          )
                        }
                      >

                        <Text
                          style={
                            styles.pdfButtonText
                          }
                        >
                          PDF
                        </Text>

                      </Pressable>

                    </View>

                  </View>

                ),
              )}

            </View>

          )}


          <View
            style={{
              height: 40,
            }}
          />

        </ScrollView>


        {/* FORM */}

        <PurchaseForm
          visible={
            showPurchaseForm
          }
          vendors={
            vendors
          }
          products={
            products
          }
          onClose={() =>
            setShowPurchaseForm(
              false,
            )
          }
          onSaved={
            refreshData
          }
        />

        {/* =====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <View
          style={[
            styles.bottomNavigation,

            {
              bottom: Math.max(
                8,
                insets.bottom,
              ),
            },
          ]}
        >
          {/* HOME */}

          <Pressable
            onPress={() =>
              router.replace(
                '/dashboard',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ⌂
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Home
            </Text>
          </Pressable>

          {/* SALES */}

          <Pressable
            onPress={() =>
              router.push(
                '/sales',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              🧾
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Sales
            </Text>
          </Pressable>

          {/* PURCHASES - ACTIVE */}

          <Pressable
            onPress={() =>
              router.replace(
                '/purchases',
              )
            }
            style={({ pressed }) => [
              styles.navButton,
              styles.navButtonActive,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={[
                styles.navIcon,
                styles.navIconActive,
              ]}
            >
              📥
            </Text>

            <Text
              style={
                styles.navActiveText
              }
            >
              Purchases
            </Text>
          </Pressable>

          {/* MORE */}

          <Pressable
            onPress={() =>
              router.push(
                '/more',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ▦
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              More
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

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },


    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },


    /* HEADER */

    header: {
      minHeight: 76,

      backgroundColor:
        colors.primary,

      paddingHorizontal: 18,

      paddingVertical: 12,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      elevation: 6,
    },


    headerLeft: {
      flexDirection: 'row',

      alignItems: 'center',

      flex: 1,
    },


    backButton: {
      width: 40,

      height: 40,

      borderRadius: 10,

      backgroundColor:
        '#FFFFFF',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 10,
    },


    backIcon: {
      color:
        colors.primary,

      fontSize: 30,

      lineHeight: 32,

      fontWeight: '500',

      marginTop: -2,
    },


    logo: {
      width: 42,

      height: 42,

      borderRadius: 13,

      backgroundColor:
        colors.gold,

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 10,
    },


    logoText: {
      color:
        colors.primary,

      fontSize: 14,

      fontWeight: '900',
    },


    headerTitle: {
      color: '#FFFFFF',

      fontSize: 17,

      fontWeight: '800',
    },


    headerSubtitle: {
      color: '#D6E3EC',

      fontSize: 11,

      marginTop: 2,
    },


    profileCircle: {
      width: 40,

      height: 40,

      borderRadius: 20,

      backgroundColor:
        colors.secondary,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    profileText: {
      color: '#FFFFFF',

      fontSize: 12,

      fontWeight: '800',
    },


    /* CONTENT */

    content: {
      padding: 16,

      paddingBottom: 120,
    },


    contentLarge: {
      maxWidth: 1100,

      width: '100%',

      alignSelf: 'center',
    },


    purchaseFlowHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      marginBottom: 14,
    },


    flowTitle: {
      color:
        colors.text,

      fontSize: 23,

      fontWeight: '900',
    },


    flowSubtitle: {
      color:
        colors.mutedText,

      fontSize: 12,

      marginTop: 4,
    },


    topAddButton: {
      minHeight: 48,

      paddingHorizontal: 20,

      borderRadius: 13,

      backgroundColor:
        colors.teal,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    topAddButtonText: {
      color: '#FFFFFF',

      fontSize: 16,

      fontWeight: '900',
    },


    infoBanner: {
      backgroundColor:
        '#EAF6FC',

      borderWidth: 1,

      borderColor:
        '#C5DDE9',

      borderRadius: 12,

      paddingHorizontal: 14,

      paddingVertical: 13,

      marginBottom: 14,
    },


    infoBannerText: {
      color:
        colors.primary,

      fontSize: 12,

      lineHeight: 18,
    },


    searchContainer: {
      minHeight: 48,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 12,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 14,

      marginBottom: 12,
    },


    searchIcon: {
      color:
        colors.mutedText,

      fontSize: 22,

      marginRight: 8,
    },


    searchInput: {
      flex: 1,

      color:
        colors.text,

      fontSize: 14,

      paddingVertical: 10,
    },


    /* SUMMARY */

    summaryGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      gap: 8,

      marginBottom: 16,
    },


    summaryBox: {
      flexGrow: 1,

      flexBasis: '47%',

      minHeight: 78,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 12,

      padding: 12,

      justifyContent:
        'center',
    },


    summaryBoxLabel: {
      color:
        colors.mutedText,

      fontSize: 11,

      fontWeight: '700',
    },


    summaryBoxValue: {
      color:
        colors.text,

      fontSize: 22,

      fontWeight: '900',

      marginTop: 4,
    },


    summaryBoxValueSmall: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight: '900',

      marginTop: 5,
    },


    /* PURCHASE LIST */

    purchaseList: {
      gap: 12,
    },


    purchaseCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 16,

      padding: 16,
    },


    purchaseCardTop: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 10,
    },


    purchaseNumber: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight: '900',
    },


    purchaseMeta: {
      color:
        colors.mutedText,

      fontSize: 11,

      marginTop: 5,
    },


    purchaseAmountArea: {
      alignItems: 'flex-end',
    },


    purchaseAmount: {
      color:
        colors.text,

      fontSize: 17,

      fontWeight: '900',
    },


    purchaseStatus: {
      marginTop: 5,

      fontSize: 10,

      fontWeight: '900',

      paddingHorizontal: 8,

      paddingVertical: 4,

      borderRadius: 8,

      overflow: 'hidden',
    },


    statusPaid: {
      color:
        colors.success,

      backgroundColor:
        '#E8F7F1',
    },


    statusPartial: {
      color:
        colors.warning,

      backgroundColor:
        '#FFF5E5',
    },


    statusUnpaid: {
      color:
        colors.error,

      backgroundColor:
        '#FFF1F0',
    },


    purchaseDivider: {
      height: 1,

      backgroundColor:
        colors.border,

      marginVertical: 12,
    },


    purchaseStats: {
      flexDirection: 'row',

      gap: 8,
    },


    purchaseStat: {
      flex: 1,
    },


    purchaseStatLabel: {
      color:
        colors.mutedText,

      fontSize: 10,

      fontWeight: '700',
    },


    purchaseStatValue: {
      color:
        colors.text,

      fontSize: 12,

      fontWeight: '800',

      marginTop: 4,
    },


    purchaseActions: {
      flexDirection: 'row',

      gap: 8,

      marginTop: 14,
    },


    viewButton: {
      flex: 1,

      minHeight: 42,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        colors.border,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    viewButtonText: {
      color:
        colors.primary,

      fontSize: 12,

      fontWeight: '900',
    },


    pdfButton: {
      flex: 1,

      minHeight: 42,

      borderRadius: 10,

      backgroundColor:
        '#E5F4F2',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    pdfButtonText: {
      color:
        colors.teal,

      fontSize: 12,

      fontWeight: '900',
    },


    /* EMPTY */

    emptyCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 16,

      padding: 30,

      alignItems: 'center',
    },


    emptyIcon: {
      fontSize: 28,
    },


    emptyTitle: {
      color:
        colors.text,

      fontSize: 16,

      fontWeight: '900',

      marginTop: 10,
    },


    emptyText: {
      color:
        colors.mutedText,

      fontSize: 12,

      textAlign: 'center',

      marginTop: 6,
    },


    /* FORM */

    formSafeArea: {
      flex: 1,

      backgroundColor:
        colors.background,
    },


    formKeyboard: {
      flex: 1,
    },


    formScreen: {
      flex: 1,

      backgroundColor:
        colors.background,
    },


    formHeader: {
      paddingHorizontal: 20,

      paddingVertical: 16,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      borderBottomWidth: 1,

      borderBottomColor:
        colors.border,

      backgroundColor:
        colors.background,
    },


    formHeaderText: {
      flex: 1,
    },


    formTitle: {
      color:
        colors.text,

      fontSize: 25,

      fontWeight: '900',
    },


    formSubtitle: {
      color:
        colors.mutedText,

      fontSize: 12,

      marginTop: 3,
    },


    closeButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        colors.card,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    closeButtonText: {
      color:
        colors.text,

      fontSize: 28,

      lineHeight: 30,

      fontWeight: '600',
    },


    formContent: {
      padding: 20,

      paddingBottom: 40,
    },


    formContentWide: {
      maxWidth: 850,

      width: '100%',

      alignSelf: 'center',
    },


    formField: {
      marginBottom: 15,
    },


    formRow: {
      flexDirection: 'row',

      gap: 12,
    },


    formColumn: {
      flexDirection: 'column',
    },


    formRowField: {
      flex: 1,

      marginBottom: 15,
    },


    label: {
      color:
        colors.text,

      fontSize: 11,

      fontWeight: '900',

      marginBottom: 7,
    },


    helperText: {
      color:
        colors.mutedText,

      fontSize: 10,

      marginTop: 5,
    },


    input: {
      minHeight: 50,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 12,

      paddingHorizontal: 13,

      color:
        colors.text,

      fontSize: 14,
    },


    pickerField: {
      minHeight: 50,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 12,

      overflow: 'hidden',

      justifyContent:
        'center',
    },


    /* LINE CARD */

    lineCard: {
      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 16,

      padding: 14,

      marginBottom: 16,
    },


    lineCardTitle: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight: '900',

      marginBottom: 14,
    },


    lineRow: {
      marginTop: 14,
    },


    addLineButton: {
      minHeight: 50,

      borderRadius: 12,

      backgroundColor:
        colors.teal,

      alignItems: 'center',

      justifyContent:
        'center',

      marginTop: 2,
    },


    addLineButtonText: {
      color: '#FFFFFF',

      fontSize: 15,

      fontWeight: '900',
    },


    noLinesText: {
      color:
        colors.mutedText,

      fontSize: 11,

      marginTop: 12,
    },


    selectedItems: {
      gap: 10,

      marginTop: 14,
    },


    itemCard: {
      backgroundColor:
        colors.background,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 12,

      padding: 12,
    },


    itemTop: {
      flexDirection: 'row',

      gap: 10,
    },


    itemName: {
      color:
        colors.text,

      fontSize: 13,

      fontWeight: '900',
    },


    itemMeta: {
      color:
        colors.mutedText,

      fontSize: 10,

      marginTop: 4,
    },


    removeButton: {
      width: 30,

      height: 30,

      borderRadius: 15,

      backgroundColor:
        '#FFF1F0',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    removeButtonText: {
      color:
        colors.error,

      fontSize: 20,

      lineHeight: 21,
    },


    itemBottom: {
      marginTop: 12,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      gap: 12,
    },


    quantityEditor: {
      height: 46,

      minWidth: 145,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 10,

      overflow: 'hidden',

      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        colors.card,
    },


    quantityButton: {
      width: 42,

      height: 44,

      backgroundColor:
        colors.background,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    quantityButtonText: {
      color:
        colors.text,

      fontSize: 20,

      fontWeight: '900',
    },


    quantityInput: {
      flex: 1,

      minWidth: 45,

      height: 44,

      textAlign: 'center',

      color:
        colors.text,

      fontSize: 14,

      fontWeight: '800',
    },


    itemTotal: {
      color:
        colors.teal,

      fontSize: 15,

      fontWeight: '900',
    },


    /* TOTAL */

    totalCard: {
      backgroundColor:
        colors.card,

      borderRadius: 16,

      padding: 18,

      marginBottom: 16,
    },


    totalRow: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 10,
    },


    totalRowLabel: {
      color:
        colors.mutedText,

      fontSize: 12,
    },


    totalRowValue: {
      color:
        colors.text,

      fontSize: 12,

      fontWeight: '800',
    },


    totalDivider: {
      height: 1,

      backgroundColor:
        colors.border,

      marginVertical: 4,
    },


    grandTotalLabel: {
      color:
        colors.text,

      fontSize: 17,

      fontWeight: '900',
    },


    grandTotalValue: {
      color:
        colors.text,

      fontSize: 18,

      fontWeight: '900',
    },


    notesInput: {
      minHeight: 100,

      paddingTop: 12,

      textAlignVertical: 'top',
    },


    /* FORM ACTIONS */

    formActions: {
      flexDirection: 'row',

      justifyContent:
        'flex-end',

      gap: 10,

      marginTop: 5,
    },


    cancelButton: {
      flex: 1,

      minHeight: 50,

      borderRadius: 12,

      backgroundColor:
        '#EEF9F7',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    cancelButtonText: {
      color:
        colors.teal,

      fontSize: 14,

      fontWeight: '900',
    },


    saveButton: {
      flex: 1.6,

      minHeight: 50,

      borderRadius: 12,

      backgroundColor:
        colors.teal,

      alignItems: 'center',

      justifyContent:
        'center',

      paddingHorizontal: 12,
    },


    saveButtonText: {
      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '900',
    },


    disabledButton: {
      opacity: 0.6,
    },


    /* =========================================================
       BOTTOM NAVIGATION
    ========================================================= */

    bottomNavigation: {
      position: 'absolute',

      left: 9,
      right: 9,

      flexDirection: 'row',

      gap: 4,

      padding: 6,

      backgroundColor: '#FFFFFF',

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

      alignItems: 'center',

      justifyContent: 'center',
    },


    navButtonActive: {
      backgroundColor: '#E5F5F2',
    },


    navPressed: {
      opacity: 0.75,
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

      fontWeight: '800',
    },


    navText: {
      color: colors.mutedText,

      fontSize: 9,

      fontWeight: '800',
    },

  });