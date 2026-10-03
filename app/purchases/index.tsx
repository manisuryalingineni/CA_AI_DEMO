import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
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
  useFocusEffect,
} from 'expo-router';

 
import { Picker } from '@react-native-picker/picker';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
 
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
  

import { colors } from '../../src/theme/colors';

import {
  loadPurchaseRfqs,
  loadPurchases,
} from '../../src/services/purchaseService';

import type {
  PurchaseListRow,
  PurchaseRfqListRow,
} from '../../src/repositories/purchaseRepository';


type PurchaseDocumentMode =
  | 'PURCHASE'
  | 'RFQ';


const formatCurrency = (
  value: number,
) =>
  `₹${Number(value || 0).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;


const escapeHtml = (
  value: string | number | null | undefined,
) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');


async function savePurchasePdf(
  purchase: PurchaseListRow,
) {
  try {
    const purchaseNumber =
      purchase.purchase_number ||
      `Purchase-${Date.now()}`;

    const vendorName =
      purchase.vendor_name ||
      'Vendor';

    const supplyLabel =
      purchase.supply_type === 'OTHER_STATE'
        ? 'Other State (IGST)'
        : 'Within state (CGST + SGST)';

    const taxRows =
      purchase.supply_type === 'OTHER_STATE'
        ? `
          <div class="total-row">
            <span>IGST</span>
            <strong>${formatCurrency(purchase.igst_amount)}</strong>
          </div>
        `
        : `
          <div class="total-row">
            <span>CGST</span>
            <strong>${formatCurrency(purchase.cgst_amount)}</strong>
          </div>
          <div class="total-row">
            <span>SGST</span>
            <strong>${formatCurrency(purchase.sgst_amount)}</strong>
          </div>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            @page { margin: 22px; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #18222d;
              padding: 10px;
              font-size: 13px;
            }
            .header {
              border-bottom: 3px solid #0d8f85;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            .business-name {
              font-size: 26px;
              font-weight: 800;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #5d6975;
              font-size: 13px;
            }
            .bill-title {
              font-size: 21px;
              font-weight: 800;
              margin-bottom: 16px;
            }
            .info-box {
              border: 1px solid #bdded9;
              background: #eef9f7;
              padding: 12px;
              margin-bottom: 16px;
            }
            .info-row {
              margin-bottom: 6px;
              line-height: 18px;
            }
            .label { font-weight: 700; }
            .totals {
              width: 55%;
              margin-left: auto;
              margin-top: 18px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 7px 0;
              border-bottom: 1px solid #e1e5e8;
            }
            .grand-total {
              display: flex;
              justify-content: space-between;
              padding-top: 10px;
              font-size: 21px;
              font-weight: 800;
            }
            .payment,
            .notes {
              margin-top: 18px;
              padding: 12px;
              border: 1px solid #e1e5e8;
            }
            .payment { background: #f7f9fa; }
            .payment-row { margin-bottom: 6px; }
            .footer {
              margin-top: 50px;
              text-align: right;
            }
            .muted {
              color: #6b7580;
              font-size: 10px;
              margin-top: 28px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">Retail Shop</div>
            <div class="subtitle">Purchase Bill</div>
          </div>

          <div class="bill-title">
            Purchase bill: ${escapeHtml(purchaseNumber)}
          </div>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Vendor:</span>
              ${escapeHtml(vendorName)}
            </div>
            <div class="info-row">
              <span class="label">Purchase Date:</span>
              ${escapeHtml(purchase.purchase_date)}
            </div>
            <div class="info-row">
              <span class="label">Due Date:</span>
              ${escapeHtml(purchase.due_date || '-')}
            </div>
            <div class="info-row">
              <span class="label">Vendor Invoice:</span>
              ${escapeHtml(purchase.invoice_number || '-')}
            </div>
            <div class="info-row">
              <span class="label">Supply:</span>
              ${escapeHtml(supplyLabel)}
            </div>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Taxable</span>
              <strong>${formatCurrency(purchase.subtotal)}</strong>
            </div>
            ${taxRows}
            <div class="grand-total">
              <span>Grand total</span>
              <span>${formatCurrency(purchase.total_amount)}</span>
            </div>
          </div>

          <div class="payment">
            <div class="payment-row">
              <strong>Paid:</strong> ${formatCurrency(purchase.paid_amount)}
            </div>
            <div class="payment-row">
              <strong>Due:</strong> ${formatCurrency(purchase.due_amount)}
            </div>
            <div class="payment-row">
              <strong>Status:</strong> ${escapeHtml(purchase.payment_status)}
            </div>
          </div>

          ${purchase.notes
            ? `
                <div class="notes">
                  <strong>Notes:</strong>
                  ${escapeHtml(purchase.notes)}
                </div>
              `
            : ''}

          <div class="footer">
            <strong>Authorised Signatory</strong>
            <div>Retail Shop</div>
          </div>

          <div class="muted">
            Computer-generated purchase document.
          </div>
        </body>
      </html>
    `;

    const pdf =
      await Print.printToFileAsync({
        html,
        base64: true,
      });

    if (Platform.OS === 'android') {
      const {
        StorageAccessFramework,
      } = FileSystem;

      const documentsUri =
        StorageAccessFramework
          .getUriForDirectoryInRoot(
            'Documents',
          );

      const permission =
        await StorageAccessFramework
          .requestDirectoryPermissionsAsync(
            documentsUri,
          );

      if (!permission.granted) {
        Alert.alert(
          'PDF not saved',
          'Please allow access to the Documents folder.',
        );
        return;
      }

      if (!pdf.base64) {
        throw new Error(
          'PDF data was not generated.',
        );
      }

      const safeName =
        purchaseNumber.replace(
          /[^a-zA-Z0-9-_]/g,
          '_',
        );

      const targetUri =
        await StorageAccessFramework
          .createFileAsync(
            permission.directoryUri,
            safeName,
            'application/pdf',
          );

      await FileSystem.writeAsStringAsync(
        targetUri,
        pdf.base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      );

      Alert.alert(
        'PDF saved',
        `${purchaseNumber}.pdf saved successfully in Documents.`,
      );
      return;
    }

    Alert.alert(
      'PDF created',
      'PDF created successfully.',
    );
  } catch (error) {
    console.error(
      'savePurchasePdf error:',
      error,
    );

    Alert.alert(
      'Unable to save PDF',
      error instanceof Error
        ? error.message
        : 'Something went wrong while creating the PDF.',
    );
  }
}


export default function PurchasesScreen() {
  const { width } =
    useWindowDimensions();

 
  const insets =
    useSafeAreaInsets();

 
  const isSmall =
    width < 380;

  const isTablet =
    width >= 760;
  

  const [purchases, setPurchases] =
    useState<PurchaseListRow[]>([]);

  const [rfqs, setRfqs] =
    useState<PurchaseRfqListRow[]>([]);

  const [search, setSearch] =
    useState('');

  const [activeDocumentType, setActiveDocumentType] =
    useState<PurchaseDocumentMode>('PURCHASE');

  const [loading, setLoading] =
    useState(true);


  const refreshData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          purchaseData,
          rfqData,
        ] = await Promise.all([
          loadPurchases(),
          loadPurchaseRfqs(),
        ]);

        setPurchases(
          purchaseData,
        );

        setRfqs(
          rfqData,
        );
      } catch (error) {
        Alert.alert(
          'Unable to load purchases',
          error instanceof Error
            ? error.message
            : 'Something went wrong.',
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );


  const filteredPurchases =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return purchases;
      }

      return purchases.filter(
        purchase => {
          const vendorName =
            purchase.vendor_name ?? '';

          const purchaseNumber =
            purchase.purchase_number ?? '';

          const invoiceNumber =
            purchase.invoice_number ?? '';

          return (
            vendorName
              .toLowerCase()
              .includes(query) ||
            purchaseNumber
              .toLowerCase()
              .includes(query) ||
            invoiceNumber
              .toLowerCase()
              .includes(query)
          );
        },
      );
    }, [
      purchases,
      search,
    ]);


  const filteredRfqs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return rfqs;
      }

      return rfqs.filter(
        rfq => {
          const vendorName =
            rfq.vendor_name ?? '';

          const rfqNumber =
            rfq.rfq_number ?? '';

          return (
            vendorName
              .toLowerCase()
              .includes(query) ||
            rfqNumber
              .toLowerCase()
              .includes(query)
          );
        },
      );
    }, [
      rfqs,
      search,
    ]);


  const summary =
    useMemo(() => {
      return purchases.reduce(
        (
          current,
          purchase,
        ) => {
          current.total +=
            Number(
              purchase.total_amount,
            ) || 0;

          current.paid +=
            Number(
              purchase.paid_amount,
            ) || 0;

          current.due +=
            Number(
              purchase.due_amount,
            ) || 0;

          return current;
        },
        {
          total: 0,
          paid: 0,
          due: 0,
        },
      );
    }, [purchases]);


  const openAddScreen = (
    type: PurchaseDocumentMode,
  ) => {
    router.push({
      pathname: '/purchases/add',
      params: {
        type,
      },
    });
  };


  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
      ]}
    >
      <View
        style={styles.container}
      >
        <View
          style={[
            styles.header,
            isSmall &&
              styles.headerSmall,
          ]}
        >
          <View
            style={styles.headerLeft}
          >
            <Pressable
              style={styles.backButton}
              onPress={() =>
                router.replace(
                  '/dashboard',
                )
              }
            >
              <Text
                style={styles.backIcon}
              >
                ‹
              </Text>
            </Pressable>

            <View
              style={styles.logo}
            >
              <Text
                style={styles.logoText}
              >
                CA
              </Text>
            </View>

            <View
              style={styles.headerTextBlock}
            >
              <Text
                style={[
                  styles.headerTitle,
                  isSmall &&
                    styles.headerTitleSmall,
                ]}
              >
                Purchases
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                Vendor and inward stock flow
              </Text>
            </View>
          </View>

          <View
            style={styles.profileCircle}
          >
            <Text
              style={styles.profileText}
            >
              RS
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            isSmall &&
              styles.contentSmall,
            width >= 900 &&
              styles.contentLarge,
          ]}
        >
          <View
            style={[
              styles.purchaseFlowHeader,
              isSmall &&
                styles.purchaseFlowHeaderSmall,
            ]}
          >
            <View
              style={styles.titleArea}
            >
              <Text
                style={[
                  styles.flowTitle,
                  isSmall &&
                    styles.flowTitleSmall,
                ]}
              >
                {activeDocumentType === 'PURCHASE'
                  ? 'Purchase bills'
                  : 'Request for quotation'}
              </Text>

              <Text
                style={styles.flowSubtitle}
              >
                {activeDocumentType === 'PURCHASE'
                  ? 'Purchase → Stock → Payable'
                  : 'RFQ → Purchase Order → Purchase'}
              </Text>
            </View>

            <Pressable
              style={[
                styles.topAddButton,
                isSmall &&
                  styles.topAddButtonSmall,
              ]}
              onPress={() =>
                openAddScreen(
                  activeDocumentType,
                )
              }
            >
              <Text
                style={styles.topAddButtonText}
              >
                {activeDocumentType === 'PURCHASE'
                  ? '+ Add'
                  : '+ Add RFQ'}
              </Text>
            </Pressable>
          </View>

          <View
            style={styles.documentTabs}
          >
            <Pressable
              style={[
                styles.documentTab,
                activeDocumentType === 'PURCHASE' &&
                  styles.documentTabActive,
              ]}
              onPress={() => {
                setSearch('');
                setActiveDocumentType(
                  'PURCHASE',
                );
              }}
            >
              <Text
                style={[
                  styles.documentTabText,
                  activeDocumentType === 'PURCHASE' &&
                    styles.documentTabTextActive,
                ]}
              >
                Purchase Bill
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.documentTab,
                activeDocumentType === 'RFQ' &&
                  styles.documentTabActive,
              ]}
              onPress={() => {
                setSearch('');
                setActiveDocumentType(
                  'RFQ',
                );
              }}
            >
              <Text
                style={[
                  styles.documentTabText,
                  activeDocumentType === 'RFQ' &&
                    styles.documentTabTextActive,
                ]}
              >
                RFQ
              </Text>
            </Pressable>
          </View>

          <View
            style={
              activeDocumentType === 'PURCHASE'
                ? styles.infoBanner
                : styles.rfqInfoBanner
            }
          >
            <Text
              style={
                activeDocumentType === 'PURCHASE'
                  ? styles.infoBannerText
                  : styles.rfqInfoText
              }
            >
              {activeDocumentType === 'PURCHASE'
                ? 'Saved purchase bills update stock inward and vendor payable.'
                : 'Requests for quotation are saved separately. RFQs do not update stock or vendor payable.'}
            </Text>
          </View>

          <View
            style={styles.searchContainer}
          >
            <Text
              style={styles.searchIcon}
            >
              ⌕
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={
                activeDocumentType === 'PURCHASE'
                  ? 'Search purchase, vendor or invoice...'
                  : 'Search RFQ or vendor...'
              }
              placeholderTextColor={
                colors.mutedText
              }
              style={styles.searchInput}
            />
          </View>

          {activeDocumentType === 'PURCHASE'
            ? (
              <>
                <View
                  style={styles.summaryGrid}
                >
                  <SummaryBox
                    label="Bills"
                    value={String(
                      purchases.length,
                    )}
                    isTablet={isTablet}
                  />

                  <SummaryBox
                    label="Purchases"
                    value={formatCurrency(
                      summary.total,
                    )}
                    smallValue
                    isTablet={isTablet}
                  />

                  <SummaryBox
                    label="Paid"
                    value={formatCurrency(
                      summary.paid,
                    )}
                    smallValue
                    isTablet={isTablet}
                  />

                  <SummaryBox
                    label="To Pay"
                    value={formatCurrency(
                      summary.due,
                    )}
                    smallValue
                    isTablet={isTablet}
                  />
                </View>

                {loading
                  ? (
                    <EmptyCard
                      title="Loading purchases..."
                    />
                  )
                  : filteredPurchases.length === 0
                    ? (
                      <EmptyCard
                        icon="📥"
                        title={
                          search
                            ? 'No purchases found'
                            : 'No purchase bills yet'
                        }
                        description={
                          search
                            ? 'Try another search.'
                            : 'Tap + Add to create the first purchase bill.'
                        }
                      />
                    )
                    : (
                      <View
                        style={styles.purchaseList}
                      >
                        {filteredPurchases.map(
                          purchase => (
                            <View
                              key={purchase.id}
                              style={[
                                styles.purchaseCard,
                                isSmall &&
                                  styles.purchaseCardSmall,
                              ]}
                            >
                              <View
                                style={[
                                  styles.purchaseCardTop,
                                  isSmall &&
                                    styles.purchaseCardTopSmall,
                                ]}
                              >
                                <View
                                  style={styles.cardMain}
                                >
                                  <Text
                                    style={styles.purchaseNumber}
                                  >
                                    {purchase.purchase_number}
                                    {' • '}
                                    {purchase.vendor_name || 'Vendor'}
                                  </Text>

                                  <Text
                                    style={styles.purchaseMeta}
                                  >
                                    Purchase bill •{' '}
                                    {purchase.purchase_date}
                                    {purchase.invoice_number
                                      ? ` • Ref ${purchase.invoice_number}`
                                      : ''}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.purchaseAmountArea,
                                    isSmall &&
                                      styles.purchaseAmountAreaSmall,
                                  ]}
                                >
                                  <Text
                                    style={styles.purchaseAmount}
                                  >
                                    {formatCurrency(
                                      purchase.total_amount,
                                    )}
                                  </Text>

                                  <Text
                                    style={[
                                      styles.purchaseStatus,
                                      purchase.payment_status === 'PAID' &&
                                        styles.statusPaid,
                                      purchase.payment_status === 'PARTIAL' &&
                                        styles.statusPartial,
                                      purchase.payment_status === 'UNPAID' &&
                                        styles.statusUnpaid,
                                    ]}
                                  >
                                    {purchase.payment_status}
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={styles.purchaseDivider}
                              />

                              <View
                                style={[
                                  styles.purchaseStats,
                                  isSmall &&
                                    styles.purchaseStatsSmall,
                                ]}
                              >
                                <PurchaseStat
                                  label="Taxable"
                                  value={formatCurrency(
                                    purchase.subtotal,
                                  )}
                                  isSmall={isSmall}
                                />

                                <PurchaseStat
                                  label="GST"
                                  value={formatCurrency(
                                    purchase.gst_amount,
                                  )}
                                  isSmall={isSmall}
                                />

                                <PurchaseStat
                                  label="Due"
                                  value={formatCurrency(
                                    purchase.due_amount,
                                  )}
                                  isSmall={isSmall}
                                />
                              </View>

                              <View
                                style={[
                                  styles.purchaseActions,
                                  isSmall &&
                                    styles.purchaseActionsSmall,
                                ]}
                              >
                                <Pressable
                                  style={[
                                    styles.viewButton,
                                    isSmall &&
                                      styles.purchaseActionButtonSmall,
                                  ]}
                                  onPress={() =>
                                    Alert.alert(
                                      purchase.purchase_number,
                                      `${purchase.vendor_name || 'Vendor'}\nTotal: ${formatCurrency(
                                        purchase.total_amount,
                                      )}\nDue: ${formatCurrency(
                                        purchase.due_amount,
                                      )}`,
                                    )
                                  }
                                >
                                  <Text
                                    style={styles.viewButtonText}
                                  >
                                    View
                                  </Text>
                                </Pressable>

                                <Pressable
                                  style={[
                                    styles.pdfButton,
                                    isSmall &&
                                      styles.purchaseActionButtonSmall,
                                  ]}
                                  onPress={() =>
                                    savePurchasePdf(
                                      purchase,
                                    )
                                  }
                                >
                                  <Text
                                    style={styles.pdfButtonText}
                                  >
                                    PDF
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ),
                        )}
                      </View>
                    )}
              </>
            )
            : (
              <>
                {loading
                  ? (
                    <EmptyCard
                      title="Loading RFQs..."
                    />
                  )
                  : filteredRfqs.length === 0
                    ? (
                      <View
                        style={styles.rfqEmptyCard}
                      >
                        <Text
                          style={styles.rfqEmptyIcon}
                        >
                          📄
                        </Text>

                        <Text
                          style={styles.emptyTitle}
                        >
                          {search
                            ? 'No RFQs found'
                            : 'No RFQs yet'}
                        </Text>

                        <Text
                          style={styles.emptyText}
                        >
                          {search
                            ? 'Try another search.'
                            : 'Tap + Add RFQ to create your first request for quotation.'}
                        </Text>

                        {!search
                          ? (
                            <Pressable
                              style={styles.rfqPrimaryButton}
                              onPress={() =>
                                openAddScreen(
                                  'RFQ',
                                )
                              }
                            >
                              <Text
                                style={styles.rfqPrimaryButtonText}
                              >
                                + Add RFQ
                              </Text>
                            </Pressable>
                          )
                          : null}
                      </View>
                    )
                    : (
                      <View
                        style={styles.purchaseList}
                      >
                        {filteredRfqs.map(
                          rfq => (
                            <View
                              key={rfq.id}
                              style={[
                                styles.purchaseCard,
                                isSmall &&
                                  styles.purchaseCardSmall,
                              ]}
                            >
                              <View
                                style={[
                                  styles.purchaseCardTop,
                                  isSmall &&
                                    styles.purchaseCardTopSmall,
                                ]}
                              >
                                <View
                                  style={styles.cardMain}
                                >
                                  <Text
                                    style={styles.purchaseNumber}
                                  >
                                    {rfq.rfq_number}
                                    {' • '}
                                    {rfq.vendor_name || 'Vendor'}
                                  </Text>

                                  <Text
                                    style={styles.purchaseMeta}
                                  >
                                    Request for quotation
                                    {' • '}
                                    {rfq.rfq_date}
                                    {rfq.valid_until
                                      ? ` • Valid until ${rfq.valid_until}`
                                      : ''}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.purchaseAmountArea,
                                    isSmall &&
                                      styles.purchaseAmountAreaSmall,
                                  ]}
                                >
                                  <Text
                                    style={styles.purchaseAmount}
                                  >
                                    {formatCurrency(
                                      rfq.total_amount,
                                    )}
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={styles.purchaseDivider}
                              />

                              <View
                                style={[
                                  styles.purchaseStats,
                                  isSmall &&
                                    styles.purchaseStatsSmall,
                                ]}
                              >
                                <PurchaseStat
                                  label="Taxable"
                                  value={formatCurrency(
                                    rfq.subtotal,
                                  )}
                                  isSmall={isSmall}
                                />

                                <PurchaseStat
                                  label="GST"
                                  value={formatCurrency(
                                    rfq.gst_amount,
                                  )}
                                  isSmall={isSmall}
                                />

                                <PurchaseStat
                                  label="Total"
                                  value={formatCurrency(
                                    rfq.total_amount,
                                  )}
                                  isSmall={isSmall}
                                />
                              </View>

                              <View
                                style={[
                                  styles.purchaseActions,
                                  isSmall &&
                                    styles.purchaseActionsSmall,
                                ]}
                              >
                                <Pressable
                                  style={[
                                    styles.viewButton,
                                    isSmall &&
                                      styles.purchaseActionButtonSmall,
                                  ]}
                                  onPress={() =>
                                    Alert.alert(
                                      rfq.rfq_number,
                                      `${rfq.vendor_name || 'Vendor'}\nRFQ Date: ${rfq.rfq_date}\nValid Until: ${rfq.valid_until || '-'}\nTotal: ${formatCurrency(
                                        rfq.total_amount,
                                      )}`,
                                    )
                                  }
                                >
                                  <Text
                                    style={styles.viewButtonText}
                                  >
                                    View
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ),
                        )}
                      </View>
                    )}
              </>
            )}

          <View
            style={styles.bottomSpacer}
          />
        </ScrollView>
 


        {/* FORM */}

        <PurchaseForm
          visible={
            showPurchaseForm
          }
          vendors={
            vendors
          }
          products={
            products
          }
          onClose={() =>
            setShowPurchaseForm(
              false,
            )
          }
          onSaved={
            refreshData
          }
        />

        {/*        ====
            BOTTOM NAVIGATION
               ==== */}

        <View
          style={[
            styles.bottomNavigation,

            {
              bottom: Math.max(
                8,
                insets.bottom,
              ),
            },
          ]}
        >
          {/* HOME */}

          <Pressable
            onPress={() =>
              router.replace(
                '/dashboard',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ⌂
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Home
            </Text>
          </Pressable>

          {/* SALES */}

          <Pressable
            onPress={() =>
              router.push(
                '/sales',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              🧾
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Sales
            </Text>
          </Pressable>

          {/* PURCHASES - ACTIVE */}

          <Pressable
            onPress={() =>
              router.replace(
                '/purchases',
              )
            }
            style={({ pressed }) => [
              styles.navButton,
              styles.navButtonActive,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={[
                styles.navIcon,
                styles.navIconActive,
              ]}
            >
              📥
            </Text>

            <Text
              style={
                styles.navActiveText
              }
            >
              Purchases
            </Text>
          </Pressable>

          {/* MORE */}

          <Pressable
            onPress={() =>
              router.push(
                '/more',
              )
            }
            style={({ pressed }) => [
              styles.navButton,

              pressed &&
                styles.navPressed,
            ]}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ▦
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              More
            </Text>
          </Pressable>
        </View>

 
  
      </View>
    </SafeAreaView>
  );
}


function SummaryBox({
  label,
  value,
  smallValue = false,
  isTablet,
}: {
  label: string;
  value: string;
  smallValue?: boolean;
  isTablet: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryBox,
        isTablet &&
          styles.summaryBoxTablet,
      ]}
    >
      <Text
        style={styles.summaryBoxLabel}
      >
        {label}
      </Text>

      <Text
        style={
          smallValue
            ? styles.summaryBoxValueSmall
            : styles.summaryBoxValue
        }
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}


function PurchaseStat({
  label,
  value,
  isSmall,
}: {
  label: string;
  value: string;
  isSmall: boolean;
}) {
  return (
    <View
      style={[
        styles.purchaseStat,
        isSmall &&
          styles.purchaseStatSmall,
      ]}
    >
      <Text
        style={styles.purchaseStatLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.purchaseStatValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}


function EmptyCard({
  icon,
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <View
      style={styles.emptyCard}
    >
      {icon
        ? (
          <Text
            style={styles.emptyIcon}
          >
            {icon}
          </Text>
        )
        : null}

      <Text
        style={styles.emptyTitle}
      >
        {title}
      </Text>

      {description
        ? (
          <Text
            style={styles.emptyText}
          >
            {description}
          </Text>
        )
        : null}
    </View>
  );
}


const styles =
  StyleSheet.create({
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

    header: {
      width: '100%',
      minHeight: 72,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor:
        colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
    },

    headerSmall: {
      paddingHorizontal: 9,
    },

    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    backIcon: {
      color: '#FFFFFF',
      fontSize: 29,
      lineHeight: 31,
    },

    logo: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },

    logoText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '900',
    },

    headerTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '800',
    },

    headerTitleSmall: {
      fontSize: 17,
    },

    headerSubtitle: {
      color: '#D9E8F0',
      fontSize: 10,
      marginTop: 2,
    },

    profileCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    profileText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },

    content: {
 
      padding: 16,

      paddingBottom: 120,
    },


    contentLarge: {
      maxWidth: 1100,

 
  
      width: '100%',
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 30,
      alignSelf: 'center',
    },

    contentSmall: {
      paddingHorizontal: 9,
    },

    contentLarge: {
      maxWidth: 1050,
    },

    purchaseFlowHeader: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
      marginBottom: 12,
    },

    purchaseFlowHeaderSmall: {
      alignItems: 'flex-start',
    },

    titleArea: {
      flex: 1,
      minWidth: 0,
    },

    flowTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
    },

    flowTitleSmall: {
      fontSize: 19,
    },

    flowSubtitle: {
      color: colors.mutedText,
      fontSize: 10,
      marginTop: 3,
    },

    topAddButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 13,
      backgroundColor:
        colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },

    topAddButtonSmall: {
      paddingHorizontal: 12,
    },

    topAddButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },

    documentTabs: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      padding: 4,
      gap: 4,
      marginBottom: 12,
    },

 

    /*         =
       BOTTOM NAVIGATION
            = */

    bottomNavigation: {
      position: 'absolute',

      left: 9,
      right: 9,

      flexDirection: 'row',

      gap: 4,

      padding: 6,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: 20,

      shadowColor: colors.primary,

      shadowOffset: {
        width: 0,
        height: 12,
      },

      shadowOpacity: 0.2,

      shadowRadius: 25,

      elevation: 10,
    },


    navButton: {
      flex: 1,

      minHeight: 48,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',
    },


    navButtonActive: {
      backgroundColor: '#E5F5F2',
    },


    navPressed: {
      opacity: 0.75,
    },


    navIcon: {
      color: colors.mutedText,

      fontSize: 19,

      marginBottom: 2,
    },


    navIconActive: {
      color: colors.teal,
    },


    navActiveText: {
      color: colors.teal,

      fontSize: 9,

      fontWeight: '800',
    },


    navText: {
      color: colors.mutedText,

      fontSize: 9,

      fontWeight: '800',
    },

  });
 
    documentTab: {
      flex: 1,
      minHeight: 42,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },

    documentTabActive: {
      backgroundColor:
        '#E5F5F2',
    },

    documentTabText: {
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: '800',
    },

    documentTabTextActive: {
      color: colors.teal,
    },

    infoBanner: {
      width: '100%',
      padding: 11,
      borderRadius: 13,
      backgroundColor:
        '#EAF6F4',
      borderWidth: 1,
      borderColor:
        '#B9DDD8',
      marginBottom: 12,
    },

    infoBannerText: {
      color: colors.text,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '600',
    },

    rfqInfoBanner: {
      width: '100%',
      padding: 11,
      borderRadius: 13,
      backgroundColor:
        '#F3F5FB',
      borderWidth: 1,
      borderColor:
        colors.border,
      marginBottom: 12,
    },

    rfqInfoText: {
      color: colors.text,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '600',
    },

    searchContainer: {
      width: '100%',
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 13,
      backgroundColor:
        colors.card,
      paddingHorizontal: 11,
      marginBottom: 12,
    },

    searchIcon: {
      color: colors.mutedText,
      fontSize: 17,
      marginRight: 7,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 12,
      paddingVertical: 9,
    },

    summaryGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      gap: 8,
      marginBottom: 12,
    },

    summaryBox: {
      width: '48.5%',
      minHeight: 84,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      backgroundColor:
        colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },

    summaryBoxTablet: {
      width: '23.8%',
    },

    summaryBoxLabel: {
      color: colors.mutedText,
      fontSize: 9,
      fontWeight: '700',
      marginBottom: 5,
    },

    summaryBoxValue: {
      width: '100%',
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },

    summaryBoxValueSmall: {
      width: '100%',
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
    },

    purchaseList: {
      width: '100%',
      gap: 10,
    },

    purchaseCard: {
      width: '100%',
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 18,
      padding: 14,
    },

    purchaseCardSmall: {
      padding: 11,
    },

    purchaseCardTop: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
    },

    purchaseCardTopSmall: {
      flexDirection: 'column',
    },

    cardMain: {
      flex: 1,
      minWidth: 0,
    },

    purchaseNumber: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },

    purchaseMeta: {
      color: colors.mutedText,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
    },

    purchaseAmountArea: {
      flexShrink: 0,
      alignItems: 'flex-end',
    },

    purchaseAmountAreaSmall: {
      width: '100%',
      alignItems: 'flex-start',
    },

    purchaseAmount: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },

    purchaseStatus: {
      fontSize: 8,
      fontWeight: '900',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 99,
      marginTop: 5,
      overflow: 'hidden',
    },

    statusPaid: {
      color: '#13845E',
      backgroundColor:
        '#E4F6ED',
    },

    statusPartial: {
      color: '#976300',
      backgroundColor:
        '#FFF1CF',
    },

    statusUnpaid: {
      color: '#B23B3B',
      backgroundColor:
        '#FCE8E8',
    },

    purchaseDivider: {
      width: '100%',
      height: 1,
      backgroundColor:
        colors.border,
      marginVertical: 12,
    },

    purchaseStats: {
      width: '100%',
      flexDirection: 'row',
      gap: 8,
    },

    purchaseStatsSmall: {
      flexWrap: 'wrap',
    },

    purchaseStat: {
      flex: 1,
      minWidth: 0,
      padding: 9,
      borderRadius: 12,
      backgroundColor:
        colors.background,
    },

    purchaseStatSmall: {
      minWidth: '30%',
    },

    purchaseStatLabel: {
      color: colors.mutedText,
      fontSize: 8,
      fontWeight: '700',
    },

    purchaseStatValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '900',
      marginTop: 4,
    },

    purchaseActions: {
      width: '100%',
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },

    purchaseActionsSmall: {
      flexWrap: 'wrap',
    },

    purchaseActionButtonSmall: {
      flex: 1,
    },

    viewButton: {
      minWidth: 80,
      minHeight: 40,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },

    viewButtonText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '800',
    },

    pdfButton: {
      minWidth: 80,
      minHeight: 40,
      paddingHorizontal: 13,
      borderRadius: 12,
      backgroundColor:
        '#E7F5F3',
      alignItems: 'center',
      justifyContent: 'center',
    },

    pdfButtonText: {
      color: '#08766F',
      fontSize: 10,
      fontWeight: '900',
    },

    emptyCard: {
      width: '100%',
      minHeight: 180,
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 18,
      padding: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      fontSize: 32,
      marginBottom: 7,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },

    emptyText: {
      color: colors.mutedText,
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
      marginTop: 5,
    },

    rfqEmptyCard: {
      width: '100%',
      minHeight: 220,
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 18,
      padding: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },

    rfqEmptyIcon: {
      fontSize: 34,
      marginBottom: 7,
    },

    rfqPrimaryButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor:
        colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },

    rfqPrimaryButtonText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },

    bottomSpacer: {
      height: 40,
    },
  });
  
