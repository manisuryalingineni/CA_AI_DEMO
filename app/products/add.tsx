import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';

import { colors } from '../../src/theme/colors';
import { saveProduct } from '../../src/services/productService';

export default function AddProductScreen() {
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [rack, setRack] = useState('');

  async function handleSave() {
    const productName = name.trim();

    if (!productName) {
      Alert.alert(
        'Product name required',
        'Please enter the product name.',
      );
      return;
    }

    try {
      await saveProduct({
        name: productName,
        hsn: hsn.trim(),
        unit: unit.trim() || 'Piece',
        salePrice: Number(salePrice) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        gstRate: Number(gstRate) || 0,
        openingStock: Number(openingStock) || 0,
        barcode: barcode.trim(),
        brand: brand.trim(),
        rack: rack.trim(),
      });

      router.replace('/products');
    } catch (error) {
      Alert.alert(
        'Unable to save product',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
      );
    }
  }

  function handleCancel() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

          {/* =================================
              HEADER
          ================================= */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.backIcon}>
                  ‹
                </Text>
              </Pressable>

              <View style={styles.logo}>
                <Text style={styles.logoText}>
                  CA
                </Text>
              </View>

              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  Add Product
                </Text>

                <Text style={styles.headerSubtitle}>
                  Create a product for your business
                </Text>
              </View>
            </View>

            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>
                RS
              </Text>
            </View>
          </View>

          {/* =================================
              BASIC INFORMATION
          ================================= */}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Basic Information
            </Text>

            <Text style={styles.label}>
              Product Name *
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Premium Rice 5kg"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>
              HSN Code
            </Text>

            <TextInput
              value={hsn}
              onChangeText={setHsn}
              placeholder="e.g. 100630"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>
              Unit
            </Text>

            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. Piece, Kg, Bag, Bottle"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </View>

          {/* =================================
              PRICING & TAX
          ================================= */}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Pricing & Tax
            </Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>
                  Sale Price
                </Text>

                <View style={styles.currencyInput}>
                  <Text style={styles.currency}>
                    ₹
                  </Text>

                  <TextInput
                    value={salePrice}
                    onChangeText={setSalePrice}
                    placeholder="0.00"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    style={styles.currencyTextInput}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>
                  Purchase Price
                </Text>

                <View style={styles.currencyInput}>
                  <Text style={styles.currency}>
                    ₹
                  </Text>

                  <TextInput
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0.00"
                    placeholderTextColor={
                      colors.mutedText
                    }
                    style={styles.currencyTextInput}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>
              GST Rate (%)
            </Text>

            <TextInput
              value={gstRate}
              onChangeText={setGstRate}
              placeholder="e.g. 5"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>

          {/* =================================
              OPENING STOCK
          ================================= */}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Opening Stock
            </Text>

            <Text style={styles.label}>
              Opening Quantity
            </Text>

            <TextInput
              value={openingStock}
              onChangeText={setOpeningStock}
              placeholder="e.g. 24"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>

          {/* =================================
              RETAIL DETAILS
          ================================= */}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Retail Details
            </Text>

            <Text style={styles.label}>
              Barcode
            </Text>

            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Scan or enter barcode"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>
              Brand
            </Text>

            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Premium"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>
              Rack
            </Text>

            <TextInput
              value={rack}
              onChangeText={setRack}
              placeholder="e.g. A-01"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          {/* =================================
              ACTIONS
          ================================= */}

          <View style={styles.actions}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveText}>
                Save Product
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* =================================
     SCREEN
  ================================= */

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  container: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  /* =================================
     HEADER
     SAME AS CUSTOMERS
  ================================= */

  header: {
    minHeight: 76,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  backIcon: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '500',
    marginTop: -2,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  logoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },

  headerText: {
    flex: 1,
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
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* =================================
     CARDS
  ================================= */

  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },

  /* =================================
     FIELDS
  ================================= */

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 4,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfField: {
    flex: 1,
  },

  /* =================================
     CURRENCY
  ================================= */

  currencyInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  currency: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedText,
    marginRight: 5,
  },

  currencyTextInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },

  /* =================================
     ACTIONS
  ================================= */

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
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

  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  saveButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.75,
  },
});