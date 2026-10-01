import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type BusinessType = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'retail',
    name: 'Retail Shop',
    description: 'POS, products and counter sales',
    icon: '🛍️',
  },
  {
    id: 'wholesale',
    name: 'Wholesale & Distribution',
    description: 'Bulk orders and dealer credit',
    icon: '📦',
  },
  {
    id: 'service',
    name: 'Service Business',
    description: 'Jobs, estimates and service billing',
    icon: '🧰',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Production, raw material and finished goods',
    icon: '🏭',
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Food',
    description: 'Menu billing and food purchases',
    icon: '🍽️',
  },
  {
    id: 'construction',
    name: 'Construction',
    description: 'Projects, materials and RA bills',
    icon: '🏗️',
  },
  {
    id: 'transport',
    name: 'Transport & Logistics',
    description: 'Trips, freight and fuel expenses',
    icon: '🚚',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Online orders, returns and settlements',
    icon: '🛒',
  },
  {
    id: 'professional',
    name: 'Professional Services',
    description: 'Retainers, time and TDS',
    icon: '💼',
  },
  {
    id: 'healthcare',
    name: 'Healthcare Clinic',
    description: 'Consultations and pharmacy stock',
    icon: '🩺',
  },
  {
    id: 'education',
    name: 'Education & Training',
    description: 'Fees, batches and collections',
    icon: '🎓',
  },
  {
    id: 'hotel',
    name: 'Hotel & Hospitality',
    description: 'Rooms, guest folios and supplies',
    icon: '🏨',
  },
  {
    id: 'other',
    name: 'Other MSME',
    description: 'Flexible products and services',
    icon: '🏢',
  },
];

export default function BusinessSelectionScreen() {
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 700;

  const handleBusinessSelect = (business: BusinessType) => {
    /*
     * Retail is the only functional business in the current POC.
     * The remaining business types are displayed because they
     * exist in the APK business-selection flow.
     */
    if (business.id === 'retail') {
      router.back();
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Select business type</Text>
            <Text style={styles.headerSubtitle}>
              Choose the type of business you want to manage
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close business selection"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Business list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isLargeScreen && styles.scrollContentLarge,
          ]}
        >
          <View
            style={[
              styles.businessGrid,
              isLargeScreen && styles.businessGridLarge,
            ]}
          >
            {BUSINESS_TYPES.map((business) => {
              const isSelected = business.id === 'retail';

              return (
                <Pressable
                  key={business.id}
                  onPress={() => handleBusinessSelect(business)}
                  style={({ pressed }) => [
                    styles.businessCard,
                    isLargeScreen && styles.businessCardLarge,
                    isSelected && styles.selectedCard,
                    pressed && styles.businessCardPressed,
                  ]}
                >
                  {/* Icon container */}
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && styles.selectedIconContainer,
                    ]}
                  >
                    <Text style={styles.businessIcon}>
                      {business.icon}
                    </Text>
                  </View>

                  {/* Business name */}
                  <Text
                    style={[
                      styles.businessName,
                      isSelected && styles.selectedBusinessName,
                    ]}
                    numberOfLines={2}
                  >
                    {business.name}
                  </Text>

                  {/* Description */}
                  <Text
                    style={styles.businessDescription}
                    numberOfLines={3}
                  >
                    {business.description}
                  </Text>

                  {/* Selected indicator */}
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>
                        Current business
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f6f8',
  },

  container: {
    flex: 1,
    backgroundColor: '#f2f6f8',
  },

  /* ---------------- HEADER ---------------- */

  header: {
    minHeight: 76,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dde6ec',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  headerContent: {
    flex: 1,
    paddingRight: 10,
  },

  headerTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: '#12243a',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: '#6b7c8d',
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#f2f6f8',
    borderWidth: 1,
    borderColor: '#dde6ec',
  },

  closeButtonPressed: {
    backgroundColor: '#e3eaee',
    transform: [{ scale: 0.94 }],
  },

  closeButtonText: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500',
    color: '#12243a',
  },

  /* ---------------- SCROLL ---------------- */

  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
  },

  scrollContentLarge: {
    paddingHorizontal: 18,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },

  /* ---------------- GRID ---------------- */

  businessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  businessGridLarge: {
    columnGap: 10,
  },

  /* ---------------- CARDS ---------------- */

  businessCard: {
    width: '48.5%',
    minHeight: 145,

    marginBottom: 8,

    backgroundColor: '#ffffff',

    borderRadius: 14,

    borderWidth: 1,
    borderColor: '#dde6ec',

    paddingHorizontal: 8,
    paddingVertical: 9,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#08233d',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,

    elevation: 1,
  },

  businessCardLarge: {
    width: '48.8%',
    minHeight: 150,
  },

  businessCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  /* ---------------- SELECTED CARD ---------------- */

  selectedCard: {
    backgroundColor: '#f0faf8',

    borderColor: '#07867d',
    borderWidth: 2,

    shadowColor: '#07867d',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 4,

    elevation: 2,
  },

  /* ---------------- ICON ---------------- */

  iconContainer: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#f4f7f9',

    marginBottom: 6,
  },

  selectedIconContainer: {
    backgroundColor: '#dff4f0',
  },

  businessIcon: {
    fontSize: 23,
    textAlign: 'center',
  },

  /* ---------------- TEXT ---------------- */

  businessName: {
    width: '100%',

    fontSize: 14,
    lineHeight: 18,

    fontWeight: '700',

    color: '#111111',

    textAlign: 'center',

    marginBottom: 3,
  },

  selectedBusinessName: {
    color: '#08233d',
  },

  businessDescription: {
    width: '100%',

    fontSize: 10.5,
    lineHeight: 14,

    color: '#6b7c8d',

    textAlign: 'center',
  },

  /* ---------------- SELECTED BADGE ---------------- */

  selectedBadge: {
    marginTop: 5,

    paddingHorizontal: 7,
    paddingVertical: 2,

    borderRadius: 10,

    backgroundColor: '#07867d',
  },

  selectedBadgeText: {
    fontSize: 8,
    lineHeight: 11,

    fontWeight: '700',

    color: '#ffffff',

    textAlign: 'center',
  },
});