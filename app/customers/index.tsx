import React, {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  Modal,
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

import { SafeAreaView } from
  'react-native-safe-area-context';

import {
  loadCustomers,
  removeCustomer,
} from '../../src/services/customerService';

import type { Customer } from '../../src/types/customer';

import { colors } from '../../src/theme/colors';

/* =================================
   VIEW CUSTOMER MODAL
================================= */

interface CustomerViewProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit: () => void;
}

function CustomerViewModal({
  visible,
  customer,
  onClose,
  onEdit,
}: CustomerViewProps) {
  if (!customer) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.formSafeArea}
        edges={['top', 'bottom']}
      >
        <View
          style={styles.formScreen}
        >
          {/* VIEW HEADER */}

          <View
            style={styles.formHeader}
          >
            <View
              style={
                styles.formHeaderLeft
              }
            >
              <Pressable
                onPress={onClose}
                style={
                  styles.formBackButton
                }
              >
                <Text
                  style={
                    styles.formBackIcon
                  }
                >
                  ‹
                </Text>
              </Pressable>

              <View>
                <Text
                  style={
                    styles.formHeaderTitle
                  }
                >
                  Customer Details
                </Text>

                <Text
                  style={
                    styles.formHeaderSubtitle
                  }
                >
                  View retail customer information
                </Text>
              </View>
            </View>

            <View
              style={styles.formLogo}
            >
              <Text
                style={
                  styles.formLogoText
                }
              >
                CA
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.formScroll
            }
          >
            {/* CUSTOMER PROFILE */}

            <View
              style={styles.viewCard}
            >
              <View
                style={
                  styles.viewProfileRow
                }
              >
                <View
                  style={
                    styles.viewAvatar
                  }
                >
                  <Text
                    style={
                      styles.viewAvatarText
                    }
                  >
                    {customer.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={
                    styles.viewProfileText
                  }
                >
                  <Text
                    style={
                      styles.viewCustomerName
                    }
                  >
                    {customer.name}
                  </Text>

                  <Text
                    style={
                      styles.viewCustomerMobile
                    }
                  >
                    {customer.mobile}
                  </Text>
                </View>
              </View>
            </View>

            {/* BASIC DETAILS */}

            <View
              style={styles.viewCard}
            >
              <Text
                style={styles.viewSectionTitle}
              >
                Basic Information
              </Text>

              <View
                style={styles.viewRow}
              >
                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    Customer Name
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    {customer.name}
                  </Text>
                </View>

                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    Mobile
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    {customer.mobile}
                  </Text>
                </View>
              </View>

              <View
                style={styles.viewRow}
              >
                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    GSTIN
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    {customer.gstin ||
                      'Unregistered'}
                  </Text>
                </View>

                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    State
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    {customer.state ||
                      '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ACCOUNT DETAILS */}

            <View
              style={styles.viewCard}
            >
              <Text
                style={styles.viewSectionTitle}
              >
                Account Details
              </Text>

              <View
                style={styles.viewRow}
              >
                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    Credit Days
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    {customer.creditDays ??
                      0}{' '}
                    days
                  </Text>
                </View>

                <View
                  style={styles.viewItem}
                >
                  <Text
                    style={
                      styles.viewLabel
                    }
                  >
                    Opening Balance
                  </Text>

                  <Text
                    style={
                      styles.viewValue
                    }
                  >
                    ₹
                    {Number(
                      customer.openingBalance ??
                        0,
                    ).toLocaleString(
                      'en-IN',
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={styles.viewFullItem}
              >
                <Text
                  style={
                    styles.viewLabel
                  }
                >
                  Customer Category /
                  Loyalty ID
                </Text>

                <Text
                  style={
                    styles.viewValue
                  }
                >
                  {customer.businessDetail ||
                    '—'}
                </Text>
              </View>

              <View
                style={styles.viewFullItem}
              >
                <Text
                  style={
                    styles.viewLabel
                  }
                >
                  Address
                </Text>

                <Text
                  style={
                    styles.viewValue
                  }
                >
                  {customer.address ||
                    '—'}
                </Text>
              </View>
            </View>

            {/* ACTION */}

            <Pressable
              onPress={onEdit}
              style={
                styles.viewEditButton
              }
            >
              <Text
                style={
                  styles.viewEditButtonText
                }
              >
                Edit Customer
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* =================================
   MAIN SCREEN
================================= */

export default function CustomersScreen() {
  const { width } =
    useWindowDimensions();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] =
    useState('');

  const [viewingCustomer, setViewingCustomer] =
    useState<Customer | null>(null);

  const [showView, setShowView] =
    useState(false);

  /* =================================
     LOAD
  ================================= */

  const refreshCustomers =
    useCallback(async () => {
      try {
        const data =
          await loadCustomers();

        setCustomers(data);
      } catch (error) {
        Alert.alert(
          'Unable to load customers',

          error instanceof Error
            ? error.message
            : 'Something went wrong.',
        );
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
    }, [refreshCustomers]),
  );

  /* =================================
     SEARCH
  ================================= */

  const filteredCustomers =
    customers.filter(
      (customer) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          customer.name
            .toLowerCase()
            .includes(query) ||

          customer.mobile.includes(
            query,
          ) ||

          (
            customer.gstin ?? ''
          )
            .toLowerCase()
            .includes(query) ||

          (
            customer.state ?? ''
          )
            .toLowerCase()
            .includes(query)
        );
      },
    );

  /* =================================
     SUMMARY
  ================================= */

  const customersWithBalance =
    customers.filter(
      (customer) =>
        Number(
          customer.openingBalance ??
            0,
        ) > 0,
    ).length;

  const totalReceivable =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.openingBalance ??
            0,
        ),
      0,
    );

  /* =================================
     ADD
  ================================= */

  const handleAddCustomer = () => {
    router.push('/customers/add');
  };

  /* =================================
     EDIT
  ================================= */

  const handleEditCustomer = (
    customer: Customer,
  ) => {
    setShowView(false);
    setViewingCustomer(null);

    router.push({
      pathname: '/customers/add',
      params: { customerId: customer.id },
    });
  };

  /* =================================
     VIEW
  ================================= */

  const handleViewCustomer = (
    customer: Customer,
  ) => {
    setViewingCustomer(customer);
    setShowView(true);
  };

  /* =================================
     DELETE
  ================================= */

  const handleDeleteCustomer = (
    customer: Customer,
  ) => {
    Alert.alert(
      'Delete Customer',

      `Are you sure you want to delete ${customer.name}?`,

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
              await removeCustomer(
                customer.id,
              );

              await refreshCustomers();

              if (
                viewingCustomer?.id ===
                customer.id
              ) {
                setViewingCustomer(
                  null,
                );

                setShowView(false);
              }

              Alert.alert(
                'Deleted',
                'Customer has been deleted successfully.',
              );
            } catch (error) {
              Alert.alert(
                'Unable to delete',

                error instanceof Error
                  ? error.message
                  : 'Something went wrong.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View
        style={styles.container}
      >
        {/* MAIN HEADER */}

        <View
          style={styles.header}
        >
          <View
            style={styles.headerLeft}
          >
            <Pressable
              onPress={() =>
                router.replace(
                  '/dashboard',
                )
              }
              style={
                styles.backButton
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
              style={styles.logo}
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
                Customers
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage your retail customers
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

        {/* CONTENT */}

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
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search customers..."
              placeholderTextColor={
                colors.mutedText
              }
              style={
                styles.searchInput
              }
            />

            {search.length >
              0 && (
              <Pressable
                onPress={() =>
                  setSearch('')
                }
                style={
                  styles.clearSearch
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

          {/* SUMMARY */}

          <View
            style={styles.summaryRow}
          >
            <View
              style={
                styles.summaryCard
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Customers
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {customers.length}
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                With Balance
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  customersWithBalance
                }
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Receivable
              </Text>

              <Text
                style={
                  styles.summaryValueSmall
                }
              >
                ₹
                {totalReceivable.toLocaleString(
                  'en-IN',
                )}
              </Text>
            </View>
          </View>

          {/* LIST HEADER */}

          <View
            style={styles.listHeader}
          >
            <View>
              <Text
                style={
                  styles.listTitle
                }
              >
                Customer List
              </Text>

              <Text
                style={
                  styles.listSubtitle
                }
              >
                Manage customers and receivables
              </Text>
            </View>
          </View>

          {/* LIST */}

          {filteredCustomers.length ===
          0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIconCircle
                }
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  👤
                </Text>
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {search
                  ? 'No customers found'
                  : 'No customers yet'}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? 'Try another customer name or mobile number.'
                  : 'Add your first retail customer to get started.'}
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.customerList
              }
            >
              {filteredCustomers.map(
                (customer) => {
                  const balance =
                    Number(
                      customer.openingBalance ??
                        0,
                    );

                  return (
                    <View
                      key={
                        customer.id
                      }
                      style={
                        styles.customerCard
                      }
                    >
                      {/* CUSTOMER TOP */}

                      <View
                        style={
                          styles.customerTopRow
                        }
                      >
                        <View
                          style={
                            styles.customerIdentity
                          }
                        >
                          <View
                            style={
                              styles.customerIcon
                            }
                          >
                            <Text
                              style={
                                styles.customerIconText
                              }
                            >
                              {customer.name
                                .charAt(
                                  0,
                                )
                                .toUpperCase()}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.customerMain
                            }
                          >
                            <Text
                              style={
                                styles.customerName
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {
                                customer.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.customerMobile
                              }
                            >
                              {
                                customer.mobile
                              }
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.balanceContainer
                          }
                        >
                          <Text
                            style={
                              styles.balanceLabel
                            }
                          >
                            Balance
                          </Text>

                          <Text
                            style={[
                              styles.balanceValue,

                              balance >
                                0 &&
                                styles.balanceValueDue,
                            ]}
                          >
                            ₹
                            {balance.toLocaleString(
                              'en-IN',
                            )}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.customerDivider
                        }
                      />

                      {/* DETAILS */}

                      <View
                        style={
                          styles.customerDetails
                        }
                      >
                        <View
                          style={
                            styles.detailItem
                          }
                        >
                          <Text
                            style={
                              styles.detailLabel
                            }
                          >
                            GSTIN
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {customer.gstin ||
                              'Unregistered'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailItem
                          }
                        >
                          <Text
                            style={
                              styles.detailLabel
                            }
                          >
                            State
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {customer.state ||
                              '—'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailItem
                          }
                        >
                          <Text
                            style={
                              styles.detailLabel
                            }
                          >
                            Credit
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {customer.creditDays ??
                              0}{' '}
                            days
                          </Text>
                        </View>
                      </View>

                      {customer.address ? (
                        <Text
                          style={
                            styles.customerAddress
                          }
                          numberOfLines={1}
                        >
                          {
                            customer.address
                          }
                        </Text>
                      ) : null}

                      {/* ACTION BUTTONS */}

                      <View
                        style={
                          styles.customerActions
                        }
                      >
                        <Pressable
                          onPress={() =>
                            handleViewCustomer(
                              customer,
                            )
                          }
                          style={
                            styles.viewButton
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
                          onPress={() =>
                            handleEditCustomer(
                              customer,
                            )
                          }
                          style={
                            styles.editButton
                          }
                        >
                          <Text
                            style={
                              styles.editButtonText
                            }
                          >
                            Edit
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            handleDeleteCustomer(
                              customer,
                            )
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          <Text
                            style={
                              styles.deleteButtonText
                            }
                          >
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          )}

          <View
            style={
              styles.bottomSpace
            }
          />
        </ScrollView>

        {/* ADD CUSTOMER */}

        <View
          style={
            styles.bottomActionContainer
          }
        >
          <Pressable
            onPress={handleAddCustomer}
            style={
              styles.bottomAddButton
            }
          >
            <Text
              style={
                styles.bottomAddIcon
              }
            >
              +
            </Text>

            <Text
              style={
                styles.bottomAddText
              }
            >
              Add Customer
            </Text>
          </Pressable>
        </View>

        {/* VIEW */}

        <CustomerViewModal
          visible={showView}
          customer={
            viewingCustomer
          }
          onClose={() => {
            setShowView(false);
            setViewingCustomer(
              null,
            );
          }}
          onEdit={() => {
            if (
              viewingCustomer
            ) {
              handleEditCustomer(
                viewingCustomer,
              );
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

/* =================================
   STYLES
================================= */

const styles = StyleSheet.create({
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
    backgroundColor:
      colors.gold,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 10,
  },

  logoText: {
    color: colors.primary,
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
    marginLeft: 10,
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* CONTENT */

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  contentLarge: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  /* SEARCH */

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
  },

  searchIcon: {
    color:
      colors.mutedText,
    fontSize: 25,
    marginRight: 8,
    marginTop: -2,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
  },

  clearSearch: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  clearSearchText: {
    color:
      colors.mutedText,
    fontSize: 22,
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  summaryCard: {
    flex: 1,
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

  summaryLabel: {
    color:
      colors.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },

  summaryValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4,
  },

  summaryValueSmall: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },

  /* LIST */

  listHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  listSubtitle: {
    color:
      colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  customerList: {
    gap: 10,
  },

  customerCard: {
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 14,
    padding: 14,
  },

  customerTopRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  customerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      '#E5F4F2',
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 11,
  },

  customerIconText: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '900',
  },

  customerMain: {
    flex: 1,
  },

  customerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  customerMobile: {
    color:
      colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  balanceContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  balanceLabel: {
    color:
      colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
  },

  balanceValue: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },

  balanceValueDue: {
    color: colors.warning,
  },

  customerDivider: {
    height: 1,
    backgroundColor:
      colors.border,
    marginVertical: 12,
  },

  customerDetails: {
    flexDirection: 'row',
    gap: 8,
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color:
      colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
  },

  detailValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  customerAddress: {
    color:
      colors.mutedText,
    fontSize: 11,
    marginTop: 10,
  },

  /* ACTIONS */

  customerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  viewButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.card,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  viewButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  editButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    backgroundColor:
      colors.secondary,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor:
      '#E7B7B4',
    backgroundColor:
      '#FFF7F6',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  deleteButtonText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '800',
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },

  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor:
      '#E5F4F2',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  emptyIcon: {
    fontSize: 25,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyText: {
    color:
      colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },

  /* BOTTOM ADD */

  bottomActionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor:
      colors.background,
    borderTopWidth: 1,
    borderTopColor:
      colors.border,
  },

  bottomAddButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    elevation: 4,
  },

  bottomAddIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
    marginRight: 7,
  },

  bottomAddText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 20,
  },

  /* FORM */

  formSafeArea: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  formScreen: {
    flex: 1,
    width: '100%',
    backgroundColor:
      colors.background,
  },

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

  formScroll: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  viewCard: {
    width: '100%',
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewAvatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor:
      '#E5F4F2',
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 14,
  },

  viewAvatarText: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '900',
  },

  viewProfileText: {
    flex: 1,
  },

  viewCustomerName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  viewCustomerMobile: {
    color:
      colors.mutedText,
    fontSize: 13,
    marginTop: 4,
  },

  viewSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },

  viewRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },

  viewItem: {
    flex: 1,
  },

  viewFullItem: {
    width: '100%',
    marginBottom: 16,
  },

  viewLabel: {
    color:
      colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
  },

  viewValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  viewEditButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 20,
  },

  viewEditButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
