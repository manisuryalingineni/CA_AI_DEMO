import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '../../src/database/database';
import { getBusiness } from '../../src/repositories/businessRepository';

type DocumentType = 'PDF' | 'EXCEL' | 'CSV' | 'IMAGE' | 'OTHER';

type VaultDocument = {
  id: string;
  business_id: string;
  document_name: string;
  document_type: DocumentType;
  reference_size: string | null;
  document_date: string;
  created_at: string;
  updated_at: string;
};

type BusinessIdentity = {
  id: string;
  name: string;
  businessType: string;
};

const APP_LOGO = require('../../assets/ca-ai-business.png');
const APP_TITLE = 'CA AI Business';
const ROLE_LABEL = 'Business Owner';
const SHOW_BOTTOM_NAV = true;

const TYPES: readonly DocumentType[] = [
  'PDF',
  'EXCEL',
  'CSV',
  'IMAGE',
  'OTHER',
];

const C = {
  navy: '#08233d',
  navyEnd: '#145784',
  teal: '#07867d',
  background: '#f2f6f8',
  ink: '#12243a',
  muted: '#6b7c8d',
  border: '#dde6ec',
  white: '#ffffff',
  softTeal: '#e8f4f3',
  notice: '#eaf6ff',
  noticeBorder: '#b9d9ee',
  noticeText: '#164f76',
  green: '#087a59',
  softGreen: '#e4f6ed',
  orange: '#a85e00',
  softOrange: '#fff0d6',
  red: '#b33b34',
};

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function businessIdentity(value: unknown): BusinessIdentity | null {
  if (!value || typeof value !== 'object') return null;

  const row = value as Record<string, unknown>;
  const id = trim(row.id);

  if (!id) return null;

  return {
    id,
    name: trim(row.name) || 'Business',
    businessType:
      trim(row.business_type) ||
      trim(row.businessType) ||
      'Business',
  };
}

function makeId(): string {
  return `vault_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function todayDisplay(): string {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}/${date.getFullYear()}`;
}

function displayToIso(value: string): string | null {
  const match =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(
    day,
  ).padStart(2, '0')}`;
}

function isoToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return value;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Please try again.';
}

function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    const browser = globalThis as typeof globalThis & {
      alert?: (message: string) => void;
    };

    browser.alert?.(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

async function ensureVaultTable(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS document_vault_entries (
      id TEXT PRIMARY KEY NOT NULL,
      business_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK (
        document_type IN ('PDF', 'EXCEL', 'CSV', 'IMAGE', 'OTHER')
      ),
      reference_size TEXT,
      document_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_document_vault_business_date
      ON document_vault_entries (
        business_id,
        document_date,
        created_at
      );
  `);
}

async function loadDocuments(
  businessId: string,
): Promise<VaultDocument[]> {
  const db = await getDatabase();

  return db.getAllAsync<VaultDocument>(
    `
      SELECT
        id,
        business_id,
        document_name,
        document_type,
        reference_size,
        document_date,
        created_at,
        updated_at
      FROM document_vault_entries
      WHERE business_id = ?
      ORDER BY document_date DESC, created_at DESC
    `,
    businessId,
  );
}

export default function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();

  const [business, setBusiness] =
    useState<BusinessIdentity | null>(null);
  const [documents, setDocuments] =
    useState<VaultDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] =
    useState<DocumentType>('PDF');
  const [referenceSize, setReferenceSize] = useState('');
  const [documentDate, setDocumentDate] =
    useState(todayDisplay());

  const resetForm = useCallback(() => {
    setDocumentName('');
    setDocumentType('PDF');
    setReferenceSize('');
    setDocumentDate(todayDisplay());
    setTypeOpen(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setReady(false);
      setLoadError(null);

      await ensureVaultTable();

      const current = businessIdentity(await getBusiness());

      setBusiness(current);

      if (!current) {
        setDocuments([]);
        setReady(true);
        return;
      }

      const rows = await loadDocuments(current.id);

      setDocuments(rows);
      setReady(true);
    } catch (error) {
      setLoadError(errorText(error));
      setReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh, attempt]),
  );

  const openNew = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const closeForm = useCallback(() => {
    if (saving) return;

    setFormOpen(false);
    resetForm();
  }, [resetForm, saving]);

  const saveDocument = useCallback(async () => {
    const name = documentName.trim();
    const reference = referenceSize.trim();
    const isoDate = displayToIso(documentDate);

    if (!business) {
      notify(
        'Document Vault',
        'Select a business before registering a bill.',
      );
      return;
    }

    if (!name) {
      notify(
        'Document name required',
        'Enter the bill or document name.',
      );
      return;
    }

    if (!isoDate) {
      notify(
        'Invalid date',
        'Enter the date as DD/MM/YYYY.',
      );
      return;
    }

    setSaving(true);

    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      await db.runAsync(
        `
          INSERT INTO document_vault_entries (
            id,
            business_id,
            document_name,
            document_type,
            reference_size,
            document_date,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        makeId(),
        business.id,
        name,
        documentType,
        reference || null,
        isoDate,
        now,
        now,
      );

      setFormOpen(false);
      resetForm();
      await refresh();
    } catch (error) {
      notify(
        'Unable to register bill',
        errorText(error),
      );
    } finally {
      setSaving(false);
    }
  }, [
    business,
    documentDate,
    documentName,
    documentType,
    referenceSize,
    refresh,
    resetForm,
  ]);

  const businessSubtitle = useMemo(() => {
    if (!business) return 'Select a business';

    return business.businessType || business.name;
  }, [business]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <LinearGradient
        colors={[C.navy, C.navyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: insets.top + 10 },
        ]}
      >
        <View style={styles.headerInner}>
          <View style={styles.logoWrap}>
            <View style={styles.logoPlaceholder}>
              <Ionicons
                name="documents-outline"
                size={24}
                color={C.white}
              />
            </View>
          </View>

          <View style={styles.headerText}>
            <Text
              style={styles.appTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {APP_TITLE}
            </Text>

            <Text
              style={styles.appSubtitle}
              numberOfLines={1}
            >
              {businessSubtitle}
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Text
              style={styles.roleText}
              numberOfLines={1}
            >
              {'👤 '}
              {ROLE_LABEL}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: SHOW_BOTTOM_NAV
              ? insets.bottom + 110
              : insets.bottom + 28,
          },
        ]}
      >
        <View style={styles.flowHeader}>
          <View style={styles.flowText}>
            <Text
              style={styles.flowTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Document Vault
            </Text>

            <Text style={styles.flowSubtitle}>
              Register bills and supporting documents for
              accounts and CA review
            </Text>
          </View>

          <Pressable
            style={[
              styles.startButton,
              (!business || Boolean(loadError)) &&
                styles.disabled,
            ]}
            onPress={openNew}
            disabled={!business || Boolean(loadError)}
          >
            <Text style={styles.startText}>+ Register</Text>
          </Pressable>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Register PDF, Excel, CSV, image or other bill
            evidence by filename and reference. This register
            stores the bill details in your business database.
          </Text>
        </View>

        {loadError && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {loadError}
            </Text>

            <Pressable
              onPress={() =>
                setAttempt(value => value + 1)
              }
              style={styles.retryButton}
            >
              <Text style={styles.actionText}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {!ready && !loadError ? (
          <View style={styles.emptyCard}>
            <View style={styles.documentIcon}>
              <Ionicons
                name="documents-outline"
                size={23}
                color={C.teal}
              />
            </View>

            <View style={styles.emptyTextArea}>
              <Text style={styles.emptyTitle}>
                Loading registered bills…
              </Text>
            </View>
          </View>
        ) : ready &&
          !loadError &&
          documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.documentIcon}>
              <Ionicons
                name="folder-open-outline"
                size={23}
                color={C.teal}
              />
            </View>

            <View style={styles.emptyTextArea}>
              <Text style={styles.emptyTitle}>
                No bills registered
              </Text>

              <Text style={styles.emptyText}>
                Tap + Register to add your first bill or
                supporting document.
              </Text>
            </View>
          </View>
        ) : (
          documents.map((document, index) => (
            <View
              key={document.id}
              style={styles.documentCard}
            >
              <View style={styles.documentIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={23}
                  color={C.teal}
                />
              </View>

              <View style={styles.documentMain}>
                <Text
                  style={styles.documentNumber}
                  numberOfLines={2}
                >
                  {document.document_name ||
                    `Bill ${index + 1}`}
                </Text>

                <Text
                  style={styles.documentMeta}
                  numberOfLines={2}
                >
                  {document.document_type}
                  {document.reference_size
                    ? ` • ${document.reference_size}`
                    : ''}
                  {` • ${isoToDisplay(
                    document.document_date,
                  )}`}
                </Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    REGISTERED
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {SHOW_BOTTOM_NAV && (
        <View
          style={[
            styles.bottomNavigation,
            {
              bottom: Math.max(8, insets.bottom),
            },
          ]}
        >
          <Pressable
            onPress={() =>
              router.replace('/dashboard')
            }
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>⌂</Text>
            <Text style={styles.navText}>Home</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/sales')}
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>🧾</Text>
            <Text style={styles.navText}>Sales</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/purchases')}
            style={styles.navButton}
          >
            <Text style={styles.navIcon}>📥</Text>
            <Text style={styles.navText}>Purchases</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/more')}
            style={[
              styles.navButton,
              styles.navButtonActive,
            ]}
          >
            <Text style={styles.navIcon}>▦</Text>
            <Text style={styles.navActiveText}>
              More
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeForm}
          />

          <View style={styles.formSheet}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>
                  Register bill
                </Text>

                <Text style={styles.formSubtitle}>
                  Save bill details for accounts and CA
                  review.
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeForm}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={C.ink}
                />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FieldLabel text="DOCUMENT NAME *" />

              <TextInput
                value={documentName}
                onChangeText={setDocumentName}
                placeholder="Supplier_bill_102.pdf"
                placeholderTextColor="#8b98a2"
                style={styles.input}
                autoCapitalize="none"
                editable={!saving}
              />

              <FieldLabel text="DOCUMENT TYPE" />

              <Pressable
                style={styles.selectInput}
                onPress={() => setTypeOpen(true)}
                disabled={saving}
              >
                <Text style={styles.selectText}>
                  {documentType}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={C.ink}
                />
              </Pressable>

              <FieldLabel text="REFERENCE / SIZE" />

              <TextInput
                value={referenceSize}
                onChangeText={setReferenceSize}
                placeholder="Bill 102 / 2 MB"
                placeholderTextColor="#8b98a2"
                style={styles.input}
                editable={!saving}
              />

              <FieldLabel text="DATE" />

              <View style={styles.dateInputWrap}>
                <TextInput
                  value={documentDate}
                  onChangeText={setDocumentDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#8b98a2"
                  keyboardType="numbers-and-punctuation"
                  style={styles.dateInput}
                  editable={!saving}
                  maxLength={10}
                />

                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={C.ink}
                />
              </View>

              <View style={styles.formActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={closeForm}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveButton,
                    saving && styles.disabled,
                  ]}
                  onPress={() => {
                    void saveDocument();
                  }}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving
                      ? 'Saving…'
                      : 'Save document'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={typeOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTypeOpen(false)}
      >
        <View style={styles.typeOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTypeOpen(false)}
          />

          <View style={styles.typeDialog}>
            {TYPES.map((type, index) => {
              const selected =
                type === documentType;

              return (
                <Pressable
                  key={type}
                  style={[
                    styles.typeRow,
                    index !== TYPES.length - 1 &&
                      styles.typeRowBorder,
                  ]}
                  onPress={() => {
                    setDocumentType(type);
                    setTypeOpen(false);
                  }}
                >
                  <Text style={styles.typeText}>
                    {type}
                  </Text>

                  <View
                    style={[
                      styles.radioOuter,
                      selected &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? (
                      <View
                        style={styles.radioInner}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={styles.label}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  header: {
    paddingHorizontal: 14,
    paddingBottom: 9,
    shadowColor: '#001522',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 2,
  },

  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
  },

  logoWrap: {
    width: 42,
    height: 42,
  },

  logoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff18',
    borderWidth: 1,
    borderColor: '#ffffff24',
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  appTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
  },

  appSubtitle: {
    color: '#d8e7ef',
    fontSize: 12,
    marginTop: 2,
  },

  rolePill: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#ffffff24',
    backgroundColor: '#ffffff18',
  },

  roleText: {
    color: '#e2ebf1',
    fontSize: 10,
  },

  content: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 11,
    paddingTop: 26,
  },

  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  flowText: {
    flex: 1,
    minWidth: 0,
  },

  flowTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
  },

  flowSubtitle: {
    fontSize: 10.5,
    color: C.muted,
    marginTop: 4,
    lineHeight: 16,
  },

  startButton: {
    backgroundColor: C.teal,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },

  startText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
  },

  notice: {
    backgroundColor: C.notice,
    borderColor: C.noticeBorder,
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    marginBottom: 11,
  },

  noticeText: {
    color: C.noticeText,
    fontSize: 11.5,
    lineHeight: 18,
  },

  retryButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: C.softTeal,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },

  actionText: {
    color: C.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 15,
    minHeight: 110,
    marginBottom: 9,
  },

  documentIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e9f5f3',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  documentMain: {
    flex: 1,
    minWidth: 0,
  },

  documentNumber: {
    color: C.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },

  documentMeta: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
    marginTop: 6,
    backgroundColor: C.softGreen,
  },

  badgeText: {
    color: C.green,
    fontSize: 8,
    fontWeight: '900',
  },

  emptyCard: {
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 15,
  },

  emptyTextArea: {
    flex: 1,
    minWidth: 0,
  },

  emptyTitle: {
    color: C.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },

  emptyText: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  bottomNavigation: {
    position: 'absolute',
    left: 9,
    right: 9,
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    shadowColor: C.navy,
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

  navIcon: {
    color: C.muted,
    fontSize: 19,
    marginBottom: 2,
  },

  navText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '800',
  },

  navActiveText: {
    color: C.teal,
    fontSize: 9,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.45,
  },

modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 14,
  backgroundColor: 'rgba(4, 25, 43, 0.68)',
},

formSheet: {
  width: '100%',
  maxWidth: 560,
  maxHeight: '82%',
  paddingHorizontal: 14,
  paddingTop: 18,
  paddingBottom: 18,
  borderRadius: 20,
  backgroundColor: C.background,
},

  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },

  formHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  formTitle: {
    color: C.ink,
    fontSize: 21,
    fontWeight: '800',
  },

  formSubtitle: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eceff1',
  },

  label: {
    color: '#344D5E',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    color: C.ink,
    fontSize: 12,
  },

  selectInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },

  selectText: {
    color: C.ink,
    fontSize: 12,
  },

  dateInputWrap: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },

  dateInput: {
    flex: 1,
    color: C.ink,
    fontSize: 12,
    paddingVertical: 0,
  },

  formActions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 9,
  },

  cancelButton: {
    minWidth: 90,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: C.softTeal,
  },

  cancelText: {
    color: C.teal,
    fontSize: 14,
    fontWeight: '800',
  },

  saveButton: {
    minWidth: 118,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: C.teal,
  },

  saveText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
  },

  typeOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.64)',
  },

  typeDialog: {
    width: '86%',
    maxWidth: 520,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: C.white,
  },

  typeRow: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  typeRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CFCFCF',
  },

  typeText: {
    color: '#161616',
    fontSize: 18,
    fontWeight: '400',
  },

  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#6D6D6D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: C.teal,
  },

  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.teal,
  },
});
