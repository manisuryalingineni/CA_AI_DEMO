import { useCallback, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { loadCustomers, saveCustomer } from '../../src/services/customerService';
import type { Customer } from '../../src/types/customer';
import { colors } from '../../src/theme/colors';

const STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Tamil Nadu',
  'Karnataka',
  'Other State',
];

function businessFieldLabel(): string {
  // The APK uses "Customer category / loyalty ID" for the RETAIL business.
  // More business-specific labels can be added here as new business types are implemented.
  return 'Customer category / loyalty ID';
}

type CustomerFormProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function CustomerForm({ visible, onClose, onSaved }: CustomerFormProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [creditDays, setCreditDays] = useState('15');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [businessDetail, setBusinessDetail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName('');
    setMobile('');
    setGstin('');
    setState('Andhra Pradesh');
    setCreditDays('15');
    setOpeningBalance('0');
    setBusinessDetail('');
    setAddress('');
  }

  function closeForm() {
    if (saving) return;
    resetForm();
    onClose();
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter the customer name.');
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert('Invalid mobile', 'Please enter a 10-digit mobile number.');
      return;
    }

    const parsedCreditDays = Number(creditDays || 0);
    const parsedOpeningBalance = Number(openingBalance || 0);

    if (!Number.isFinite(parsedCreditDays) || parsedCreditDays < 0) {
      Alert.alert('Invalid credit days', 'Enter 0 or a positive number.');
      return;
    }

    if (!Number.isFinite(parsedOpeningBalance)) {
      Alert.alert('Invalid opening balance', 'Enter a valid amount.');
      return;
    }

    try {
      setSaving(true);

      await saveCustomer({
        name,
        mobile,
        gstin,
        state,
        creditDays: Math.floor(parsedCreditDays),
        openingBalance: parsedOpeningBalance,
        businessDetail,
        address,
      });

      Alert.alert('Customer saved', `${name.trim()} was added successfully.`, [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onSaved();
            onClose();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Unable to save',
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving the customer.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closeForm}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          style={styles.modalSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: Math.max(20, insets.bottom + 12) },
            ]}
          >
            <View style={styles.modalHead}>
              <View style={styles.modalTitleArea}>
                <Text style={styles.modalTitle}>New customer</Text>
                <Text style={styles.modalSubtitle}>
                  Only essential fields are mandatory.
                </Text>
              </View>

              <Pressable
                onPress={closeForm}
                disabled={saving}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldsGrid}> 
                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>NAME *</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder="Business or person name"
                    placeholderTextColor={colors.mutedText}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>MOBILE *</Text>
                  <TextInput
                    value={mobile}
                    onChangeText={(value) =>
                      setMobile(value.replace(/\D/g, '').slice(0, 10))
                    }
                    style={styles.input}
                    placeholder="10-digit number"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="number-pad"
                    maxLength={10}
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>GSTIN (OPTIONAL)</Text>
                  <TextInput
                    value={gstin}
                    onChangeText={(value) =>
                      setGstin(
                        value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15),
                      )
                    }
                    style={styles.input}
                    placeholder="For registered party"
                    placeholderTextColor={colors.mutedText}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                </View>

                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>STATE</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={state}
                      onValueChange={(value) => setState(String(value))}
                      style={styles.picker}
                    >
                      {STATES.map((item) => (
                        <Picker.Item key={item} label={item} value={item} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>CREDIT DAYS</Text>
                  <TextInput
                    value={creditDays}
                    onChangeText={(value) =>
                      setCreditDays(value.replace(/\D/g, ''))
                    }
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="15"
                    placeholderTextColor={colors.mutedText}
                  />
                </View>

                <View style={[styles.field, isWide && styles.fieldHalf]}>
                  <Text style={styles.label}>OPENING BALANCE</Text>
                  <TextInput
                    value={openingBalance}
                    onChangeText={(value) =>
                      setOpeningBalance(value.replace(/[^0-9.]/g, ''))
                    }
                    style={styles.input}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                  />
                </View>

                <View style={styles.fieldFull}>
                  <Text style={styles.label}>{businessFieldLabel().toUpperCase()}</Text>
                  <TextInput
                    value={businessDetail}
                    onChangeText={setBusinessDetail}
                    style={styles.input}
                    placeholder={businessFieldLabel()}
                    placeholderTextColor={colors.mutedText}
                  />
                </View>

                <View style={styles.fieldFull}>
                  <Text style={styles.label}>ADDRESS</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    style={[styles.input, styles.textArea]}
                    placeholder="Area, city and PIN"
                    placeholderTextColor={colors.mutedText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={closeForm}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonSecondary,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonSecondaryText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonPrimary,
                    pressed && styles.buttonPressed,
                    saving && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {saving ? 'Saving...' : 'Save customer'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
    </>
  );
}

export default function CustomersScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLargeScreen = width >= 721;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadCustomers();
      setCustomers(data);
    } catch (error) {
      Alert.alert(
        'Unable to load customers',
        error instanceof Error
          ? error.message
          : 'Something went wrong while loading customers.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
    }, [refreshCustomers]),
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CA</Text>
          </View>

          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>Customers</Text>
            <Text style={styles.headerSubtitle}>
              Sales, receipts and receivables
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.main, isLargeScreen && styles.mainLarge]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Customers</Text>
              <Text style={styles.sectionSubtitle}>
                Add customer or walk-in party
              </Text>
            </View>

            <Pressable
              onPress={() => setShowForm(true)}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Business field: {businessFieldLabel()}
            </Text>
          </View>

          {loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading customers...</Text>
            </View>
          ) : customers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>No customers yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first customer to start sales and receipts.
              </Text>

              <Pressable
                onPress={() => setShowForm(true)}
                style={styles.emptyAction}
              >
                <Text style={styles.emptyActionText}>Add first customer</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {customers.map((customer) => (
                <View key={customer.id} style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Text style={styles.rowIconText}>👤</Text>
                  </View>

                  <View style={styles.rowMain}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {customer.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {customer.mobile} • {customer.gstin || 'Unregistered'} •{' '}
                      {customer.state}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {customer.address || 'No address'}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {customer.creditDays} days credit
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountArea}>
                    <Text style={styles.amount}>
                      ₹
                      {customer.openingBalance.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={styles.amountLabel}>opening balance</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CustomerForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refreshCustomers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    elevation: 6,
  },
  headerInner: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  headerTitleArea: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#D8E7EF',
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  main: {
    width: '100%',
    paddingHorizontal: 11,
    paddingTop: 14,
    alignSelf: 'center',
  },
  mainLarge: {
    maxWidth: 1050,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 2,
    marginBottom: 9,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 10,
    marginTop: 3,
  },
  addButton: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: colors.teal,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  notice: {
    borderWidth: 1,
    borderColor: '#B9D9EE',
    backgroundColor: '#EAF6FF',
    borderRadius: 13,
    padding: 10,
    marginBottom: 10,
  },
  noticeText: {
    color: '#164F76',
    fontSize: 10,
    lineHeight: 15,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E9F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
  },
  rowMain: {
    minWidth: 0,
    flex: 1,
  },
  rowName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.mutedText,
    fontSize: 9,
    marginTop: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: '#EEF2F5',
  },
  badgeText: {
    color: '#607080',
    fontSize: 8,
    fontWeight: '900',
  },
  amountArea: {
    alignItems: 'flex-end',
  },
  amount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  amountLabel: {
    color: colors.mutedText,
    fontSize: 8,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyDescription: {
    color: colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyAction: {
    marginTop: 14,
    backgroundColor: colors.teal,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 25, 43, 0.67)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '94%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    paddingHorizontal: 15,
    paddingTop: 17,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  modalTitleArea: {
    flex: 1,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 10,
    marginTop: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8EDF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 23,
  },
  form: {
    gap: 10,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  field: {
    width: '100%',
    gap: 4,
  },
  fieldHalf: {
    width: '48%',
  },
  fieldFull: {
    width: '100%',
    gap: 4,
  },
  label: {
    color: '#46586B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#CDD9E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 75,
    paddingTop: 12,
  },
  pickerWrapper: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#CDD9E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    color: colors.text,
    height: 48,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  button: {
    minWidth: 110,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: '#E8EDF1',
  },
  buttonPrimary: {
    backgroundColor: colors.teal,
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
