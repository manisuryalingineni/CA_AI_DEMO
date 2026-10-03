import React, {
  useCallback,
  useState,
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  StatusBar,
} from "expo-status-bar";

import {
  colors,
} from "../../src/theme/colors";

import {
  loadDashboardData,
  type DashboardData,
  type RecentDocument,
} from "../../src/services/dashboardService";

/* =========================================================
   FORMATTERS
========================================================= */

function formatCurrency(
  value: number,
): string {
  return `₹${value.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatDate(
  value: string,
): string {
  if (!value) {
    return "";
  }

  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/* =========================================================
   QUICK ACTION
========================================================= */

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

        pressed &&
          styles.cardPressed,
      ]}
    >
      <View
        style={
          styles.quickActionIcon
        }
      >
        <Text
          style={
            styles.quickActionIconText
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        style={
          styles.quickActionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.quickActionDescription
        }
      >
        {description}
      </Text>

      <View
        style={
          styles.openBadge
        }
      >
        <Text
          style={
            styles.openBadgeText
          }
        >
          OPEN
        </Text>
      </View>
    </Pressable>
  );
}

/* =========================================================
   QUICK ENTRY
========================================================= */

type QuickEntryProps = {
  icon: string;

  title: string;

  onPress?: () => void;
};

function QuickEntry({
  icon,
  title,
  onPress,
}: QuickEntryProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickEntryCard,

        pressed &&
          styles.cardPressed,
      ]}
    >
      <View
        style={
          styles.quickEntryIcon
        }
      >
        <Text
          style={
            styles.quickEntryIconText
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        style={
          styles.quickEntryTitle
        }
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   FLOW STEP
========================================================= */

type FlowStepProps = {
  number: string;

  title: string;

  description: string;

  onPress?: () => void;
};

function FlowStep({
  number,
  title,
  description,
  onPress,
}: FlowStepProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.flowStep,

        pressed &&
          styles.cardPressed,
      ]}
    >
      <View
        style={
          styles.flowNumber
        }
      >
        <Text
          style={
            styles.flowNumberText
          }
        >
          {number}
        </Text>
      </View>

      <Text
        style={
          styles.flowTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.flowDescription
        }
      >
        {description}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   RECENT DOCUMENT
========================================================= */

function RecentDocumentCard({
  document,
}: {
  document: RecentDocument;
}) {
  const isSale =
    document.type === "SALE";

  return (
    <View
      style={
        styles.documentCard
      }
    >
      {/* LEFT ICON */}

      <View
        style={[
          styles.documentIcon,

          !isSale &&
            styles.documentIconPurchase,
        ]}
      >
        <Text
          style={
            styles.documentIconText
          }
        >
          {isSale
            ? "🧾"
            : "📥"}
        </Text>
      </View>

      {/* CENTER */}

      <View
        style={
          styles.documentContent
        }
      >
        <Text
          style={
            styles.documentTitle
          }
          numberOfLines={1}
        >
          {
            document.documentNumber
          }
          {" • "}
          {
            document.partyName
          }
        </Text>

        <Text
          style={
            styles.documentMeta
          }
          numberOfLines={1}
        >
          {isSale
            ? "Tax invoice"
            : "Purchase bill"}
          {" • "}
          {formatDate(
            document.documentDate,
          )}
          {" • "}
          {document.lineCount}
          {" line"}
          {document.lineCount ===
          1
            ? ""
            : "s"}
        </Text>

        {document.dueAmount >
        0 ? (
          <View
            style={
              styles.dueBadge
            }
          >
            <Text
              style={
                styles.dueBadgeText
              }
            >
              {formatCurrency(
                document.dueAmount,
              )}{" "}
              DUE
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.paidBadge
            }
          >
            <Text
              style={
                styles.paidBadgeText
              }
            >
              PAID
            </Text>
          </View>
        )}
      </View>

      {/* RIGHT */}

      <View
        style={
          styles.documentRight
        }
      >
        <Text
          style={
            styles.documentAmount
          }
        >
          {formatCurrency(
            document.totalAmount,
          )}
        </Text>

        <Text
          style={
            styles.documentStatus
          }
        >
          ISSUED
        </Text>

        <Pressable
  style={({ pressed }) => [
    styles.pdfButton,
    pressed && styles.cardPressed,
  ]}
  onPress={() => {
    if (document.type === "SALE") {
      router.push({
        pathname: "/invoice-preview",
        params: {
          saleId: document.id,
        },
      });
    }
  }}
>
  <Text style={styles.pdfButtonText}>
    PDF
  </Text>
</Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardScreen() {
  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const isLargeScreen =
    width >= 721;

  const selectedRole =
    "Business Owner";

  /* =======================================================
     DASHBOARD DATA
  ======================================================= */

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<DashboardData>({
      summary: {
        sales: 0,

        purchases: 0,

        toReceive: 0,

        toPay: 0,
      },

      recentDocuments: [],
    });

  const [
    loadingDashboard,
    setLoadingDashboard,
  ] = useState(false);

  /* =======================================================
     REFRESH FROM SQLITE
  ======================================================= */

  const refreshDashboard =
    useCallback(async () => {
      try {
        setLoadingDashboard(
          true,
        );

        const data =
          await loadDashboardData();

        setDashboardData(
          data,
        );
      } catch (error) {
        console.error(
          "Unable to load dashboard",
          error,
        );
      } finally {
        setLoadingDashboard(
          false,
        );
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [
      refreshDashboard,
    ]),
  );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View
      style={
        styles.container
      }
    >
      <StatusBar
        style="light"
      />

      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <View
        style={[
          styles.topHeader,

          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.headerInner
          }
        >
          <View
            style={
              styles.logo
            }
          >
            <Text
              style={
                styles.logoText
              }
            >
              CA
            </Text>
          </View>

          <View
            style={
              styles.headerTitle
            }
          >
            <Text
              style={
                styles.appTitle
              }
            >
              CA Business
            </Text>

            <Text
              style={
                styles.appSubtitle
              }
            >
              Retail Shop • Retail Shop
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />

          <View
            style={
              styles.userButton
            }
          >
            <View
              style={
                styles.userButtonAvatar
              }
            >
              <Text
                style={
                  styles.userButtonAvatarText
                }
              >
                👤
              </Text>
            </View>

            <View
              style={
                styles.userButtonContent
              }
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={
                  styles.userButtonText
                }
              >
                {selectedRole}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.scrollContent,

          {
            paddingBottom:
              120 +
              insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.main,

            isLargeScreen &&
              styles.mainLarge,
          ]}
        >
          {/* =================================================
              HERO
          ================================================= */}

          <View
            style={
              styles.hero
            }
          >
            <View
              style={[
                styles.heroRow,

                !isLargeScreen &&
                  styles.heroRowMobile,
              ]}
            >
              <View
                style={
                  styles.heroIdentity
                }
              >
                <View
                  style={
                    styles.heroIcon
                  }
                >
                  <Text
                    style={
                      styles.heroIconText
                    }
                  >
                    🛍️
                  </Text>
                </View>

                <View
                  style={
                    styles.heroTitleArea
                  }
                >
                  <Text
                    style={
                      styles.heroTitle
                    }
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={
                      0.85
                    }
                  >
                    Retail Shop
                  </Text>

                  <Text
                    style={
                      styles.heroDescription
                    }
                  >
                    POS, products and
                    counter sales
                    {" • "}
                    Owner workspace
                  </Text>
                </View>
              </View>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.switchButton,

                  !isLargeScreen &&
                    styles.switchButtonMobile,

                  pressed &&
                    styles.switchButtonPressed,
                ]}
                onPress={() =>
                  router.push(
                    "/business-selection",
                  )
                }
              >
                <Text
                  style={
                    styles.switchButtonText
                  }
                >
                  Switch business
                </Text>
              </Pressable>
            </View>

            {/* KPI */}

            <View
              style={[
                styles.kpiGrid,

                !isLargeScreen &&
                  styles.kpiGridMobile,
              ]}
            >
              {/* SALES */}

              <View
                style={[
                  styles.kpi,

                  !isLargeScreen &&
                    styles.kpiMobile,
                ]}
              >
                <Text
                  style={
                    styles.kpiLabel
                  }
                >
                  Sales
                </Text>

                <Text
                  style={
                    styles.kpiValue
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(
                    dashboardData
                      .summary.sales,
                  )}
                </Text>
              </View>

              {/* PURCHASES */}

              <View
                style={[
                  styles.kpi,

                  !isLargeScreen &&
                    styles.kpiMobile,
                ]}
              >
                <Text
                  style={
                    styles.kpiLabel
                  }
                >
                  Purchases
                </Text>

                <Text
                  style={
                    styles.kpiValue
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(
                    dashboardData
                      .summary
                      .purchases,
                  )}
                </Text>
              </View>

              {/* TO RECEIVE */}

              <View
                style={[
                  styles.kpi,

                  !isLargeScreen &&
                    styles.kpiMobile,
                ]}
              >
                <Text
                  style={
                    styles.kpiLabel
                  }
                >
                  To Receive
                </Text>

                <Text
                  style={
                    styles.kpiValue
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(
                    dashboardData
                      .summary
                      .toReceive,
                  )}
                </Text>
              </View>

              {/* TO PAY */}

              <View
                style={[
                  styles.kpi,

                  !isLargeScreen &&
                    styles.kpiMobile,
                ]}
              >
                <Text
                  style={
                    styles.kpiLabel
                  }
                >
                  To Pay
                </Text>

                <Text
                  style={
                    styles.kpiValue
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(
                    dashboardData
                      .summary
                      .toPay,
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              QUICK ENTRY
          ================================================= */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View
              style={
                styles.sectionHeaderTextArea
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Quick Entry
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Frequently used retail
                operations
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
              style={({
                pressed,
              }) => [
                styles.smallButton,

                pressed &&
                  styles.cardPressed,
              ]}
            >
              <Text
                style={
                  styles.smallButtonText
                }
              >
                All operations
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.quickEntryGrid
            }
          >
            <QuickEntry
              icon="👤"
              title="Customer"
              onPress={() =>
                router.push(
                  "/customers",
                )
              }
            />

            <QuickEntry
              icon="🏢"
              title="Vendor"
              onPress={() =>
                router.push(
                  "/vendors",
                )
              }
            />

            <QuickEntry
              icon="🧾"
              title="Sale Bill"
              onPress={() =>
                router.push(
                  "/pos",
                )
              }
            />

            <QuickEntry
              icon="📥"
              title="Purchase"
              onPress={() =>
                router.push(
                  "/purchases/add",
                )
              }
            />

            <QuickEntry
              icon="💰"
              title="Money"
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
            />

            <QuickEntry
              icon="🏦"
              title="Bank"
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
            />

            <QuickEntry
              icon="👥"
              title="Payroll"
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
            />

            <QuickEntry
              icon="📊"
              title="Reports"
              onPress={() =>
                router.push(
                  "/sales",
                )
              }
            />
          </View>

          {/* =================================================
              RETAIL WORK SHOP
          ================================================= */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View
              style={
                styles.sectionHeaderTextArea
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Retail Work Shop
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Common retail tasks
              </Text>
            </View>
          </View>

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
              onPress={() =>
                router.push(
                  "/customers",
                )
              }
            />

            <QuickAction
              icon="🧾"
              title="POS sale"
              description="GST invoice and counter sale"
              onPress={() =>
                router.push(
                  "/pos",
                )
              }
            />

            <QuickAction
              icon="📥"
              title="Buy stock"
              description="Purchase bill and inward stock"
              onPress={() =>
                router.push(
                  "/purchases/add",
                )
              }
            />

            <QuickAction
              icon="📦"
              title="Stock check"
              description="Quantity, cost and reorder view"
              onPress={() =>
                router.push(
                  "/products",
                )
              }
            />

            <QuickAction
              icon="💳"
              title="Receive money"
              description="Cash, UPI, card or cheque"
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
            />

            <QuickAction
              icon="📈"
              title="Daily sales"
              description="Live sales register"
              onPress={() =>
                router.push(
                  "/sales",
                )
              }
            />
          </View>

          {/* =================================================
              BUSINESS FLOW
          ================================================= */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Complete business flow
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Every numbered step opens
                its working form
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.flow
            }
          >
            <FlowStep
              number="1"
              title="Create party"
              description="Customer or vendor"
              onPress={() =>
                router.push(
                  "/customers",
                )
              }
            />

            <FlowStep
              number="2"
              title="Stock check"
              description="Items, quantity and GST"
              onPress={() =>
                router.push(
                  "/products",
                )
              }
            />

            <FlowStep
              number="3"
              title="Purchase"
              description="Purchase and inward stock"
              onPress={() =>
                router.push(
                  "/purchases/add",
                )
              }
            />

            <FlowStep
              number="4"
              title="Sales invoice"
              description="Stock + invoice + GST"
              onPress={() =>
                router.push(
                  "/pos",
                )
              }
            />

            <FlowStep
              number="5"
              title="Payment"
              description="Receipt or vendor payment"
              onPress={() =>
                router.push(
                  "/all-operations",
                )
              }
            />

            <FlowStep
              number="6"
              title="Reports"
              description="Business reports"
              onPress={() =>
                router.push(
                  "/sales",
                )
              }
            />
          </ScrollView>

          {/* =================================================
              RECENT DOCUMENTS
          ================================================= */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Recent documents
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Latest sales and purchase
                documents
              </Text>
            </View>

            <Pressable
              style={({
                pressed,
              }) => [
                styles.smallButton,

                pressed &&
                  styles.cardPressed,
              ]}
            >
              <Text
                style={
                  styles.smallButtonText
                }
              >
                PDF Centre
              </Text>
            </Pressable>
          </View>

          {loadingDashboard &&
          dashboardData
            .recentDocuments
            .length === 0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                ⏳
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Loading
              </Text>
            </View>
          ) : dashboardData
              .recentDocuments
              .length === 0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                🧾
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No transactions
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                Create the first document
                from Quick Entry.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.documentsList
              }
            >
              {dashboardData.recentDocuments.map(
                (document) => (
                  <RecentDocumentCard
                    key={`${document.type}-${document.id}`}
                    document={
                      document
                    }
                  />
                ),
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* =====================================================
          BOTTOM NAV
      ===================================================== */}

      <View
        style={[
          styles.bottomNavigation,

          {
            bottom:
              Math.max(
                8,
                insets.bottom,
              ),
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.replace(
              "/dashboard",
            )
          }
          style={[
            styles.navButton,
            styles.navButtonActive,
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
              styles.navActiveText
            }
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(
              "/sales",
            )
          }
          style={
            styles.navButton
          }
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

        <Pressable
          onPress={() =>
            router.push(
              "/purchases",
            )
          }
          style={
            styles.navButton
          }
        >
          <Text
            style={
              styles.navIcon
            }
          >
            📥
          </Text>

          <Text
            style={
              styles.navText
            }
          >
            Purchases
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(
              "/stock",
            )
          }
          style={
            styles.navButton
          }
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
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        colors.background,
    },

    /* HEADER */

    topHeader: {
      width: "100%",

      backgroundColor:
        colors.primary,

      shadowColor: "#0015",

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.25,

      shadowRadius: 8,

      elevation: 6,
    },

    headerInner: {
      width: "100%",

      maxWidth: 1050,

      minHeight: 64,

      alignSelf: "center",

      paddingHorizontal: 14,

      flexDirection: "row",

      alignItems: "center",

      gap: 10,
    },

    logo: {
      width: 42,

      height: 42,

      borderRadius: 14,

      backgroundColor:
        colors.gold,

      alignItems: "center",

      justifyContent:
        "center",
    },

    logoText: {
      color: colors.primary,

      fontSize: 15,

      fontWeight: "900",
    },

    headerTitle: {
      flexShrink: 1,

      minWidth: 0,
    },

    appTitle: {
      color: "#FFFFFF",

      fontSize: 16,

      fontWeight: "700",
    },

    appSubtitle: {
      color: "#D8E7EF",

      fontSize: 11,

      marginTop: 2,
    },

    headerSpacer: {
      flex: 1,
    },

    userButton: {
      flexShrink: 0,

      minHeight: 42,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "rgba(255,255,255,0.12)",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.24)",

      borderRadius: 14,

      paddingHorizontal: 9,

      paddingVertical: 6,
    },

    userButtonAvatar: {
      width: 30,

      height: 30,

      borderRadius: 10,

      backgroundColor:
        colors.teal,

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 7,
    },

    userButtonAvatarText: {
      fontSize: 15,
    },

    userButtonContent: {
      maxWidth: 115,

      minWidth: 0,
    },

    userButtonText: {
      color: "#FFFFFF",

      fontSize: 10,

      fontWeight: "800",
    },

    /* MAIN */

    scrollContent: {
      flexGrow: 1,
    },

    main: {
      width: "100%",

      paddingHorizontal: 11,

      paddingTop: 14,

      alignSelf: "center",
    },

    mainLarge: {
      maxWidth: 1050,
    },

    /* HERO */

    hero: {
      width: "100%",

      backgroundColor:
        colors.primary,

      borderRadius: 24,

      padding: 18,

      overflow: "hidden",

      shadowColor:
        colors.primary,

      shadowOffset: {
        width: 0,
        height: 9,
      },

      shadowOpacity: 0.1,

      shadowRadius: 15,

      elevation: 3,
    },

    heroRow: {
      width: "100%",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      gap: 12,
    },

    heroRowMobile: {
      flexDirection: "column",

      alignItems:
        "flex-start",
    },

    heroIdentity: {
      flex: 1,

      minWidth: 0,

      width: "100%",

      flexDirection: "row",

      alignItems: "center",
    },

    heroIcon: {
      width: 52,

      height: 52,

      flexShrink: 0,

      borderRadius: 17,

      backgroundColor:
        "rgba(255,255,255,0.09)",

      alignItems: "center",

      justifyContent:
        "center",
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
      color: "#FFFFFF",

      fontSize: 21,

      fontWeight: "700",
    },

    heroDescription: {
      color: "#D9E8F0",

      fontSize: 11,

      marginTop: 4,

      lineHeight: 15,
    },

    switchButton: {
      flexShrink: 0,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 12,

      paddingHorizontal: 13,

      paddingVertical: 8,

      minHeight: 34,

      alignItems: "center",

      justifyContent:
        "center",
    },

    switchButtonMobile: {
      minWidth: 150,

      alignSelf: "center",

      marginTop: 12,
    },

    switchButtonPressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.98,
        },
      ],
    },

    switchButtonText: {
      color: colors.primary,

      fontSize: 10,

      fontWeight: "800",
    },

    /* KPI */

    kpiGrid: {
      width: "100%",

      flexDirection: "row",

      flexWrap: "wrap",

      gap: 18,

      marginTop: 14,
    },

    kpiGridMobile: {
      justifyContent:
        "space-between",
    },

    kpi: {
      backgroundColor:
        "rgba(255,255,255,0.08)",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.12)",

      borderRadius: 16,

      paddingVertical: 18,

      paddingHorizontal: 12,

      alignItems: "center",

      justifyContent:
        "center",

      minHeight: 105,

      flex: 1,

      minWidth: 0,
    },

    kpiMobile: {
      flex: 0,

      width: "47%",

      minHeight: 78,

      paddingVertical: 10,

      paddingHorizontal: 8,
    },

    kpiLabel: {
      color: "#C9D9E2",

      fontSize: 11,

      fontWeight: "700",

      textAlign: "center",

      marginBottom: 5,
    },

    kpiValue: {
      width: "100%",

      color: "#FFFFFF",

      fontSize: 16,

      fontWeight: "800",

      textAlign: "center",
    },

    /* SECTION */

    sectionHeader: {
      width: "100%",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginTop: 20,

      marginBottom: 9,

      paddingHorizontal: 2,

      gap: 8,
    },

    sectionHeaderTextArea: {
      flex: 1,

      minWidth: 0,
    },

    sectionTitle: {
      color: colors.text,

      fontSize: 17,

      fontWeight: "700",
    },

    sectionSubtitle: {
      color:
        colors.mutedText,

      fontSize: 10,

      marginTop: 3,
    },

    smallButton: {
      flexShrink: 0,

      backgroundColor:
        "#E8F4F3",

      borderRadius: 12,

      paddingHorizontal: 10,

      paddingVertical: 8,
    },

    smallButtonText: {
      color: "#08736C",

      fontSize: 10,

      fontWeight: "800",
    },

    /* QUICK ENTRY */

    quickEntryGrid: {
      width: "100%",

      flexDirection: "row",

      flexWrap: "wrap",

      justifyContent:
        "space-between",
    },

    quickEntryCard: {
      width: "23%",

      minHeight: 80,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 14,

      alignItems: "center",

      justifyContent:
        "center",

      paddingHorizontal: 4,

      paddingVertical: 7,

      marginBottom: 10,

      shadowColor:
        colors.primary,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.05,

      shadowRadius: 5,

      elevation: 2,
    },

    quickEntryIcon: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#E8F6F3",

      alignItems: "center",

      justifyContent:
        "center",

      marginBottom: 5,
    },

    quickEntryIconText: {
      fontSize: 17,

      lineHeight: 21,

      textAlign: "center",
    },

    quickEntryTitle: {
      width: "100%",

      color: colors.text,

      fontSize: 11,

      fontWeight: "800",

      textAlign: "center",
    },

    /* QUICK ACTION */

    quickGrid: {
      width: "100%",

      flexDirection: "row",

      flexWrap: "wrap",

      justifyContent:
        "space-between",

      rowGap: 10,
    },

    quickGridLarge: {
      justifyContent:
        "flex-start",

      columnGap: 12,
    },

    quickAction: {
      width: "48.5%",

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 18,

      padding: 13,

      alignItems: "center",

      justifyContent:
        "center",

      shadowColor:
        colors.primary,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.07,

      shadowRadius: 10,

      elevation: 2,
    },

    cardPressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.98,
        },
      ],
    },

    quickActionIcon: {
      width: 42,

      height: 42,

      borderRadius: 13,

      backgroundColor:
        "#E8F6F3",

      alignItems: "center",

      justifyContent:
        "center",

      marginBottom: 9,
    },

    quickActionIconText: {
      fontSize: 20,
    },

    quickActionTitle: {
      color: colors.text,

      fontSize: 12,

      fontWeight: "700",

      textAlign: "center",
    },

    quickActionDescription: {
      color:
        colors.mutedText,

      fontSize: 9,

      lineHeight: 13,

      marginTop: 4,

      textAlign: "center",

      width: "100%",
    },

    openBadge: {
      alignSelf: "center",

      backgroundColor:
        "#E4F6ED",

      borderRadius: 99,

      paddingHorizontal: 7,

      paddingVertical: 4,

      marginTop: 7,
    },

    openBadgeText: {
      color:
        colors.success,

      fontSize: 8,

      fontWeight: "900",
    },

    /* FLOW */

    flow: {
      gap: 6,

      paddingBottom: 3,
    },

    flowStep: {
      width: 120,

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 14,

      padding: 11,
    },

    flowNumber: {
      width: 24,

      height: 24,

      borderRadius: 12,

      backgroundColor:
        colors.teal,

      alignItems: "center",

      justifyContent:
        "center",
    },

    flowNumberText: {
      color: "#FFFFFF",

      fontSize: 10,

      fontWeight: "900",
    },

    flowTitle: {
      color: colors.text,

      fontSize: 10,

      fontWeight: "700",

      marginTop: 7,
    },

    flowDescription: {
      color:
        colors.mutedText,

      fontSize: 8,

      lineHeight: 11,

      marginTop: 3,
    },

    /* =====================================================
       RECENT DOCUMENTS
    ===================================================== */

    documentsList: {
      width: "100%",

      gap: 8,
    },

    documentCard: {
      width: "100%",

      minHeight: 118,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 18,

      paddingHorizontal: 12,

      paddingVertical: 12,

      shadowColor:
        colors.primary,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.06,

      shadowRadius: 8,

      elevation: 2,
    },

    documentIcon: {
      width: 50,

      height: 50,

      flexShrink: 0,

      borderRadius: 15,

      backgroundColor:
        "#E7F6F3",

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 10,
    },

    documentIconPurchase: {
      backgroundColor:
        "#F4F2E8",
    },

    documentIconText: {
      fontSize: 24,
    },

    documentContent: {
      flex: 1,

      minWidth: 0,
    },

    documentTitle: {
      color: colors.text,

      fontSize: 13,

      fontWeight: "900",
    },

    documentMeta: {
      color:
        colors.mutedText,

      fontSize: 9,

      lineHeight: 13,

      marginTop: 4,
    },

    dueBadge: {
      alignSelf: "flex-start",

      backgroundColor:
        "#FFF1CF",

      borderRadius: 99,

      paddingHorizontal: 8,

      paddingVertical: 4,

      marginTop: 7,
    },

    dueBadgeText: {
      color: "#976300",

      fontSize: 8,

      fontWeight: "900",
    },

    paidBadge: {
      alignSelf: "flex-start",

      backgroundColor:
        "#E4F6ED",

      borderRadius: 99,

      paddingHorizontal: 8,

      paddingVertical: 4,

      marginTop: 7,
    },

    paidBadgeText: {
      color: "#13845E",

      fontSize: 8,

      fontWeight: "900",
    },

    documentRight: {
      width: 82,

      flexShrink: 0,

      alignItems: "flex-end",

      marginLeft: 8,
    },

    documentAmount: {
      color: colors.text,

      fontSize: 13,

      fontWeight: "900",

      textAlign: "right",
    },

    documentStatus: {
      color:
        colors.mutedText,

      fontSize: 8,

      fontWeight: "700",

      marginTop: 3,

      textAlign: "right",
    },

    pdfButton: {
      minWidth: 52,

      minHeight: 42,

      backgroundColor:
        "#E7F5F3",

      borderRadius: 13,

      alignItems: "center",

      justifyContent:
        "center",

      marginTop: 7,

      paddingHorizontal: 8,
    },

    pdfButtonText: {
      color: "#08766F",

      fontSize: 10,

      fontWeight: "900",
    },

    /* EMPTY */

    emptyCard: {
      width: "100%",

      backgroundColor:
        colors.card,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 18,

      paddingVertical: 35,

      paddingHorizontal: 15,

      alignItems: "center",
    },

    emptyIcon: {
      fontSize: 32,
    },

    emptyTitle: {
      color: colors.text,

      fontSize: 15,

      fontWeight: "700",

      marginTop: 8,
    },

    emptyDescription: {
      color:
        colors.mutedText,

      fontSize: 10,

      textAlign: "center",

      marginTop: 3,
    },

    /* BOTTOM NAV */

    bottomNavigation: {
      position: "absolute",

      left: 9,

      right: 9,

      flexDirection: "row",

      gap: 4,

      padding: 6,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 20,

      shadowColor:
        colors.primary,

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

      alignItems: "center",

      justifyContent:
        "center",
    },

    navButtonActive: {
      backgroundColor:
        "#E5F5F2",
    },

    navIcon: {
      color:
        colors.mutedText,

      fontSize: 19,

      marginBottom: 2,
    },

    navActiveText: {
      color: colors.teal,

      fontSize: 9,

      fontWeight: "800",
    },

    navText: {
      color:
        colors.mutedText,

      fontSize: 9,

      fontWeight: "800",
    },
  });