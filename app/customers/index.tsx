import React, { useEffect, useState } from 'react';

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

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { Picker } from '@react-native-picker/picker';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  saveCustomer,
  editCustomer,
} from '../../src/services/customerService';

import { getCustomerById } from '../../src/repositories/customerRepository';

import type {
  CreateCustomerInput,
  Customer,
} from '../../src/types/customer';

import { colors } from '../../src/theme/colors';


const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];


/*         =
   CUSTOMER FORM
           = */

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}


function CustomerForm({
  customer,
  onClose,
  onSaved,
}: CustomerFormProps) {
  const { width } = useWindowDimensions();

  const isEditMode = Boolean(customer);
  const isLargeForm = width >= 700;

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [creditDays, setCreditDays] = useState('0');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [businessDetail, setBusinessDetail] = useState('');
  const [address, setAddress] = useState('');

  const [saving, setSaving] = useState(false);


  /*         =
     LOAD / RESET FORM
             = */

  useEffect(() => {
    if (customer) {
      setName(customer.name ?? '');
      setMobile(customer.mobile ?? '');
      setGstin(customer.gstin ?? '');

      setState(
        customer.state ||
        'Andhra Pradesh',
      );

      setCreditDays(
        String(customer.creditDays ?? 0),
      );

      setOpeningBalance(
        String(customer.openingBalance ?? 0),
      );

      setBusinessDetail(
        customer.businessDetail ?? '',
      );

      setAddress(
        customer.address ?? '',
      );

      return;
    }

    setName('');
    setMobile('');
    setGstin('');
    setState('Andhra Pradesh');
    setCreditDays('0');
    setOpeningBalance('0');
    setBusinessDetail('');
    setAddress('');
  }, [customer]);


  /*         =
     CLOSE
             = */

  const handleClose = () => {
    if (saving) {
      return;
    }

    onClose();
  };


  /*         =
     SAVE CUSTOMER
             = */

  const handleSave = async () => {
    const customerName = name.trim();
    const customerMobile = mobile.trim();

    if (!customerName) {
      Alert.alert(
        'Required',
        'Please enter customer name.',
      );

      return;
    }

    if (!customerMobile) {
      Alert.alert(
        'Required',
        'Please enter mobile number.',
      );

      return;
    }

    if (!/^\d{10}$/.test(customerMobile)) {
      Alert.alert(
        'Invalid mobile number',
        'Please enter a valid 10-digit mobile number.',
      );

      return;
    }

    setSaving(true);

    try {
      if (customer) {
        await editCustomer({
          ...customer,

          name: customerName,

          mobile: customerMobile,

          gstin:
            gstin.trim() ||
            undefined,

          state,

          creditDays:
            Number(creditDays) || 0,

          openingBalance:
            Number(openingBalance) || 0,

          businessDetail:
            businessDetail.trim() ||
            undefined,

          address:
            address.trim() ||
            undefined,
        });
      } else {
        const input: CreateCustomerInput = {
          name: customerName,

          mobile: customerMobile,

          gstin:
            gstin.trim() ||
            undefined,

          state,

          creditDays:
            Number(creditDays) || 0,

          openingBalance:
            Number(openingBalance) || 0,

          businessDetail:
            businessDetail.trim() ||
            undefined,

          address:
            address.trim() ||
            undefined,
        };

        await saveCustomer(input);
      }

      onSaved();
    } catch (error) {
      Alert.alert(
        isEditMode
          ? 'Unable to update'
          : 'Unable to save',

        error instanceof Error
          ? error.message
          : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  };


  /*         =
     SCREEN
             = */

  return (
    <SafeAreaView
      style={styles.formSafeArea}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.formKeyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.formScreen}>

          {/* HEADER */}

          <View style={styles.formHeader}>

            <View style={styles.formHeaderLeft}>

              <Pressable
                onPress={handleClose}
                style={styles.formBackButton}
                disabled={saving}
              >
                <Text style={styles.formBackIcon}>
                  ‹
                </Text>
              </Pressable>

              <View>
                <Text style={styles.formHeaderTitle}>
                  {isEditMode
                    ? 'Edit Customer'
                    : 'Add Customer'}
                </Text>

                <Text style={styles.formHeaderSubtitle}>
                  {isEditMode
                    ? 'Update retail customer details'
                    : 'Create a new retail customer'}
                </Text>
              </View>

            </View>

            <View style={styles.formLogo}>
              <Text style={styles.formLogoText}>
                CA
              </Text>
            </View>

          </View>


          {/* FORM */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.formScroll,

              isLargeForm &&
                styles.formScrollLarge,
            ]}
          >
            <View
              style={[
                styles.formCard,

                isLargeForm &&
                  styles.formCardLarge,
              ]}
            >

              <Text style={styles.formTitle}>
                Customer Information
              </Text>

              <Text style={styles.formDescription}>
                Enter the customer's basic and account details.
              </Text>


              {/* NAME / MOBILE */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                <View style={styles.formField}>

                  <Text style={styles.label}>
                    Customer Name{' '}
                    <Text style={styles.required}>
                      *
                    </Text>
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
                    Mobile Number{' '}
                    <Text style={styles.required}>
                      *
                    </Text>
                  </Text>

                  <TextInput
                    value={mobile}
                    onChangeText={(value) =>
                      setMobile(
                        value
                          .replace(/\D/g, '')
                          .slice(0, 10),
                      )
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


              {/* GST / STATE */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                <View style={styles.formField}>

                  <Text style={styles.label}>
                    GSTIN
                  </Text>

                  <TextInput
                    value={gstin}
                    onChangeText={(value) =>
                      setGstin(
                        value
                          .toUpperCase()
                          .slice(0, 15),
                      )
                    }
                    placeholder="Optional GSTIN"
                    placeholderTextColor={colors.mutedText}
                    autoCapitalize="characters"
                    style={styles.input}
                    editable={!saving}
                  />

                </View>


                <View style={styles.formField}>

                  <Text style={styles.label}>
                    State
                  </Text>

                  <View style={styles.stateField}>

                    <Text
                      style={styles.stateValue}
                      numberOfLines={1}
                    >
                      {state || 'Select state'}
                    </Text>

                    <View
                      style={styles.stateArrow}
                      pointerEvents="none"
                    >
                      <Text style={styles.stateArrowText}>
                        ▼
                      </Text>
                    </View>

                    <View
                      style={styles.hiddenPickerContainer}
                    >
                      <Picker
                        selectedValue={state}
                        onValueChange={(value: string) =>
                          setState(value)
                        }
                        style={styles.hiddenPicker}
                        enabled={!saving}
                      >
                        {STATES.map((item) => (
                          <Picker.Item
                            key={item}
                            label={item}
                            value={item}
                          />
                        ))}
                      </Picker>
                    </View>

                  </View>
                </View>
              </View>


              {/* CREDIT DAYS / OPENING BALANCE */}

              <View
                style={[
                  styles.formRow,

                  !isLargeForm &&
                    styles.formColumn,
                ]}
              >
                <View style={styles.formField}>

                  <Text style={styles.label}>
                    Credit Days
                  </Text>

                  <TextInput
                    value={creditDays}
                    onChangeText={(value) =>
                      setCreditDays(
                        value.replace(/\D/g, ''),
                      )
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

                  <Text style={styles.label}>
                    Opening Balance
                  </Text>

                  <TextInput
                    value={openingBalance}
                    onChangeText={(value) => {
                      const cleaned =
                        value.replace(
                          /[^0-9.]/g,
                          '',
                        );

                      const parts =
                        cleaned.split('.');

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


              {/* CUSTOMER CATEGORY */}

              <View style={styles.fullField}>

                <Text style={styles.label}>
                  Customer Category / Loyalty ID
                </Text>

                <TextInput
                  value={businessDetail}
                  onChangeText={setBusinessDetail}
                  placeholder="Example: Retail customer"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                  editable={!saving}
                />

              </View>


              {/* ADDRESS */}

              <View style={styles.fullField}>

                <Text style={styles.label}>
                  Address
                </Text>

                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Customer address"
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.addressInput,
                  ]}
                  editable={!saving}
                />

              </View>

            </View>


            {/* BUTTONS */}

            <View
              style={[
                styles.formActions,

                isLargeForm &&
                  styles.formActionsLarge,
              ]}
            >

              <Pressable
                onPress={handleClose}
                style={styles.cancelButton}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>


              <Pressable
                onPress={handleSave}
                style={[
                  styles.saveButton,

                  saving &&
                    styles.disabledButton,
                ]}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? 'Saving...'
                    : isEditMode
                      ? 'Update Customer'
                      : 'Save Customer'}
                </Text>
              </Pressable>

            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/*         =
   CUSTOMER ROUTE
   app/customers/index.tsx
           = */

export default function CustomersScreen() {
  const { customerId } =
    useLocalSearchParams<{
      customerId?: string;
    }>();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(Boolean(customerId));


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
        const result =
          await getCustomerById(customerId);

        if (mounted) {
          setCustomer(result);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert(
            'Unable to load customer',

            error instanceof Error
              ? error.message
              : 'Something went wrong.',
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


  /*
   * Loading an existing customer
   */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.formSafeArea}
        edges={['top', 'bottom']}
      >
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>
            Loading customer...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /*
   * customerId supplied but record missing
   */

  if (customerId && !customer) {
    return (
      <SafeAreaView
        style={styles.formSafeArea}
        edges={['top', 'bottom']}
      >
        <View style={styles.notFoundScreen}>

          <Text style={styles.formTitle}>
            Customer not found
          </Text>

          <Text style={styles.formDescription}>
            This customer could not be loaded.
          </Text>

          <Pressable
            onPress={() =>
              router.replace('/dashboard')
            }
            style={[
              styles.saveButton,
              styles.notFoundButton,
            ]}
          >
            <Text style={styles.saveButtonText}>
              Back to Dashboard
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    );
  }


  return (
    <CustomerForm
      customer={customer}

      onClose={() => {
        router.replace('/dashboard');
      }}

      onSaved={() => {
        router.replace('/dashboard');
      }}
    />
  );
}


/*         =
   STYLES
           = */

const styles = StyleSheet.create({

  formSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },


  formKeyboard: {
    flex: 1,
    width: '100%',
  },


  formScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
  },


  /* HEADER */

  formHeader: {
    minHeight: 76,
    backgroundColor: colors.primary,

    paddingHorizontal: 18,
    paddingVertical: 12,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    elevation: 6,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },


  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },


  formBackButton: {
    width: 40,
    height: 40,

    borderRadius: 10,

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },


  formBackIcon: {
    color: colors.primary,

    fontSize: 30,
    lineHeight: 32,

    fontWeight: '500',

    marginTop: -2,
  },


  formHeaderTitle: {
    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '800',
  },


  formHeaderSubtitle: {
    color: '#D6E3EC',

    fontSize: 11,

    marginTop: 3,
  },


  formLogo: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: colors.gold,

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 10,
  },


  formLogoText: {
    color: colors.primary,

    fontSize: 14,

    fontWeight: '900',
  },


  /* SCROLL / FORM CARD */

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
    width: '100%',

    backgroundColor: colors.card,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 20,

    padding: 20,
  },


  formCardLarge: {
    maxWidth: 850,
    alignSelf: 'center',
  },


  formTitle: {
    color: colors.text,

    fontSize: 17,

    fontWeight: '800',
  },


  formDescription: {
    color: colors.mutedText,

    fontSize: 12,

    marginTop: 4,

    lineHeight: 18,
  },


  /* FORM */

  formRow: {
    flexDirection: 'row',

    gap: 12,

    marginTop: 16,
  },


  formColumn: {
    flexDirection: 'column',
  },


  formField: {
    flex: 1,
  },


  fullField: {
    width: '100%',

    marginTop: 16,
  },


  label: {
    color: colors.text,

    fontSize: 12,

    fontWeight: '700',

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


  /* STATE PICKER */

  stateField: {
    height: 46,

    backgroundColor: colors.card,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 10,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    position: 'relative',

    overflow: 'hidden',
  },


  stateValue: {
    flex: 1,

    color: colors.text,

    fontSize: 13,

    fontWeight: '500',

    paddingRight: 30,
  },


  stateArrow: {
    position: 'absolute',

    right: 12,
    top: 0,
    bottom: 0,

    width: 24,

    alignItems: 'center',
    justifyContent: 'center',
  },


  stateArrowText: {
    color: colors.mutedText,

    fontSize: 10,
  },


  hiddenPickerContainer: {
    position: 'absolute',

    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    opacity: 0.02,
  },


  hiddenPicker: {
    width: '100%',
    height: 46,
  },


  /* ACTIONS */

  formActions: {
    width: '100%',

    flexDirection: 'row',

    gap: 12,

    marginTop: 16,
    marginBottom: 10,
  },


  formActionsLarge: {
    maxWidth: 850,

    alignSelf: 'center',
  },


  cancelButton: {
    flex: 1,

    minHeight: 48,

    borderRadius: 11,

    borderWidth: 1,
    borderColor: colors.border,

    backgroundColor: colors.card,

    alignItems: 'center',
    justifyContent: 'center',
  },


  cancelButtonText: {
    color: colors.text,

    fontSize: 13,

    fontWeight: '800',
  },


  saveButton: {
    flex: 1.4,

    minHeight: 48,

    borderRadius: 11,

    backgroundColor: colors.primary,

    alignItems: 'center',
    justifyContent: 'center',
  },


  disabledButton: {
    opacity: 0.6,
  },


  saveButtonText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '800',
  },


  /* LOADING */

  loadingScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },


  loadingText: {
    color: colors.mutedText,

    fontSize: 14,

    fontWeight: '600',
  },


  /* NOT FOUND */

  notFoundScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    padding: 20,

    backgroundColor: colors.background,
  },


  notFoundButton: {
    width: '100%',

    maxWidth: 400,

    marginTop: 16,

    flex: 0,
  },

});