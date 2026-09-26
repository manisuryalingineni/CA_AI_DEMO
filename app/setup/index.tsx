import { useState } from 'react';
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

import { saveBusiness } from '../../src/services/businessService';
import { colors } from '../../src/theme/colors';

export default function SetupScreen() {
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!businessName.trim()) {
      Alert.alert(
        'Business Name Required',
        'Please enter your business name.',
      );
      return;
    }

    try {
      setSaving(true);

      await saveBusiness({
        name: businessName,
        gstin,
      });

      router.replace('/dashboard');
    } catch (error) {
      console.error('Business setup error:', error);

      Alert.alert(
        'Unable to Save',
        'Something went wrong while saving the business.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Business Setup</Text>

          <Text style={styles.subtitle}>
            Set up your retail business to get started.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Business Information
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Business Name</Text>

            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              placeholder="Enter business name"
              placeholderTextColor={colors.mutedText}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>GSTIN</Text>

            <TextInput
              value={gstin}
              onChangeText={setGstin}
              style={styles.input}
              placeholder="Enter GSTIN"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Business Type</Text>

            <View style={styles.selection}>
              <Text style={styles.selectionText}>Retail</Text>
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save & Continue'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          Your business information is stored locally on this device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },

  header: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    marginBottom: 24,
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  card: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',

    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,

    padding: 20,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },

  field: {
    width: '100%',
    marginBottom: 18,
  },

  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    width: '100%',
    minHeight: 48,

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,

    backgroundColor: colors.card,

    paddingHorizontal: 14,
    paddingVertical: 12,

    color: colors.text,
    fontSize: 15,
  },

  selection: {
    width: '100%',
    minHeight: 48,

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,

    justifyContent: 'center',

    paddingHorizontal: 14,
  },

  selectionText: {
    color: colors.text,
    fontSize: 15,
  },

  button: {
    width: '100%',
    minHeight: 50,

    backgroundColor: colors.teal,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 6,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '700',
  },

  note: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',

    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,

    marginTop: 14,
  },
});