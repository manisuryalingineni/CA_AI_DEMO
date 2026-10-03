import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadSales } from '../../src/services/saleService';
import { loadCustomers } from '../../src/services/customerService';
import { colors } from '../../src/theme/colors';
import type { Sale } from '../../src/types/sale';
import type { Customer } from '../../src/types/customer';

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPaymentLabel = (method: Sale['paymentMethod']) => {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'UPI':
      return 'UPI';
    case 'CARD':
      return 'Card';
    case 'CHEQUE':
      return 'Cheque';
    case 'CREDIT':
      return 'Credit';
    default:
      return method;
  }
};

const getStatusLabel = (status: Sale['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Partial';
    case 'DUE':
      return 'Due';
    default:
      return status;
  }
};

export default function SalesRegisterScreen() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [salesData, customersData] = await Promise.all([
        loadSales(),
        loadCustomers(),
      ]);

      setSales(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load sales register:', error);

      Alert.alert(
        'Unable to load sales',
        'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const [salesData, customersData] = await Promise.all([
        loadSales(),
        loadCustomers(),
      ]);

      setSales(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to refresh sales:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) {
      return 'Walk-in Customer';
    }

    const customer = customers.find(
      item => item.id === customerId
    );

    return customer?.name || 'Walk-in Customer';
  };

  const filteredSales = sales.filter(sale => {
    const customerName = getCustomerName(sale.customerId);

    const searchableText = [
      sale.invoiceNumber || '',
      customerName,
      sale.paymentMethod,
      sale.paymentStatus,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search.trim().toLowerCase());
  });

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0
  );

  const totalPaid = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.paidAmount || 0),
    0
  );

  const totalDue = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.dueAmount || 0),
    0
  );

  const renderSale = ({ item }: { item: Sale }) => {
    const customerName = getCustomerName(item.customerId);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.saleCard}
        onPress={() => {
          Alert.alert(
            item.invoiceNumber || 'Sale',
            `${customerName}\n\nTotal: ${formatCurrency(
              item.totalAmount
            )}\nPaid: ${formatCurrency(
              item.paidAmount
            )}\nDue: ${formatCurrency(
              item.dueAmount
            )}\n\nPayment: ${getPaymentLabel(
              item.paymentMethod
            )}`
          );
        }}
      >
        <View style={styles.saleTopRow}>
          <View style={styles.saleIcon}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.saleMain}>
            <Text
              style={styles.invoiceText}
              numberOfLines={1}
            >
              {item.invoiceNumber || 'Sale Invoice'}
            </Text>

            <Text
              style={styles.customerText}
              numberOfLines={1}
            >
              {customerName}
            </Text>

            <Text style={styles.dateText}>
              {formatDate(item.saleDate)}
            </Text>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              Total
            </Text>

            <Text style={styles.amountText}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.saleBottomRow}>
          <View style={styles.paymentPill}>
            <Text style={styles.paymentPillText}>
              {getPaymentLabel(item.paymentMethod)}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              item.paymentStatus === 'PAID'
                ? styles.statusPaid
                : styles.statusDue,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.paymentStatus === 'PAID'
                  ? styles.statusPaidText
                  : styles.statusDueText,
              ]}
            >
              {getStatusLabel(item.paymentStatus)}
            </Text>
          </View>

          {item.dueAmount > 0 && (
            <Text style={styles.dueText}>
              Due {formatCurrency(item.dueAmount)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Sales Register
            </Text>

            <Text style={styles.headerSubtitle}>
              View and track your POS sales
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/pos')}
          >
            <Ionicons
              name="add"
              size={22}
              color={colors.card}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search invoice or customer"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.muted}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Sales
            </Text>

            <Text style={styles.summaryValue}>
              {formatCurrency(totalSales)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Paid
            </Text>

            <Text
              style={[
                styles.summaryValue,
                styles.paidValue,
              ]}
            >
              {formatCurrency(totalPaid)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Due
            </Text>

            <Text
              style={[
                styles.summaryValue,
                styles.dueValue,
              ]}
            >
              {formatCurrency(totalDue)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Recent Sales
            </Text>

            <Text style={styles.sectionSubtitle}>
              {filteredSales.length} transaction
              {filteredSales.length === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/pos')}
            style={styles.newSaleButton}
          >
            <Ionicons
              name="add"
              size={17}
              color={colors.card}
            />

            <Text style={styles.newSaleText}>
              New Sale
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.teal}
            />

            <Text style={styles.stateText}>
              Loading sales...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSales}
            keyExtractor={item => item.id}
            renderItem={renderSale}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              filteredSales.length === 0
                ? styles.emptyList
                : styles.listContent
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.teal}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={34}
                    color={colors.teal}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No sales yet
                </Text>

                <Text style={styles.emptyText}>
                  POS sales will appear here after you
                  save your first sale.
                </Text>

                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/pos')}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={colors.card}
                  />

                  <Text style={styles.emptyButtonText}>
                    Create Sale
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBox: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },

  summaryValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  paidValue: {
    color: colors.success,
  },

  dueValue: {
    color: colors.error,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
  },

  newSaleButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  newSaleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.card,
  },

  listContent: {
    paddingBottom: 24,
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  saleCard: {
    backgroundColor: colors.card,
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  saleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  saleIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  saleMain: {
    flex: 1,
    minWidth: 0,
  },

  invoiceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  customerText: {
    marginTop: 3,
    fontSize: 12,
    color: colors.ink,
  },

  dateText: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
  },

  amountBox: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  amountLabel: {
    fontSize: 10,
    color: colors.muted,
  },

  amountText: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 12,
  },

  saleBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  paymentPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.background,
  },

  paymentPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  statusPaid: {
    backgroundColor: '#E7F5EF',
  },

  statusDue: {
    backgroundColor: '#FCEBE9',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  statusPaidText: {
    color: colors.success,
  },

  statusDueText: {
    color: colors.error,
  },

  dueText: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#EAF4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.card,
  },
});