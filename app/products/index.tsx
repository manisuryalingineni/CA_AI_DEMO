
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
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

import {
  loadProducts,
  removeProduct,
} from '../../src/services/productService';

import type { Product } from '../../src/types/product';
import { colors } from '../../src/theme/colors';

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

export default function ProductsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

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
      (product.barcode ?? '').toLowerCase().includes(query) ||
      (product.brand ?? '').toLowerCase().includes(query) ||
      (product.rack ?? '').toLowerCase().includes(query)
    );
  });

  const totalStock = products.reduce(
    (sum, product) =>
      sum + Number(product.openingStock || 0),
    0,
  );

  const totalValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.openingStock || 0) *
        Number(product.purchasePrice || 0),
    0,
  );

  const formatCurrency = (value: number) => {
    return `₹${Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProduct(product.id);
              await loadData();

              if (selectedProduct?.id === product.id) {
                setSelectedProduct(null);
              }
            } catch (error) {
              console.error('Delete product error:', error);
              Alert.alert(
                'Error',
                'Unable to delete the product.',
              );
            }
          },
        },
      ],
    );
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
            <Text style={styles.headerTitle}>Products</Text>
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
          {/* PAGE TITLE */}
          <View style={styles.pageHeading}>
            <Text style={styles.pageTitle}>Products</Text>

            <Text style={styles.pageDescription}>
              Manage products, pricing, GST and stock information.
            </Text>
          </View>

          {/* SUMMARY */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Total Products
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {products.length}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Total Stock
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {totalStock}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Stock Value
              </Text>

              <Text
                style={styles.summaryCurrencyValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {formatCurrency(totalValue)}
              </Text>
            </View>
          </View>

          {/* SEARCH */}
          <View style={styles.searchCard}>
            <Text style={styles.searchLabel}>
              Search Products
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by product, HSN, barcode, brand or rack"
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
          </View>

          {/* LIST HEADER */}
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>
                Product List
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
                  : 'Add your first product to start managing inventory.'}
              </Text>

              {!search && (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/products/add')}
                >
                  <Text style={styles.emptyButtonText}>
                    Add Product
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.productList}>
              {filteredProducts.map((product) => (
                <View
                  key={product.id}
                  style={styles.productCard}
                >
                  {/* PRODUCT HEADER */}
                  <View style={styles.productTopRow}>
                    <View style={styles.productIdentity}>
                      <View style={styles.productAvatar}>
                        <Text style={styles.productAvatarText}>
                          {product.name
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.productNameArea}>
                        <Text
                          style={styles.productName}
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>

                        <Text style={styles.productMeta}>
                          {product.unit}
                          {product.hsn
                            ? `  •  HSN ${product.hsn}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gstBadge}>
                      <Text style={styles.gstText}>
                        GST {product.gstRate}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* PRODUCT DETAILS */}
                  <View
                    style={[
                      styles.detailsGrid,
                      isWide && styles.detailsGridWide,
                    ]}
                  >
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Sale Price
                      </Text>

                      <Text style={styles.detailValue}>
                        {formatCurrency(product.salePrice)}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Purchase Price
                      </Text>

                      <Text style={styles.detailValue}>
                        {formatCurrency(product.purchasePrice)}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Stock
                      </Text>

                      <Text
                        style={[
                          styles.detailValue,
                          Number(product.openingStock) <= 0 &&
                            styles.stockEmpty,
                        ]}
                      >
                        {product.openingStock} {product.unit}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Brand
                      </Text>

                      <Text style={styles.detailValue}>
                        {product.brand || '—'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Rack
                      </Text>

                      <Text style={styles.detailValue}>
                        {product.rack || '—'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Barcode
                      </Text>

                      <Text
                        style={styles.detailValue}
                        numberOfLines={1}
                      >
                        {product.barcode || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* CUSTOMER-STYLE ACTION BUTTONS */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={styles.viewButton}
                      onPress={() =>
                        setSelectedProduct(product)
                      }
                    >
                      <Text style={styles.viewButtonText}>
                        View
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        router.push(
                          `/products/add?productId=${product.id}`,
                        )
                      }
                    >
                      <Text style={styles.editButtonText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(product)}
                    >
                      <Text style={styles.deleteButtonText}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM ADD BUTTON */}
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

      {/* VIEW PRODUCT */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isWide && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Product Details
                </Text>

                <Text style={styles.modalSubtitle}>
                  Product information
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() => setSelectedProduct(null)}
              >
                <Text style={styles.modalCloseText}>
                  ×
                </Text>
              </Pressable>
            </View>

            {selectedProduct && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={
                  styles.modalContent
                }
              >
                <View style={styles.modalProductHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedProduct.name
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.modalProductName}>
                      {selectedProduct.name}
                    </Text>

                    <Text style={styles.modalProductMeta}>
                      {selectedProduct.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalDetailsGrid}>
                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      HSN
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.hsn || '—'}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      GST Rate
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.gstRate}%
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Sale Price
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {formatCurrency(
                        selectedProduct.salePrice,
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Purchase Price
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {formatCurrency(
                        selectedProduct.purchasePrice,
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Opening Stock
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.openingStock}{' '}
                      {selectedProduct.unit}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Brand
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.brand || '—'}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Rack
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.rack || '—'}
                    </Text>
                  </View>

                  <View style={styles.modalDetail}>
                    <Text style={styles.modalDetailLabel}>
                      Barcode
                    </Text>

                    <Text style={styles.modalDetailValue}>
                      {selectedProduct.barcode || '—'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.modalEditButton}
                  onPress={() => {
                    const productId =
                      selectedProduct.id;

                    setSelectedProduct(null);

                    router.push(
                      `/products/add?productId=${productId}`,
                    );
                  }}
                >
                  <Text style={styles.modalEditText}>
                    Edit Product
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

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
    fontSize: 18,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#C8D6E1',
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 110,
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

  pageHeading: {
    marginBottom: 16,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },

  pageDescription: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },

  summaryCurrencyValue: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },

  searchCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  searchLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  searchInput: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
  },

  listHeader: {
    marginBottom: 12,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  listSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },

  productList: {
    gap: 12,
  },

  productCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 15,
  },

  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  productAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  productAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  productNameArea: {
    flex: 1,
    minWidth: 0,
  },

  productName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },

  productMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  gstBadge: {
    backgroundColor: '#E7F5F3',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 10,
  },

  gstText: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  detailsGridWide: {
    gap: 0,
  },

  detailItem: {
    width: '48%',
    minWidth: 130,
    marginBottom: 8,
  },

  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },

  stockEmpty: {
    color: COLORS.error,
  },

  /*
   * SAME CUSTOMER-LIST BUTTON STYLE
   */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  viewButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#DDE6EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewButtonText: {
    color:colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  editButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  deleteButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F0D3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  emptyButton: {
    backgroundColor: '#07867D',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 16,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(242,246,248,0.97)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  addButton: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    height: 48,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,35,61,0.55)',
    justifyContent: 'center',
    padding: 18,
  },

  modalCard: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
  },

  modalCardWide: {
    maxWidth: 650,
    alignSelf: 'center',
  },

  modalHeader: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: '#C8D6E1',
    fontSize: 12,
    marginTop: 3,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    color: COLORS.navy,
    fontSize: 24,
    lineHeight: 26,
  },

  modalContent: {
    padding: 18,
    paddingBottom: 22,
  },

  modalProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  modalProductName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },

  modalProductMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },

  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  modalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  modalDetail: {
    width: '50%',
    paddingRight: 10,
    marginBottom: 15,
  },

  modalDetailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },

  modalDetailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },

  modalEditButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  modalEditText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
