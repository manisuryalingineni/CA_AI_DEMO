import React, {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
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

import { colors } from '../../src/theme/colors';


/* =================================
   TEMPORARY PURCHASE TYPE
================================= */

type PurchaseStatus =
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID';

interface PurchaseListItem {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PurchaseStatus;
}


/* =================================
   MAIN SCREEN
================================= */

export default function PurchasesScreen() {

  const { width } =
    useWindowDimensions();

  const [purchases, setPurchases] =
    useState<PurchaseListItem[]>([]);

  const [search, setSearch] =
    useState('');


  /* =================================
     LOAD PURCHASES
  ================================= */

  const refreshPurchases =
    useCallback(async () => {

      /*
       * Backend connection will be added
       * after colleague completes the
       * purchase service.
       *
       * For now this is UI-only.
       */

      setPurchases([]);

    }, []);


  /* =================================
     REFRESH WHEN SCREEN OPENS
  ================================= */

  useFocusEffect(
    useCallback(() => {

      refreshPurchases();

    }, [refreshPurchases]),
  );


  /* =================================
     SEARCH
  ================================= */

  const filteredPurchases =
    purchases.filter(
      (purchase) => {

        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          purchase.vendorName
            .toLowerCase()
            .includes(query)

          ||

          purchase.invoiceNumber
            .toLowerCase()
            .includes(query)
        );

      },
    );


  /* =================================
     SUMMARY
  ================================= */

  const totalPurchases =
    purchases.reduce(
      (sum, purchase) =>
        sum + purchase.totalAmount,
      0,
    );


  const totalPaid =
    purchases.reduce(
      (sum, purchase) =>
        sum + purchase.paidAmount,
      0,
    );


  const totalDue =
    purchases.reduce(
      (sum, purchase) =>
        sum + purchase.dueAmount,
      0,
    );


  /* =================================
     ADD PURCHASE
  ================================= */

  const handleAddPurchase = () => {

    router.push(
      '/purchases/add',
    );

  };


  /* =================================
     SCREEN
  ================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >

      <View
        style={styles.container}
      >

        {/* HEADER */}

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
                Purchases
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage stock purchases
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
              placeholder="Search purchases..."
              placeholderTextColor={
                colors.mutedText
              }
              style={
                styles.searchInput
              }
            />

            {search.length > 0 && (

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
                Purchases
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {purchases.length}
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
                Total Purchase
              </Text>

              <Text
                style={
                  styles.summaryValueSmall
                }
              >
                ₹
                {totalPurchases.toLocaleString(
                  'en-IN',
                )}
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
                Paid
              </Text>

              <Text
                style={
                  styles.summaryValueSmall
                }
              >
                ₹
                {totalPaid.toLocaleString(
                  'en-IN',
                )}
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
                Due
              </Text>

              <Text
                style={
                  styles.summaryValueSmall
                }
              >
                ₹
                {totalDue.toLocaleString(
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
                Purchase List
              </Text>

              <Text
                style={
                  styles.listSubtitle
                }
              >
                Manage purchases and stock inward
              </Text>

            </View>

          </View>


          {/* EMPTY / LIST */}

          {filteredPurchases.length === 0 ? (

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
                  P
                </Text>

              </View>


              <Text
                style={
                  styles.emptyTitle
                }
              >
                {search
                  ? 'No purchases found'
                  : 'No purchases yet'}
              </Text>


              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? 'Try another vendor or invoice number.'
                  : 'Add your first purchase to record stock inward.'}
              </Text>

            </View>

          ) : (

            <View
              style={
                styles.purchaseList
              }
            >

              {filteredPurchases.map(
                (purchase) => (

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
                        styles.purchaseTopRow
                      }
                    >

                      <View
                        style={
                          styles.purchaseIdentity
                        }
                      >

                        <View
                          style={
                            styles.purchaseIcon
                          }
                        >

                          <Text
                            style={
                              styles.purchaseIconText
                            }
                          >
                            P
                          </Text>

                        </View>


                        <View
                          style={
                            styles.purchaseMain
                          }
                        >

                          <Text
                            style={
                              styles.purchaseVendor
                            }
                            numberOfLines={1}
                          >
                            {purchase.vendorName}
                          </Text>

                          <Text
                            style={
                              styles.purchaseInvoice
                            }
                          >
                            Invoice: {
                              purchase.invoiceNumber ||
                              '—'
                            }
                          </Text>

                        </View>

                      </View>


                      <View
                        style={
                          styles.amountContainer
                        }
                      >

                        <Text
                          style={
                            styles.amountLabel
                          }
                        >
                          Total
                        </Text>

                        <Text
                          style={
                            styles.amountValue
                          }
                        >
                          ₹
                          {purchase.totalAmount.toLocaleString(
                            'en-IN',
                          )}
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
                        styles.purchaseDetails
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
                          Date
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {
                            purchase.purchaseDate
                          }
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
                          Paid
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          ₹
                          {purchase.paidAmount.toLocaleString(
                            'en-IN',
                          )}
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
                          Due
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          ₹
                          {purchase.dueAmount.toLocaleString(
                            'en-IN',
                          )}
                        </Text>

                      </View>


                      <View
                        style={
                          styles.statusContainer
                        }
                      >

                        <Text
                          style={[
                            styles.statusText,

                            purchase.paymentStatus ===
                              'PAID' &&
                              styles.statusPaid,

                            purchase.paymentStatus ===
                              'PARTIAL' &&
                              styles.statusPartial,

                            purchase.paymentStatus ===
                              'UNPAID' &&
                              styles.statusUnpaid,
                          ]}
                        >
                          {
                            purchase.paymentStatus
                          }
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

                    </View>

                  </View>

                ),
              )}

            </View>

          )}


          <View
            style={
              styles.bottomSpace
            }
          />

        </ScrollView>


        {/* ADD PURCHASE */}

        <View
          style={
            styles.bottomActionContainer
          }
        >

          <Pressable
            onPress={
              handleAddPurchase
            }
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
              Add Purchase
            </Text>

          </Pressable>

        </View>

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

  purchaseList: {
    gap: 10,
  },

  purchaseCard: {
    backgroundColor:
      colors.card,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 14,
    padding: 14,
  },

  purchaseTopRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  purchaseIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  purchaseIcon: {
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

  purchaseIconText: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '900',
  },

  purchaseMain: {
    flex: 1,
  },

  purchaseVendor: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  purchaseInvoice: {
    color:
      colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  amountLabel: {
    color:
      colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
  },

  amountValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },

  purchaseDivider: {
    height: 1,
    backgroundColor:
      colors.border,
    marginVertical: 12,
  },

  purchaseDetails: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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

  statusContainer: {
    alignItems: 'flex-end',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },

  statusPaid: {
    color: colors.success,
    backgroundColor: '#E8F7F1',
  },

  statusPartial: {
    color: colors.warning,
    backgroundColor: '#FFF5E5',
  },

  statusUnpaid: {
    color: colors.error,
    backgroundColor: '#FFF1F0',
  },


  /* ACTIONS */

  purchaseActions: {
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
    color: colors.teal,
    fontSize: 22,
    fontWeight: '900',
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

});