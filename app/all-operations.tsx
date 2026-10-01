import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../src/theme/colors";

/* =========================================================
   TYPES
========================================================= */

type ScreenSize = "small" | "phone" | "tablet" | "desktop";

type OperationCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  width: `${number}%`;
  screenSize: ScreenSize;
};

/* =========================================================
   OPERATION CARD
========================================================= */

function OperationCard({
  icon,
  title,
  description,
  onPress,
  width,
  screenSize,
}: OperationCardProps) {
  const isSmall = screenSize === "small";

  const isTablet =
    screenSize === "tablet" || screenSize === "desktop";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.operationCard,

        { width },

        isSmall && styles.operationCardSmall,

        isTablet && styles.operationCardTablet,

        pressed && styles.pressed,
      ]}
    >
      {/* ICON */}

      <View
        style={[
          styles.operationIcon,

          isSmall && styles.operationIconSmall,

          isTablet && styles.operationIconTablet,
        ]}
      >
        <Text
          style={[
            styles.operationIconText,

            isSmall && styles.operationIconTextSmall,

            isTablet && styles.operationIconTextTablet,
          ]}
        >
          {icon}
        </Text>
      </View>

      {/* TITLE */}

      <Text
        style={[
          styles.operationTitle,

          isSmall && styles.operationTitleSmall,

          isTablet && styles.operationTitleTablet,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {title}
      </Text>

      {/* DESCRIPTION */}

      <Text
        style={[
          styles.operationDescription,

          isSmall && styles.operationDescriptionSmall,

          isTablet && styles.operationDescriptionTablet,
        ]}
        numberOfLines={2}
      >
        {description}
      </Text>

      {/* OPEN BADGE */}

      <View
        style={[
          styles.openBadge,

          isSmall && styles.openBadgeSmall,
        ]}
      >
        <Text
          style={[
            styles.openBadgeText,

            isSmall && styles.openBadgeTextSmall,
          ]}
        >
          OPEN
        </Text>
      </View>
    </Pressable>
  );
}

/* =========================================================
   ALL OPERATIONS SCREEN
========================================================= */

export default function AllOperationsScreen() {
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  /* =======================================================
     RESPONSIVE BREAKPOINTS
  ======================================================= */

  const screenSize: ScreenSize =
    width < 360
      ? "small"
      : width < 768
        ? "phone"
        : width < 1100
          ? "tablet"
          : "desktop";

  const isSmall = screenSize === "small";

  const isTablet =
    screenSize === "tablet" ||
    screenSize === "desktop";

  const isDesktop =
    screenSize === "desktop";

  /*
   * SMALL PHONE  = 2 cards
   * PHONE        = 2 cards
   * TABLET       = 3 cards
   * DESKTOP      = 4 cards
   */

  const cardWidth: `${number}%` =
    isDesktop
      ? "23.8%"
      : isTablet
        ? "31.5%"
        : "48.2%";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={[
            styles.headerInner,

            isSmall &&
              styles.headerInnerSmall,

            isTablet &&
              styles.headerInnerLarge,
          ]}
        >
          {/* BACK */}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,

              isSmall &&
                styles.backButtonSmall,

              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.backButtonText,

                isSmall &&
                  styles.backButtonTextSmall,
              ]}
            >
              ‹
            </Text>
          </Pressable>

          {/* LOGO */}

          <View
            style={[
              styles.logo,

              isSmall &&
                styles.logoSmall,
            ]}
          >
            <Text
              style={[
                styles.logoText,

                isSmall &&
                  styles.logoTextSmall,
              ]}
            >
              CA
            </Text>
          </View>

          {/* APP DETAILS */}

          <View
            style={
              styles.headerTextArea
            }
          >
            <Text
              style={[
                styles.appTitle,

                isSmall &&
                  styles.appTitleSmall,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              CA AI Business v4.2
            </Text>

            <Text
              style={[
                styles.appSubtitle,

                isSmall &&
                  styles.appSubtitleSmall,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Retail Shop • Retail Shop
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />

          {/* OWNER */}

          <View
            style={[
              styles.ownerButton,

              isSmall &&
                styles.ownerButtonSmall,
            ]}
          >
            <Text
              style={[
                styles.ownerIcon,

                isSmall &&
                  styles.ownerIconSmall,
              ]}
            >
              👤
            </Text>

            {!isSmall && (
              <Text
                style={
                  styles.ownerText
                }
                numberOfLines={1}
              >
                Business Owner
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.scrollContent,

          {
            paddingBottom:
              85 + insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.mainContent,

            isSmall &&
              styles.mainContentSmall,

            isTablet &&
              styles.mainContentLarge,
          ]}
        >
          {/* =================================================
              PAGE HEADING
          ================================================= */}

          <View
            style={[
              styles.headingRow,

              isSmall &&
                styles.headingRowSmall,
            ]}
          >
            <View
              style={
                styles.headingTextArea
              }
            >
              <Text
                style={[
                  styles.pageTitle,

                  isSmall &&
                    styles.pageTitleSmall,

                  isTablet &&
                    styles.pageTitleTablet,
                ]}
              >
                Retail Shop operations
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,

                  isSmall &&
                    styles.pageSubtitleSmall,
                ]}
              >
                End-to-end buttons designed
                for this business type
              </Text>
            </View>

            {/* CHANGE BUSINESS */}

            <Pressable
              onPress={() =>
                router.push(
                  "/business-selection"
                )
              }
              style={({ pressed }) => [
                styles.changeBusinessButton,

                isSmall &&
                  styles.changeBusinessButtonSmall,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.changeBusinessText,

                  isSmall &&
                    styles.changeBusinessTextSmall,
                ]}
              >
                Change{"\n"}business
              </Text>
            </Pressable>
          </View>

          {/* =================================================
              OPERATIONS EXPERT
          ================================================= */}

          <View
            style={[
              styles.expertCard,

              isSmall &&
                styles.expertCardSmall,
            ]}
          >
            <View
              style={
                styles.expertLeft
              }
            >
              <View
                style={[
                  styles.expertIcon,

                  isSmall &&
                    styles.expertIconSmall,
                ]}
              >
                <Text
                  style={[
                    styles.expertIconText,

                    isSmall &&
                      styles.expertIconTextSmall,
                  ]}
                >
                  🧭
                </Text>
              </View>

              <View
                style={
                  styles.expertTextArea
                }
              >
                <Text
                  style={[
                    styles.expertTitle,

                    isSmall &&
                      styles.expertTitleSmall,
                  ]}
                  numberOfLines={2}
                >
                  Operations Expert: Clear
                  pending payments
                </Text>

                <Text
                  style={[
                    styles.expertDescription,

                    isSmall &&
                      styles.expertDescriptionSmall,
                  ]}
                  numberOfLines={2}
                >
                  2 invoice or bill balance(s)
                  need collection or payment.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                router.push("/sales")
              }
              style={({ pressed }) => [
                styles.doNowButton,

                isSmall &&
                  styles.doNowButtonSmall,

                pressed &&
                  styles.doNowButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.doNowButtonText,

                  isSmall &&
                    styles.doNowButtonTextSmall,
                ]}
              >
                Do now
              </Text>
            </Pressable>
          </View>

          {/* =================================================
              OPERATION CARDS
          ================================================= */}

          <View
            style={[
              styles.operationGrid,

              isSmall &&
                styles.operationGridSmall,
            ]}
          >
            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="👤"
              title="Customer"
              description="Add customer or walk-in party"
              onPress={() =>
                router.push("/customers")
              }
            />

            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="🧾"
              title="POS sale"
              description="GST invoice and counter sale"
              onPress={() =>
                router.push("/pos")
              }
            />

            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="📥"
              title="Buy stock"
              description="Purchase bill and inward stock"
              onPress={() =>
                router.push("/purchases")
              }
            />

            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="📦"
              title="Stock check"
              description="Quantity, cost and reorder view"
              onPress={() =>
                router.push("/products")
              }
            />

            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="💳"
              title="Receive money"
              description="Cash, UPI, card or cheque"
              onPress={() =>
                router.push("/sales")
              }
            />

            <OperationCard
              width={cardWidth}
              screenSize={screenSize}
              icon="📈"
              title="Daily sales"
              description="Live sales register PDF"
              onPress={() =>
                router.push("/sales")
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <View
        style={[
          styles.bottomNavigation,

          isSmall &&
            styles.bottomNavigationSmall,

          {
            bottom: Math.max(
              6,
              insets.bottom
            ),
          },

          isTablet &&
            styles.bottomNavigationLarge,
        ]}
      >
        {/* HOME */}

        <Pressable
          onPress={() =>
            router.replace(
              "/dashboard"
            )
          }
          style={({ pressed }) => [
            styles.navButton,

            isSmall &&
              styles.navButtonSmall,

            pressed &&
              styles.navPressed,
          ]}
        >
          <Text
            style={[
              styles.navIcon,

              isSmall &&
                styles.navIconSmall,
            ]}
          >
            ⌂
          </Text>

          <Text
            style={[
              styles.navText,

              isSmall &&
                styles.navTextSmall,
            ]}
          >
            Home
          </Text>
        </Pressable>

        {/* SALES */}

        <Pressable
          onPress={() =>
            router.push("/sales")
          }
          style={({ pressed }) => [
            styles.navButton,

            isSmall &&
              styles.navButtonSmall,

            pressed &&
              styles.navPressed,
          ]}
        >
          <Text
            style={[
              styles.navIcon,

              isSmall &&
                styles.navIconSmall,
            ]}
          >
            🧾
          </Text>

          <Text
            style={[
              styles.navText,

              isSmall &&
                styles.navTextSmall,
            ]}
          >
            Sales
          </Text>
        </Pressable>

        {/* PURCHASES */}

        <Pressable
          onPress={() =>
            router.push(
              "/purchases"
            )
          }
          style={({ pressed }) => [
            styles.navButton,

            isSmall &&
              styles.navButtonSmall,

            pressed &&
              styles.navPressed,
          ]}
        >
          <Text
            style={[
              styles.navIcon,

              isSmall &&
                styles.navIconSmall,
            ]}
          >
            📥
          </Text>

          <Text
            style={[
              styles.navText,

              isSmall &&
                styles.navTextSmall,
            ]}
          >
            Purchases
          </Text>
        </Pressable>

        {/* MORE */}

        <Pressable
          onPress={() =>
            router.push("/stock")
          }
          style={({ pressed }) => [
            styles.navButton,

            isSmall &&
              styles.navButtonSmall,

            pressed &&
              styles.navPressed,
          ]}
        >
          <Text
            style={[
              styles.navIcon,

              isSmall &&
                styles.navIconSmall,
            ]}
          >
            ▦
          </Text>

          <Text
            style={[
              styles.navText,

              isSmall &&
                styles.navTextSmall,
            ]}
          >
            More
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     ROOT
  ======================================================= */

  container: {
    flex: 1,

    backgroundColor: "#F3F8FA",
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  topHeader: {
    width: "100%",

    backgroundColor: colors.primary,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.16,

    shadowRadius: 6,

    elevation: 5,
  },

  headerInner: {
    width: "100%",

    minHeight: 62,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 11,

    gap: 7,

    alignSelf: "center",
  },

  headerInnerSmall: {
    minHeight: 56,

    paddingHorizontal: 7,

    gap: 5,
  },

  headerInnerLarge: {
    maxWidth: 1050,
  },

  /* BACK */

  backButton: {
    width: 29,

    height: 34,

    flexShrink: 0,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  backButtonSmall: {
    width: 25,

    height: 30,
  },

  backButtonText: {
    color: "#FFFFFF",

    fontSize: 25,

    fontWeight: "300",

    lineHeight: 28,

    marginTop: -3,
  },

  backButtonTextSmall: {
    fontSize: 21,
  },

  /* LOGO */

  logo: {
    width: 36,

    height: 36,

    flexShrink: 0,

    borderRadius: 11,

    backgroundColor: "#FFFFFF",

    borderWidth: 1.5,

    borderColor: "#EFC64B",

    alignItems: "center",

    justifyContent: "center",
  },

  logoSmall: {
    width: 31,

    height: 31,

    borderRadius: 9,
  },

  logoText: {
    color: colors.primary,

    fontSize: 13,

    fontWeight: "900",
  },

  logoTextSmall: {
    fontSize: 11,
  },

  /* HEADER TITLE */

  headerTextArea: {
    flexShrink: 1,

    minWidth: 0,
  },

  appTitle: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "800",
  },

  appTitleSmall: {
    fontSize: 12,
  },

  appSubtitle: {
    color: "#D8E7EF",

    fontSize: 9,

    marginTop: 1,
  },

  appSubtitleSmall: {
    fontSize: 8,
  },

  headerSpacer: {
    flex: 1,
  },

  /* OWNER */

  ownerButton: {
    flexShrink: 0,

    minHeight: 34,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(255,255,255,0.11)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.2)",

    borderRadius: 17,

    paddingHorizontal: 8,

    paddingVertical: 5,

    maxWidth: 125,
  },

  ownerButtonSmall: {
    width: 31,

    height: 31,

    minHeight: 31,

    paddingHorizontal: 0,

    paddingVertical: 0,

    justifyContent: "center",

    borderRadius: 10,
  },

  ownerIcon: {
    fontSize: 12,

    marginRight: 4,
  },

  ownerIconSmall: {
    fontSize: 13,

    marginRight: 0,
  },

  ownerText: {
    color: "#FFFFFF",

    fontSize: 8,

    fontWeight: "700",

    flexShrink: 1,
  },

  /* =======================================================
     MAIN CONTENT
  ======================================================= */

  mainContent: {
    width: "100%",

    paddingHorizontal: 12,

    paddingTop: 17,

    alignSelf: "center",
  },

  mainContentSmall: {
    paddingHorizontal: 8,

    paddingTop: 12,
  },

  mainContentLarge: {
    maxWidth: 1050,
  },

  /* =======================================================
     PAGE HEADING
  ======================================================= */

  headingRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "space-between",

    gap: 10,

    marginBottom: 13,
  },

  headingRowSmall: {
    gap: 7,

    marginBottom: 10,
  },

  headingTextArea: {
    flex: 1,

    minWidth: 0,
  },

  pageTitle: {
    color: "#102033",

    fontSize: 19,

    fontWeight: "800",
  },

  pageTitleSmall: {
    fontSize: 16,
  },

  pageTitleTablet: {
    fontSize: 21,
  },

  pageSubtitle: {
    color: "#6C7781",

    fontSize: 10,

    marginTop: 3,

    lineHeight: 14,
  },

  pageSubtitleSmall: {
    fontSize: 8,

    lineHeight: 11,

    marginTop: 2,
  },

  /* CHANGE BUSINESS */

  changeBusinessButton: {
    flexShrink: 0,

    minWidth: 92,

    minHeight: 66,

    backgroundColor: "#EAF7F6",

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 9,
  },

  changeBusinessButtonSmall: {
    minWidth: 74,

    minHeight: 56,

    borderRadius: 11,

    paddingHorizontal: 6,
  },

  changeBusinessText: {
    color: "#00877F",

    fontSize: 14,

    fontWeight: "800",

    textAlign: "center",

    lineHeight: 18,
  },

  changeBusinessTextSmall: {
    fontSize: 11,

    lineHeight: 14,
  },

  /* =======================================================
     EXPERT CARD
  ======================================================= */

  expertCard: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "space-between",

    backgroundColor: "#FFFDF1",

    borderWidth: 1,

    borderColor: "#ECD471",

    borderRadius: 16,

    padding: 11,

    gap: 8,

    marginBottom: 12,
  },

  expertCardSmall: {
    padding: 8,

    gap: 6,

    borderRadius: 13,

    marginBottom: 9,
  },

  expertLeft: {
    flex: 1,

    minWidth: 0,

    flexDirection: "row",

    alignItems: "center",
  },

  expertIcon: {
    width: 43,

    height: 43,

    flexShrink: 0,

    borderRadius: 13,

    backgroundColor: "#E7F5F2",

    alignItems: "center",

    justifyContent: "center",
  },

  expertIconSmall: {
    width: 36,

    height: 36,

    borderRadius: 11,
  },

  expertIconText: {
    fontSize: 22,
  },

  expertIconTextSmall: {
    fontSize: 18,
  },

  expertTextArea: {
    flex: 1,

    minWidth: 0,

    marginLeft: 8,
  },

  expertTitle: {
    color: "#19283A",

    fontSize: 12,

    fontWeight: "800",

    lineHeight: 16,
  },

  expertTitleSmall: {
    fontSize: 10,

    lineHeight: 13,
  },

  expertDescription: {
    color: "#7C693A",

    fontSize: 9,

    lineHeight: 13,

    marginTop: 2,
  },

  expertDescriptionSmall: {
    fontSize: 8,

    lineHeight: 10,
  },

  doNowButton: {
    flexShrink: 0,

    minWidth: 65,

    minHeight: 49,

    paddingHorizontal: 9,

    borderRadius: 13,

    backgroundColor: "#0C958C",

    alignItems: "center",

    justifyContent: "center",
  },

  doNowButtonSmall: {
    minWidth: 53,

    minHeight: 41,

    paddingHorizontal: 6,

    borderRadius: 11,
  },

  doNowButtonPressed: {
    opacity: 0.8,

    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  doNowButtonText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "800",
  },

  doNowButtonTextSmall: {
    fontSize: 8,
  },

  /* =======================================================
     OPERATION GRID
  ======================================================= */

  operationGrid: {
    width: "100%",

    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent:
      "space-between",

    rowGap: 9,
  },

  operationGridSmall: {
    rowGap: 7,
  },

  /* =======================================================
     OPERATION CARD
     ALL CONTENT CENTERED
  ======================================================= */

  operationCard: {
    minHeight: 150,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E1E8EC",

    borderRadius: 15,

    paddingHorizontal: 10,

    paddingVertical: 11,

    /*
     * CENTRE EVERYTHING
     */
    alignItems: "center",

    justifyContent: "center",

    shadowColor: "#12263A",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.06,

    shadowRadius: 8,

    elevation: 2,
  },

  operationCardSmall: {
    minHeight: 124,

    paddingHorizontal: 7,

    paddingVertical: 8,

    borderRadius: 12,
  },

  operationCardTablet: {
    minHeight: 145,

    paddingHorizontal: 11,

    paddingVertical: 11,
  },

  /* CARD ICON */

  operationIcon: {
    width: 42,

    height: 42,

    borderRadius: 12,

    backgroundColor: "#E7F6F3",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 8,

    /*
     * keeps icon itself centered
     */
    alignSelf: "center",
  },

  operationIconSmall: {
    width: 34,

    height: 34,

    borderRadius: 10,

    marginBottom: 6,
  },

  operationIconTablet: {
    width: 40,

    height: 40,
  },

  operationIconText: {
    fontSize: 21,

    textAlign: "center",
  },

  operationIconTextSmall: {
    fontSize: 17,
  },

  operationIconTextTablet: {
    fontSize: 20,
  },

  /* CARD TITLE */

  operationTitle: {
    width: "100%",

    color: "#102033",

    fontSize: 13,

    fontWeight: "800",

    /*
     * CENTER TITLE
     */
    textAlign: "center",
  },

  operationTitleSmall: {
    fontSize: 11,
  },

  operationTitleTablet: {
    fontSize: 13,
  },

  /* CARD DESCRIPTION */

  operationDescription: {
    width: "100%",

    color: "#7B858D",

    fontSize: 9,

    lineHeight: 13,

    marginTop: 4,

    /*
     * CENTER DESCRIPTION
     */
    textAlign: "center",

    /*
     * Keeps cards equal height while
     * badge remains near bottom
     */
    flexGrow: 1,
  },

  operationDescriptionSmall: {
    fontSize: 7.5,

    lineHeight: 10,

    marginTop: 3,
  },

  operationDescriptionTablet: {
    fontSize: 9,
  },

  /* OPEN BADGE */

  openBadge: {
    backgroundColor: "#E3F7ED",

    borderRadius: 99,

    paddingHorizontal: 7,

    paddingVertical: 4,

    marginTop: 6,

    /*
     * CENTER BADGE
     */
    alignSelf: "center",
  },

  openBadgeSmall: {
    paddingHorizontal: 6,

    paddingVertical: 3,

    marginTop: 4,
  },

  openBadgeText: {
    color: "#149874",

    fontSize: 7,

    fontWeight: "900",

    textAlign: "center",
  },

  openBadgeTextSmall: {
    fontSize: 6,
  },

  pressed: {
    opacity: 0.74,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /* =======================================================
     BOTTOM NAVIGATION
  ======================================================= */

  /* =======================================================
   BOTTOM NAVIGATION
======================================================= */

bottomNavigation: {
  position: "absolute",

  left: 9,
  right: 9,

  flexDirection: "row",

  gap: 4,

  padding: 6,

  backgroundColor: "#FFFFFF",

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

bottomNavigationSmall: {
  left: 9,
  right: 9,
},

bottomNavigationLarge: {
  maxWidth: 620,

  width: "60%",

  alignSelf: "center",

  left: undefined,
  right: undefined,
},

navButton: {
  flex: 1,

  minHeight: 48,

  borderRadius: 14,

  alignItems: "center",
  justifyContent: "center",
},

navButtonSmall: {
  minHeight: 48,
},

navButtonActive: {
  backgroundColor: "#E5F5F2",
},

navPressed: {
  opacity: 0.75,
},

navIcon: {
  color: colors.mutedText,

  fontSize: 19,

  marginBottom: 2,
},

navIconSmall: {
  fontSize: 19,
},

navActiveText: {
  color: colors.teal,

  fontSize: 9,
  fontWeight: "800",
},

navText: {
  color: colors.mutedText,

  fontSize: 9,
  fontWeight: "800",
},

navTextSmall: {
  fontSize: 9,
},

});