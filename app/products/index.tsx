import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { loadProducts } from '../../src/services/productService';
import type { Product } from '../../src/types/product';

const COLORS = {
  navy: '#08233D',
  secondaryNavy: '#145784',
  teal: '#07867D',
  gold: '#F6BD43',
  background: '#F2F6F8',
  card: '#FFFFFF',
  text: '#12243A',
  muted: '#6B7C8D',
  border: '#DDE6EC',
  success: '#087A59',
  error: '#B33B34',
};

export default function StockScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isWide = width >= 800;

  const loadData = useCallback(async () => {
    try {
      const data = await loadProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Unable to load products.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      product.name.toLowerCase().includes(query) ||
      (product.hsn ?? '').toLowerCase().includes(query) ||
      product.unit.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (value: number) => {
    return `₹${Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>

          <View>
            <Text style={styles.headerTitle}>Stock</Text>
            <Text style={styles.headerSubtitle}>
              Retail inventory
            </Text>
          </View>
        </View>

        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>RS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.content,
            isWide && styles.contentWide,
          ]}
        >
          {/* PAGE HEADING */}
          <View style={styles.pageHeading}>
            <Text style={styles.pageTitle}>Stock</Text>

            <Text style={styles.pageDescription}>
              Check available stock and product details.
            </Text>
          </View>

          {/* SEARCH */}
          <View style={styles.searchCard}>
            <Text style={styles.searchLabel}>
              Search Products
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by product, HSN or unit"
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
          </View>

          {/* LIST HEADER */}
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>
                Available Stock
              </Text>

              <Text style={styles.listSubtitle}>
                {filteredProducts.length} product
                {filteredProducts.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {/* PRODUCT LIST */}
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No Products Found
              </Text>

              <Text style={styles.emptyText}>
                {search
                  ? 'Try changing your search.'
                  : 'No products are available.'}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.productList,
                isWide && styles.productListWide,
              ]}
            >
              {filteredProducts.map((product) => {
                const stock = Number(
                  product.openingStock || 0,
                );

                const isOutOfStock = stock <= 0;

                return (
                  <View
                    key={product.id}
                    style={[
                      styles.productCard,
                      isWide && styles.productCardWide,
                    ]}
                  >
                    {/* LEFT CONTENT */}
                    <View style={styles.productContent}>
                      <Text
                        style={styles.productName}
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>

                      {/* HSN + PRICE */}
                      <View style={styles.productSubRow}>
                        <Text
                          style={styles.productSubText}
                          numberOfLines={1}
                        >
                          HSN - {product.hsn || '-'}
                        </Text>

                        <Text style={styles.separator}>
                          •
                        </Text>

                        <Text
                          style={styles.productSubText}
                          numberOfLines={1}
                        >
                          Price -{' '}
                          {formatCurrency(product.salePrice)}
                        </Text>
                      </View>

                      {/* GST */}
                      <View style={styles.gstRow}>
                        <Text style={styles.gstLabel}>
                          GST
                        </Text>

                        <Text style={styles.gstValue}>
                          {product.gstRate ?? '-'}%
                        </Text>
                      </View>

                      {/* AVAILABLE BADGE */}
                      <View
                        style={[
                          styles.statusBadge,
                          isOutOfStock &&
                            styles.statusBadgeOut,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isOutOfStock &&
                              styles.statusTextOut,
                          ]}
                        >
                          {isOutOfStock
                            ? 'OUT OF STOCK'
                            : 'AVAILABLE'}
                        </Text>
                      </View>
                    </View>

                    {/* RIGHT STOCK */}
                    <View style={styles.stockSection}>
                      <Text style={styles.stockLabel}>
                        STOCK
                      </Text>

                      <Text
                        style={[
                          styles.stockValue,
                          isOutOfStock &&
                            styles.stockValueEmpty,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {stock}
                      </Text>

                      <Text
                        style={styles.stockUnit}
                        numberOfLines={1}
                      >
                        {product.unit || '-'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD PRODUCT BUTTON */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/products/add')}
        >
          <Text style={styles.addButtonText}>
            Add Product
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* HEADER */
  header: {
    height: 76,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  backText: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '400',
    marginTop: -3,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  logoText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#C8D6E1',
    fontSize: 11,
    marginTop: 2,
  },

  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* SCROLL */
  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 105,
  },

  scrollContentWide: {
    paddingHorizontal: 24,
  },

  content: {
    width: '100%',
  },

  contentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  /* PAGE TITLE */
  pageHeading: {
    marginBottom: 14,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },

  pageDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },

  /* SEARCH */
  searchCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 17,
  },

  searchLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },

  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 13,
    color: COLORS.text,
    fontSize: 13,
  },

  /* LIST */
  listHeader: {
    marginBottom: 10,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },

  listSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },

  productList: {
    gap: 10,
  },

  productListWide: {
    gap: 12,
  },

  /* PRODUCT CARD */
  productCard: {
    width: '100%',
    minHeight: 118,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productCardWide: {
    minHeight: 122,
  },

  productContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  productName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  productSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap',
  },

  productSubText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  separator: {
    color: COLORS.border,
    fontSize: 10,
    marginHorizontal: 6,
  },

  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  gstLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
  },

  gstValue: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '800',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7F5F3',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 7,
  },

  statusBadgeOut: {
    backgroundColor: '#FFF1F0',
  },

  statusText: {
    color: COLORS.success,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  statusTextOut: {
    color: COLORS.error,
  },

  /* STOCK RIGHT SIDE */
  stockSection: {
    width: 82,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: 12,
  },

  stockLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  stockValue: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: 2,
    maxWidth: 65,
  },

  stockValueEmpty: {
    color: COLORS.error,
  },

  stockUnit: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  /* EMPTY */
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },

  /* BOTTOM BUTTON */
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 13,
    backgroundColor: 'rgba(242,246,248,0.97)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  addButton: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    height: 46,
    borderRadius: 11,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});