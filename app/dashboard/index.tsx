import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';

import { colors } from '../../src/theme/colors';

type QuickActionProps = {
  icon: string;
  title: string;
  description: string;
  onPress?: () => void;
};

function QuickAction({
  icon,
  title,
  description,
  onPress,
}: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.quickActionPressed,
      ]}
    >
      <View style={styles.quickActionIcon}>
        <Text style={styles.quickActionIconText}>
          {icon}
        </Text>
      </View>

      <Text style={styles.quickActionTitle}>
        {title}
      </Text>

      <Text style={styles.quickActionDescription}>
        {description}
      </Text>

      <View style={styles.openBadge}>
        <Text style={styles.openBadgeText}>
          OPEN
        </Text>
      </View>
    </Pressable>
  );
}

type FlowStepProps = {
  number: string;
  title: string;
  description: string;
};

function FlowStep({
  number,
  title,
  description,
}: FlowStepProps) {
  return (
    <Pressable style={styles.flowStep}>
      <View style={styles.flowNumber}>
        <Text style={styles.flowNumberText}>
          {number}
        </Text>
      </View>

      <Text style={styles.flowTitle}>
        {title}
      </Text>

      <Text style={styles.flowDescription}>
        {description}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLargeScreen = width >= 721;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.headerInner}>
          <Pressable style={styles.logo}>
            <Text style={styles.logoText}>
              CA
            </Text>
          </Pressable>

          <View style={styles.headerTitle}>
            <Text style={styles.appTitle}>
              CA AI Business
            </Text>

            <Text style={styles.appSubtitle}>
              Retail Shop
            </Text>
          </View>

          <View style={styles.headerSpacer} />

          <Pressable style={styles.userButton}>
            <Text style={styles.userButtonText}>
              👤 RS
            </Text>
          </Pressable>
        </View>
      </View>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.main,
            isLargeScreen && styles.mainLarge,
          ]}
        >

          {/* =================================================
              RETAIL HERO
          ================================================= */}

          <View style={styles.hero}>
            <View
              style={[
                styles.heroRow,
                !isLargeScreen && styles.heroRowMobile,
              ]}
            >
              <View style={styles.heroIdentity}>
                <View style={styles.heroIcon}>
                  <Text style={styles.heroIconText}>
                    🛍️
                  </Text>
                </View>

                <View style={styles.heroTitleArea}>
                  <Text
                    style={styles.heroTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    Retail Shop
                  </Text>

                  <Text
                    style={styles.heroDescription}
                    numberOfLines={2}
                  >
                    POS, products and counter sales
                    {' • '}
                    Owner workspace
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.switchButton,
                  !isLargeScreen &&
                    styles.switchButtonMobile,
                  pressed && styles.switchButtonPressed,
                ]}
              >
                <Text
                  style={styles.switchButtonText}
                  numberOfLines={1}
                >
                  Switch business
                </Text>
              </Pressable>
            </View>

            {/* KPI STRIP */}

            <View
              style={[
                styles.kpiGrid,
                !isLargeScreen &&
                  styles.kpiGridMobile,
              ]}
            >
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>
                  Sales
                </Text>

                <Text style={styles.kpiValue}>
                  ₹0
                </Text>
              </View>

              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>
                  Purchases
                </Text>

                <Text style={styles.kpiValue}>
                  ₹0
                </Text>
              </View>

              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>
                  To receive
                </Text>

                <Text style={styles.kpiValue}>
                  ₹0
                </Text>
              </View>

              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>
                  To pay
                </Text>

                <Text style={styles.kpiValue}>
                  ₹0
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              QUICK WORK HEADER
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Quick work • Retail Shop
              </Text>

              <Text style={styles.sectionSubtitle}>
                Only work assigned to this login is shown
              </Text>
            </View>

            <Pressable style={styles.smallButton}>
              <Text style={styles.smallButtonText}>
                All operations
              </Text>
            </Pressable>
          </View>

          {/* =================================================
              QUICK WORK
          ================================================= */}

          <View
            style={[
              styles.quickGrid,
              isLargeScreen &&
                styles.quickGridLarge,
            ]}
          >
            <QuickAction
              icon="👤"
              title="Customer"
              description="Add customer or walk-in party"
            />

            <QuickAction
              icon="🧾"
              title="POS sale"
              description="GST invoice and counter sale"
            />

            <QuickAction
              icon="📥"
              title="Buy stock"
              description="Purchase bill and inward stock"
            />

            <QuickAction
              icon="📦"
              title="Stock check"
              description="Quantity, cost and reorder view"
            />

            {/* =================================================
                PRODUCTS
            ================================================= */}

            <QuickAction
              icon="📋"
              title="Products"
              description="Manage products, prices and stock"
              onPress={() => router.push('/products')}
            />

            <QuickAction
              icon="💳"
              title="Receive money"
              description="Cash, UPI, card or cheque"
            />

            <QuickAction
              icon="📈"
              title="Daily sales"
              description="Live sales register PDF"
            />
          </View>

          {/* =================================================
              OPERATIONS EXPERT
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Operations Expert
              </Text>

              <Text style={styles.sectionSubtitle}>
                The next useful step from your saved data
              </Text>
            </View>
          </View>

          <View style={styles.expertCard}>
            <View style={styles.expertIcon}>
              <Text style={styles.expertIconText}>
                🧭
              </Text>
            </View>

            <View style={styles.expertContent}>
              <Text style={styles.expertTitle}>
                Create the first customer
              </Text>

              <Text style={styles.expertDescription}>
                A customer is required before
                quotations and sales invoices.
              </Text>
            </View>

            <Pressable style={styles.doNowButton}>
              <Text style={styles.doNowText}>
                Do now
              </Text>
            </Pressable>
          </View>

          {/* =================================================
              COMPLETE BUSINESS FLOW
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Complete business flow
              </Text>

              <Text style={styles.sectionSubtitle}>
                Every numbered step opens its working form
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flow}
          >
            <FlowStep
              number="1"
              title="Create party"
              description="Customer or vendor"
            />

            <FlowStep
              number="2"
              title="Add item/service"
              description="HSN/SAC, unit, GST"
            />

            <FlowStep
              number="3"
              title="Quotation/order"
              description="Sales and purchase workflow"
            />

            <FlowStep
              number="4"
              title="Invoice/bill"
              description="Stock + ledger + GST"
            />

            <FlowStep
              number="5"
              title="Payment"
              description="Receipt or vendor payment"
            />

            <FlowStep
              number="6"
              title="CA review"
              description="GST, ITR and approvals"
            />
          </ScrollView>

          {/* =================================================
              RECENT ACTIVITY
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Recent activity
              </Text>
            </View>

            <Pressable style={styles.smallButton}>
              <Text style={styles.smallButtonText}>
                PDF Centre
              </Text>
            </Pressable>
          </View>

          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🧾
            </Text>

            <Text style={styles.emptyTitle}>
              No transactions
            </Text>

            <Text style={styles.emptyDescription}>
              Create the first document from
              Quick Work.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          FLOATING BOTTOM NAVIGATION
      ===================================================== */}

      <View
        style={[
          styles.bottomNavigation,
          {
            bottom: Math.max(8, insets.bottom),
          },
        ]}
      >
        <Pressable
          style={[
            styles.navButton,
            styles.navButtonActive,
          ]}
        >
          <Text style={styles.navIcon}>
            ⌂
          </Text>

          <Text style={styles.navActiveText}>
            Home
          </Text>
        </Pressable>

        <Pressable style={styles.navButton}>
          <Text style={styles.navIcon}>
            🧾
          </Text>

          <Text style={styles.navText}>
            Sales
          </Text>
        </Pressable>

        <Pressable style={styles.navButton}>
          <Text style={styles.navIcon}>
            📥
          </Text>

          <Text style={styles.navText}>
            Purchases
          </Text>
        </Pressable>

        <Pressable style={styles.navButton}>
          <Text style={styles.navIcon}>
            ▦
          </Text>

          <Text style={styles.navText}>
            More
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =======================================================
     ROOT
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* =======================================================
     TOP HEADER
  ======================================================= */

  topHeader: {
    width: '100%',

    backgroundColor: colors.primary,

    shadowColor: '#0015',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,

    elevation: 6,
  },

  headerInner: {
    width: '100%',
    maxWidth: 1050,

    minHeight: 64,

    alignSelf: 'center',

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

  headerTitle: {
    minWidth: 0,
  },

  appTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  appSubtitle: {
    color: '#D8E7EF',
    fontSize: 11,
    marginTop: 2,
  },

  headerSpacer: {
    flex: 1,
  },

  userButton: {
    maxWidth: 120,

    backgroundColor: 'rgba(255,255,255,0.09)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',

    borderRadius: 99,

    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  userButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
  },

  /* =======================================================
     MAIN
  ======================================================= */

  scrollContent: {
    paddingBottom: 105,
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

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    width: '100%',

    backgroundColor: colors.primary,

    borderRadius: 24,

    padding: 18,

    overflow: 'hidden',

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.1,
    shadowRadius: 15,

    elevation: 3,
  },

  heroRow: {
    width: '100%',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    gap: 12,
  },

  heroRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  heroIdentity: {
    flex: 1,
    minWidth: 0,
    width: '100%',

    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 52,
    height: 52,

    flexShrink: 0,

    borderRadius: 17,

    backgroundColor: 'rgba(255,255,255,0.09)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIconText: {
    fontSize: 30,
  },

  heroTitleArea: {
    flex: 1,
    minWidth: 0,

    marginLeft: 12,
  },

  heroTitle: {
    color: '#FFFFFF',

    fontSize: 21,
    fontWeight: '700',
  },

  heroDescription: {
    color: '#D9E8F0',

    fontSize: 11,

    marginTop: 4,

    lineHeight: 15,
  },

  switchButton: {
    flexShrink: 0,

    backgroundColor: '#FFFFFF',

    borderRadius: 12,

    paddingHorizontal: 13,
    paddingVertical: 8,

    minHeight: 34,

    alignItems: 'center',
    justifyContent: 'center',
  },

  switchButtonMobile: {
    minWidth: 150,
    alignSelf: 'center',
    marginTop: 12,
  },

  switchButtonPressed: {
    opacity: 0.75,
  },

  switchButtonText: {
    color: colors.primary,

    fontSize: 10,
    fontWeight: '800',
  },

  /* =======================================================
     KPI
  ======================================================= */

  kpiGrid: {
    width: '100%',

    flexDirection: 'row',

    gap: 7,

    marginTop: 15,
  },

  kpiGridMobile: {
    flexWrap: 'wrap',
  },

  kpi: {
    flex: 1,

    minWidth: 0,

    backgroundColor: 'rgba(255,255,255,0.075)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',

    borderRadius: 13,

    padding: 10,
  },

  kpiLabel: {
    color: '#D8E6EE',
    fontSize: 9,
  },

  kpiValue: {
    color: '#FFFFFF',

    fontSize: 15,
    fontWeight: '700',

    marginTop: 3,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    width: '100%',

    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',

    marginTop: 20,
    marginBottom: 9,

    paddingHorizontal: 2,
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

  smallButton: {
    backgroundColor: '#E8F4F3',

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  smallButtonText: {
    color: '#08736C',

    fontSize: 10,
    fontWeight: '800',
  },

  /* =======================================================
     QUICK WORK
  ======================================================= */

  quickGrid: {
    width: '100%',

    flexDirection: 'row',
    flexWrap: 'wrap',

    gap: 9,
  },

  quickGridLarge: {
    gap: 9,
  },

  quickAction: {
    width: '48%',

    backgroundColor: colors.card,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 18,

    padding: 13,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,

    elevation: 2,
  },

  quickActionPressed: {
    opacity: 0.75,
  },

  quickActionIcon: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: '#E8F6F3',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 9,
  },

  quickActionIconText: {
    fontSize: 20,
  },

  quickActionTitle: {
    color: colors.text,

    fontSize: 12,
    fontWeight: '700',

    textAlign: 'center',
  },

  quickActionDescription: {
    color: colors.mutedText,

    fontSize: 9,

    lineHeight: 13,

    marginTop: 4,

    textAlign: 'center',

    width: '100%',
  },

  openBadge: {
    alignSelf: 'center',

    backgroundColor: '#E4F6ED',

    borderRadius: 99,

    paddingHorizontal: 7,
    paddingVertical: 4,

    marginTop: 7,
  },

  openBadgeText: {
    color: colors.success,

    fontSize: 8,
    fontWeight: '900',
  },

  /* =======================================================
     OPERATIONS EXPERT
  ======================================================= */

  expertCard: {
    width: '100%',

    backgroundColor: '#FFF8DF',

    borderWidth: 1,
    borderColor: '#F0D277',

    borderRadius: 18,

    padding: 14,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 12,
  },

  expertIcon: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: '#FFF1BF',

    alignItems: 'center',
    justifyContent: 'center',
  },

  expertIconText: {
    fontSize: 20,
  },

  expertContent: {
    flex: 1,
    minWidth: 0,
  },

  expertTitle: {
    color: colors.text,

    fontSize: 13,
    fontWeight: '700',
  },

  expertDescription: {
    color: '#66551C',

    fontSize: 9,

    lineHeight: 13,

    marginTop: 3,
  },

  doNowButton: {
    backgroundColor: colors.teal,

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  doNowText: {
    color: '#FFFFFF',

    fontSize: 10,
    fontWeight: '800',
  },

  /* =======================================================
     BUSINESS FLOW
  ======================================================= */

  flow: {
    gap: 6,

    paddingBottom: 3,
  },

  flowStep: {
    width: 120,

    backgroundColor: colors.card,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 14,

    padding: 11,
  },

  flowNumber: {
    width: 24,
    height: 24,

    borderRadius: 12,

    backgroundColor: colors.teal,

    alignItems: 'center',
    justifyContent: 'center',
  },

  flowNumberText: {
    color: '#FFFFFF',

    fontSize: 10,
    fontWeight: '900',
  },

  flowTitle: {
    color: colors.text,

    fontSize: 10,
    fontWeight: '700',

    marginTop: 7,
  },

  flowDescription: {
    color: colors.mutedText,

    fontSize: 8,

    lineHeight: 11,

    marginTop: 3,
  },

  /* =======================================================
     RECENT ACTIVITY
  ======================================================= */

  emptyCard: {
    width: '100%',

    backgroundColor: colors.card,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 18,

    paddingVertical: 35,
    paddingHorizontal: 15,

    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 32,
  },

  emptyTitle: {
    color: colors.text,

    fontSize: 15,
    fontWeight: '700',

    marginTop: 8,
  },

  emptyDescription: {
    color: colors.mutedText,

    fontSize: 10,

    textAlign: 'center',

    marginTop: 3,
  },

  /* =======================================================
     BOTTOM NAVIGATION
  ======================================================= */

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

    minHeight: 44,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonActive: {
    backgroundColor: '#E5F5F2',
  },

  navIcon: {
    color: colors.mutedText,

    fontSize: 19,

    marginBottom: 2,
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