
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

  function handleSave() {
    const productName = name.trim();

    if (!productName) {
      Alert.alert('Product name required', 'Please enter the product name.');
      return;
    }

    const product = {
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
    };

    router.navigate({
      pathname: '/products',
      params: {
        product: JSON.stringify(product),
      },
    });
  }

  function handleCancel() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Add Product</Text>
              <Text style={styles.subtitle}>
                Create a product for your retail business
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Premium Rice 5kg"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>HSN Code</Text>
            <TextInput
              value={hsn}
              onChangeText={setHsn}
              placeholder="e.g. 100630"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. Piece, Kg, Bag, Bottle"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </View>

          {/* Pricing */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pricing & Tax</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Sale Price</Text>
                <View style={styles.currencyInput}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    value={salePrice}
                    onChangeText={setSalePrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedText}
                    style={styles.currencyTextInput}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>Purchase Price</Text>
                <View style={styles.currencyInput}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedText}
                    style={styles.currencyTextInput}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>GST Rate (%)</Text>
            <TextInput
              value={gstRate}
              onChangeText={setGstRate}
              placeholder="e.g. 5"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Stock */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Opening Stock</Text>

            <Text style={styles.label}>Opening Quantity</Text>
            <TextInput
              value={openingStock}
              onChangeText={setOpeningStock}
              placeholder="e.g. 24"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Retail Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Retail Details</Text>

            <Text style={styles.label}>Barcode</Text>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Scan or enter barcode"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Brand</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Premium"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Rack</Text>
            <TextInput
              value={rack}
              onChangeText={setRack}
              placeholder="e.g. A-01"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveText}>Save Product</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  container: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 32,
    color: colors.primary,
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.primary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedText,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 7,
    marginTop: 4,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfField: {
    flex: 1,
  },

  currencyInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFCFD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  currency: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.mutedText,
    marginRight: 5,
  },

  currencyTextInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  saveButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.75,
  },
});

