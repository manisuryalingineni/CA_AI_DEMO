
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { colors } from '../../src/theme/colors';
import type { Product } from '../../src/types/product';

const LOW_STOCK_LIMIT = 10;

export default function ProductsScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  const isSmallScreen = width < 360;

  /*
   * Temporary frontend-only product state.
   * The database integration will be handled separately.
   */
  React.useEffect(() => {
    if (!params.product) {
      return;
    }

    try {
      const newProduct = JSON.parse(
        Array.isArray(params.product)
          ? params.product[0]
          : params.product,
      ) as Product;

      setProducts((currentProducts) => {
        const alreadyExists = currentProducts.some(
          (product) => product.id === newProduct.id,
        );

        if (alreadyExists) {
          return currentProducts;
        }

        return [...currentProducts, newProduct];
      });
    } catch {
      // Ignore invalid temporary route data.
    }
  }, [params.product]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.hsn?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (product) => product.openingStock <= LOW_STOCK_LIMIT,
    ).length;
  }, [products]);

  const stockValue = useMemo(() => {
    return products.reduce((total, product) => {
      return total + product.openingStock * product.purchasePrice;
    }, 0);
  }, [products]);

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLowStock = item.openingStock <= LOW_STOCK_LIMIT;

    return (
      <View style={styles.productCard}>
        <View style={styles.productTopRow}>
          <View style={styles.productNameContainer}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>

            {item.brand ? (
              <Text style={styles.productBrand}>{item.brand}</Text>
            ) : null}
          </View>

          {isLowStock ? (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Low Stock</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.productDetailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={styles.detailValue}>
              {item.openingStock} {item.unit}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sale Price</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.salePrice)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>GST</Text>
            <Text style={styles.detailValue}>{item.gstRate}%</Text>
          </View>
        </View>

        {item.hsn || item.barcode || item.rack ? (
          <View style={styles.extraInfoRow}>
            {item.hsn ? (
              <Text style={styles.extraInfo}>HSN {item.hsn}</Text>
            ) : null}

            {item.barcode ? (
              <Text style={styles.extraInfo}>Barcode {item.barcode}</Text>
            ) : null}

            {item.rack ? (
              <Text style={styles.extraInfo}>Rack {item.rack}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
  {/* Left side - Back button + Product title */}
  <View style={styles.headerLeft}>
    <Pressable
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.buttonPressed,
      ]}
      onPress={() => router.replace('/dashboard')}
    >
      <Text style={styles.backIcon}>‹</Text>
    </Pressable>

    <View style={styles.headerTitleContainer}>
      
      <Text style={styles.headerTitle}>
        Manage Products
      </Text>
    </View>
  </View>

  {/* Right side - Profile */}
  <View style={styles.profileCircle}>
    <Text style={styles.profileText}>RS</Text>
  </View>
</View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={colors.mutedText}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Summary Cards */}
        <View
          style={[
            styles.summaryRow,
            isSmallScreen && styles.summaryRowSmall,
          ]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{products.length}</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.warningValue]}>
              {lowStockCount}
            </Text>
            <Text style={styles.summaryLabel}>Low Stock</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(stockValue)}
            </Text>
            <Text style={styles.summaryLabel}>Stock Value</Text>
          </View>
        </View>

        {/* Product List Header */}
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Product List</Text>

            <Text style={styles.listSubtitle}>
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'}
            </Text>
          </View>
        </View>

        {/* Product List */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredProducts.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>📦</Text>
              </View>

              <Text style={styles.emptyTitle}>
                {search ? 'No products found' : 'No products yet'}
              </Text>

              <Text style={styles.emptyDescription}>
                {search
                  ? 'Try searching with a different product name, HSN or barcode.'
                  : 'Add your first retail product to start managing your inventory.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Bottom Add Product Button */}
      <View style={styles.bottomActionContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.addProductButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push('/products/add')}
        >
          <Text style={styles.addProductIcon}>+</Text>
          <Text style={styles.addProductText}>Add Product</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 82,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 3,
    color: colors.mutedText,
    fontSize: 13,
  },

  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '800',
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  searchContainer: {
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchIcon: {
    color: colors.secondary,
    fontSize: 25,
    fontWeight: '700',
    marginRight: 9,
    marginTop: -3,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  clearText: {
    color: colors.mutedText,
    fontSize: 22,
    lineHeight: 23,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  summaryRowSmall: {
    gap: 6,
  },

  headerLeft: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
},

backButton: {
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},

backIcon: {
  color: colors.primary,
  fontSize: 30,
  lineHeight: 32,
  fontWeight: '400',
  marginTop: -3,
},

headerTitleContainer: {
  flex: 1,
},

  summaryCard: {
    flex: 1,
    minHeight: 72,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  warningValue: {
    color: colors.warning,
  },

  summaryLabel: {
    marginTop: 3,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },

  listHeader: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  listSubtitle: {
    marginTop: 2,
    color: colors.mutedText,
    fontSize: 12,
  },

  listContent: {
    paddingTop: 2,
    paddingBottom: 100,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  productCard: {
    backgroundColor: colors.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 9,
  },

  productTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  productNameContainer: {
    flex: 1,
    paddingRight: 8,
  },

  productName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  productBrand: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  lowStockBadge: {
    backgroundColor: '#FFF3DF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  lowStockBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
  },

  productDetailsRow: {
    flexDirection: 'row',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
  },

  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  extraInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },

  extraInfo: {
    color: colors.secondary,
    backgroundColor: '#EEF5F8',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 50,
  },

  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyIcon: {
    fontSize: 27,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 310,
  },

  bottomActionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  addProductButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  addProductIcon: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '500',
    marginRight: 8,
    marginTop: -2,
  },

  addProductText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
