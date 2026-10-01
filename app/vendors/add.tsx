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

import { router, useLocalSearchParams } from 'expo-router';

import { Picker } from '@react-native-picker/picker';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  saveVendor,
  editVendor,
} from '../../src/services/vendorService';

import {
  getVendorById,
} from '../../src/repositories/vendorRepository';

import type {
  CreateVendorInput,
  Vendor,
} from '../../src/types/vendor';

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
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
];

interface VendorFormProps {
  vendor?: Vendor | null;
}

function VendorForm({ vendor }: VendorFormProps) {
  const { width } = useWindowDimensions();

  const isEditMode = Boolean(vendor);
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

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setMobile(vendor.mobile);
      setGstin(vendor.gstin ?? '');
      setState(vendor.state || 'Andhra Pradesh');
      setCreditDays(String(vendor.creditDays ?? 0));
      setOpeningBalance(
        String(vendor.openingBalance ?? 0),
      );
      setBusinessDetail(
        vendor.businessDetail ?? '',
      );
      setAddress(vendor.address ?? '');
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
  }, [vendor]);

  const goToDashboard = () => {
    if (saving) {
      return;
    }

    router.replace('/dashboard');
  };

  const handleSave = async () => {
    const vendorName = name.trim();
    const vendorMobile = mobile.trim();

    if (!vendorName) {
      Alert.alert(
        'Required',
        'Please enter vendor name.',
      );
      return;
    }

    if (!vendorMobile) {
      Alert.alert(
        'Required',
        'Please enter mobile number.',
      );
      return;
    }

    if (!/^\d{10}$/.test(vendorMobile)) {
      Alert.alert(
        'Invalid mobile number',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);

    try {
      if (vendor) {
        await editVendor({
          ...vendor,

          name: vendorName,

          mobile: vendorMobile,

          gstin:
            gstin.trim() || undefined,

          state,

          creditDays:
            Number(creditDays) || 0,

          openingBalance:
            Number(openingBalance) || 0,

          businessDetail:
            businessDetail.trim() || undefined,

          address:
            address.trim() || undefined,
        });
      } else {
        const input: CreateVendorInput = {
          name: vendorName,

          mobile: vendorMobile,

          gstin:
            gstin.trim() || undefined,

          state,

          creditDays:
            Number(creditDays) || 0,

          openingBalance:
            Number(openingBalance) || 0,

          businessDetail:
            businessDetail.trim() || undefined,

          address:
            address.trim() || undefined,
        };

        await saveVendor(input);
      }

      router.replace('/dashboard');
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
                onPress={goToDashboard}
                style={styles.formBackButton}
                disabled={saving}
              >
                <Text style={styles.formBackIcon}>
                  ‹
                </Text>
              </Pressable>

              <View>

                <Text
                  style={styles.formHeaderTitle}
                >
                  {isEditMode
                    ? 'Edit Vendor'
                    : 'Add Vendor'}
                </Text>

                <Text
                  style={
                    styles.formHeaderSubtitle
                  }
                >
                  {isEditMode
                    ? 'Update retail vendor details'
                    : 'Create a new retail vendor'}
                </Text>

              </View>

            </View>

            <View style={styles.formLogo}>
              <Text
                style={styles.formLogoText}
              >
                CA
              </Text>
            </View>

          </View>


          {/* FORM CONTENT */}

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
                Vendor Information
              </Text>

              <Text
                style={styles.formDescription}
              >
                Enter the vendor's basic and
                account details.
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
                    Vendor Name{' '}
                    <Text
                      style={styles.required}
                    >
                      *
                    </Text>
                  </Text>

                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter vendor name"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    autoComplete="off"
                    importantForAutofill="no"
                    style={styles.input}
                  />

                </View>


                <View style={styles.formField}>

                  <Text style={styles.label}>
                    Mobile Number{' '}
                    <Text
                      style={styles.required}
                    >
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
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    importantForAutofill="yes"
                    maxLength={10}
                    style={styles.input}
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
                    onChangeText={setGstin}
                    placeholder="Optional GSTIN"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    autoCapitalize="characters"
                    autoComplete="off"
                    importantForAutofill="no"
                    style={styles.input}
                  />

                </View>


                <View style={styles.formField}>

                  <Text style={styles.label}>
                    State
                  </Text>

                  <View
                    style={styles.stateField}
                  >

                    <Text
                      style={styles.stateValue}
                      numberOfLines={1}
                    >
                      {state ||
                        'Select state'}
                    </Text>

                    <View
                      style={styles.stateArrow}
                      pointerEvents="none"
                    >
                      <Text
                        style={
                          styles.stateArrowText
                        }
                      >
                        ▼
                      </Text>
                    </View>

                    <View
                      style={
                        styles.hiddenPickerContainer
                      }
                    >
                      <Picker
                        selectedValue={state}
                        onValueChange={(
                          value: string,
                        ) => setState(value)}
                        style={
                          styles.hiddenPicker
                        }
                      >
                        {STATES.map(
                          (item) => (
                            <Picker.Item
                              key={item}
                              label={item}
                              value={item}
                            />
                          ),
                        )}
                      </Picker>
                    </View>

                  </View>

                </View>

              </View>


              {/* CREDIT / BALANCE */}

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
                        value.replace(
                          /\D/g,
                          '',
                        ),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="number-pad"

                    /*
                     * IMPORTANT:
                     * Prevent Android from treating
                     * this field as an autofill field.
                     */
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"

                    style={styles.input}
                  />

                </View>


                <View style={styles.formField}>

                  <Text style={styles.label}>
                    Opening Balance
                  </Text>

                  <TextInput
                    value={openingBalance}
                    onChangeText={(value) =>
                      setOpeningBalance(
                        value.replace(
                          /[^0-9.]/g,
                          '',
                        ),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    keyboardType="decimal-pad"

                    /*
                     * IMPORTANT:
                     * Prevent Android from copying
                     * phone/autofill values here.
                     */
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"

                    style={styles.input}
                  />

                </View>

              </View>


              {/* VENDOR DETAILS */}

              <View
                style={styles.fullField}
              >

                <Text style={styles.label}>
                  Vendor details
                </Text>

                <TextInput
                  value={businessDetail}
                  onChangeText={
                    setBusinessDetail
                  }
                  placeholder="Example: Distributor / wholesaler"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  autoComplete="off"
                  importantForAutofill="no"
                  style={styles.input}
                />

              </View>


              {/* ADDRESS */}

              <View
                style={styles.fullField}
              >

                <Text style={styles.label}>
                  Address
                </Text>

                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Vendor address"
                  placeholderTextColor={
                    colors.mutedText
                  }
                  autoComplete="street-address"
                  importantForAutofill="no"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.addressInput,
                  ]}
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
                onPress={goToDashboard}
                style={styles.cancelButton}
                disabled={saving}
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
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  saving &&
                    styles.disabledButton,
                ]}
                disabled={saving}
              >

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {saving
                    ? 'Saving...'
                    : isEditMode
                      ? 'Update Vendor'
                      : 'Save Vendor'}
                </Text>

              </Pressable>

            </View>

          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


export default function AddVendorScreen() {

  const {
    vendorId,
  } =
    useLocalSearchParams<{
      vendorId?: string;
    }>();

  const [vendor, setVendor] =
    useState<Vendor | null>(null);

  const [loading, setLoading] =
    useState(Boolean(vendorId));


  useEffect(() => {

    let mounted = true;

    const loadVendor =
      async () => {

        if (!vendorId) {

          if (mounted) {

            setVendor(null);
            setLoading(false);

          }

          return;
        }


        try {

          const result =
            await getVendorById(
              vendorId,
            );

          if (mounted) {
            setVendor(result);
          }

        } catch (error) {

          if (mounted) {

            Alert.alert(
              'Unable to load vendor',

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


    loadVendor();


    return () => {
      mounted = false;
    };

  }, [vendorId]);


  if (loading) {

    return (
      <SafeAreaView
        style={styles.formSafeArea}
        edges={['top', 'bottom']}
      >

        <View
          style={[
            styles.formScreen,
            {
              alignItems: 'center',
              justifyContent:
                'center',
            },
          ]}
        >

          <Text
            style={
              styles.formDescription
            }
          >
            Loading vendor...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  if (vendorId && !vendor) {

    return (
      <SafeAreaView
        style={styles.formSafeArea}
        edges={['top', 'bottom']}
      >

        <View
          style={[
            styles.formScreen,
            {
              alignItems: 'center',
              justifyContent:
                'center',
              padding: 20,
            },
          ]}
        >

          <Text
            style={styles.formTitle}
          >
            Vendor not found
          </Text>

          <Pressable
            onPress={() =>
              router.replace(
                '/dashboard',
              )
            }
            style={[
              styles.saveButton,
              {
                width: '100%',
                marginTop: 16,
              },
            ]}
          >

            <Text
              style={
                styles.saveButtonText
              }
            >
              Back to Dashboard
            </Text>

          </Pressable>

        </View>

      </SafeAreaView>
    );
  }


  return (
    <VendorForm
      vendor={vendor}
    />
  );
}


const styles = StyleSheet.create({

  formSafeArea: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  formKeyboard: {
    flex: 1,
    width: '100%',
  },

  formScreen: {
    flex: 1,
    width: '100%',
    backgroundColor:
      colors.background,
  },


  /* HEADER */

  formHeader: {
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

  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  formBackButton: {
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
    backgroundColor:
      colors.gold,
    alignItems: 'center',
    justifyContent:
      'center',
    marginLeft: 10,
  },

  formLogoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },


  /* FORM */

  formScroll: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  formScrollLarge: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  formCard: {
    width: '100%',
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
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
  },

  addressInput: {
    minHeight: 90,
    paddingTop: 12,
  },


  /* STATE */

  stateField: {
    height: 46,
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
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
    justifyContent:
      'center',
  },

  stateArrowText: {
    color:
      colors.mutedText,
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
    borderColor:
      colors.border,
    backgroundColor:
      colors.card,
    alignItems: 'center',
    justifyContent:
      'center',
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
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

});