import React, { useCallback, useState } from "react";

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
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import type { Vendor } from "../../src/types/vendor";
import {
  loadVendors,
  removeVendor,
} from '../../src/services/vendorService';
import { colors } from "../../src/theme/colors";

/* =================================
   TEMPORARY VENDOR DATA LOADER
================================= */


/* =================================
   VIEW VENDOR MODAL
================================= */

interface VendorViewProps {
  visible: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onEdit: () => void;
}

function VendorViewModal({
  visible,
  vendor,
  onClose,
  onEdit,
}: VendorViewProps) {
  if (!vendor) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.formSafeArea} edges={["top", "bottom"]}>
        <View style={styles.formScreen}>
          {/* VIEW HEADER */}

          <View style={styles.formHeader}>
            <View style={styles.formHeaderLeft}>
              <Pressable onPress={onClose} style={styles.formBackButton}>
                <Text style={styles.formBackIcon}>‹</Text>
              </Pressable>

              <View>
                <Text style={styles.formHeaderTitle}>Vendor Details</Text>

                <Text style={styles.formHeaderSubtitle}>
                  View retail vendor information
                </Text>
              </View>
            </View>

            <View style={styles.formLogo}>
              <Text style={styles.formLogoText}>CA</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
          >
            {/* VENDOR PROFILE */}

            <View style={styles.viewCard}>
              <View style={styles.viewProfileRow}>
                <View style={styles.viewAvatar}>
                  <Text style={styles.viewAvatarText}>
                    {vendor.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.viewProfileText}>
                  <Text style={styles.viewVendorName}>{vendor.name}</Text>

                  <Text style={styles.viewVendorMobile}>{vendor.mobile}</Text>
                </View>
              </View>
            </View>

            {/* BASIC DETAILS */}

            <View style={styles.viewCard}>
              <Text style={styles.viewSectionTitle}>Basic Information</Text>

              <View style={styles.viewRow}>
                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>Vendor Name</Text>

                  <Text style={styles.viewValue}>{vendor.name}</Text>
                </View>

                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>Mobile</Text>

                  <Text style={styles.viewValue}>{vendor.mobile}</Text>
                </View>
              </View>

              <View style={styles.viewRow}>
                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>GSTIN</Text>

                  <Text style={styles.viewValue}>
                    {vendor.gstin || "Unregistered"}
                  </Text>
                </View>

                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>State</Text>

                  <Text style={styles.viewValue}>{vendor.state || "—"}</Text>
                </View>
              </View>
            </View>

            {/* ACCOUNT DETAILS */}

            <View style={styles.viewCard}>
              <Text style={styles.viewSectionTitle}>Account Details</Text>

              <View style={styles.viewRow}>
                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>Credit Days</Text>

                  <Text style={styles.viewValue}>
                    {vendor.creditDays ?? 0} days
                  </Text>
                </View>

                <View style={styles.viewItem}>
                  <Text style={styles.viewLabel}>Opening Balance</Text>

                  <Text style={styles.viewValue}>
                    ₹
                    {Number(vendor.openingBalance ?? 0).toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              <View style={styles.viewFullItem}>
                <Text style={styles.viewLabel}>Vendor Details</Text>

                <Text style={styles.viewValue}>
                  {vendor.businessDetail || "—"}
                </Text>
              </View>

              <View style={styles.viewFullItem}>
                <Text style={styles.viewLabel}>Address</Text>

                <Text style={styles.viewValue}>{vendor.address || "—"}</Text>
              </View>
            </View>

            {/* ACTION */}

            <Pressable onPress={onEdit} style={styles.viewEditButton}>
              <Text style={styles.viewEditButtonText}>Edit Vendor</Text>
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

export default function VendorsScreen() {
  const { width } = useWindowDimensions();

  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [search, setSearch] = useState("");

  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);

  const [showView, setShowView] = useState(false);

  /* =================================
     LOAD
  ================================= */

  const refreshVendors = useCallback(async () => {
    try {
      const data = await loadVendors();

      setVendors(data);
    } catch (error) {
      Alert.alert(
        "Unable to load vendors",

        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshVendors();
    }, [refreshVendors]),
  );

  /* =================================
     SEARCH
  ================================= */

  const filteredVendors = vendors.filter((vendor) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      vendor.name.toLowerCase().includes(query) ||
      vendor.mobile.includes(query) ||
      (vendor.gstin ?? "").toLowerCase().includes(query) ||
      (vendor.state ?? "").toLowerCase().includes(query)
    );
  });

  /* =================================
     SUMMARY
  ================================= */

  const vendorsWithBalance = vendors.filter(
    (vendor) => Number(vendor.openingBalance ?? 0) > 0,
  ).length;

  const totalPayable = vendors.reduce(
    (sum, vendor) => sum + Number(vendor.openingBalance ?? 0),
    0,
  );

  /* =================================
     ADD
  ================================= */

  const handleAddVendor = () => {
    router.push("/vendors/add");
  };

  /* =================================
     EDIT
  ================================= */

  const handleEditVendor = (vendor: Vendor) => {
    setShowView(false);
    setViewingVendor(null);

    router.push({
      pathname: "/vendors/add",
      params: {
        vendorId: vendor.id,
      },
    });
  };

  /* =================================
     VIEW
  ================================= */

  const handleViewVendor = (vendor: Vendor) => {
    setViewingVendor(vendor);
    setShowView(true);
  };

  /* =================================
     DELETE
  ================================= */

  const handleDeleteVendor = (vendor: Vendor) => {
    Alert.alert(
      "Delete Vendor",

      `Are you sure you want to delete ${vendor.name}?`,

      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              await removeVendor(vendor.id);

              await refreshVendors();

              if (viewingVendor?.id === vendor.id) {
                setViewingVendor(null);

                setShowView(false);
              }

              Alert.alert("Deleted", "Vendor has been deleted successfully.");
            } catch (error) {
              Alert.alert(
                "Unable to delete",

                error instanceof Error
                  ? error.message
                  : "Something went wrong.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* MAIN HEADER */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.replace("/dashboard")}
              style={styles.backButton}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <View style={styles.logo}>
              <Text style={styles.logoText}>CA</Text>
            </View>

            <View>
              <Text style={styles.headerTitle}>Vendors</Text>

              <Text style={styles.headerSubtitle}>
                Manage your retail vendors
              </Text>
            </View>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>RS</Text>
          </View>
        </View>

        {/* CONTENT */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,

            width >= 900 && styles.contentLarge,
          ]}
        >
          {/* SEARCH */}

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search vendors..."
              placeholderTextColor={colors.mutedText}
              style={styles.searchInput}
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                style={styles.clearSearch}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            )}
          </View>

          {/* SUMMARY */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Vendors</Text>

              <Text style={styles.summaryValue}>{vendors.length}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>With Balance</Text>

              <Text style={styles.summaryValue}>{vendorsWithBalance}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Payable</Text>

              <Text style={styles.summaryValueSmall}>
                ₹{totalPayable.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* LIST HEADER */}

          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>Vendor List</Text>

              <Text style={styles.listSubtitle}>
                Manage vendors and payables
              </Text>
            </View>
          </View>

          {/* LIST */}

          {filteredVendors.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>V</Text>
              </View>

              <Text style={styles.emptyTitle}>
                {search ? "No vendors found" : "No vendors yet"}
              </Text>

              <Text style={styles.emptyText}>
                {search
                  ? "Try another vendor name or mobile number."
                  : "Add your first retail vendor to get started."}
              </Text>
            </View>
          ) : (
            <View style={styles.vendorList}>
              {filteredVendors.map((vendor) => {
                const balance = Number(vendor.openingBalance ?? 0);

                return (
                  <View key={vendor.id} style={styles.vendorCard}>
                    {/* VENDOR TOP */}

                    <View style={styles.vendorTopRow}>
                      <View style={styles.vendorIdentity}>
                        <View style={styles.vendorIcon}>
                          <Text style={styles.vendorIconText}>
                            {vendor.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.vendorMain}>
                          <Text style={styles.vendorName} numberOfLines={1}>
                            {vendor.name}
                          </Text>

                          <Text style={styles.vendorMobile}>
                            {vendor.mobile}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>Payable</Text>

                        <Text
                          style={[
                            styles.balanceValue,

                            balance > 0 && styles.balanceValueDue,
                          ]}
                        >
                          ₹{balance.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.vendorDivider} />

                    {/* DETAILS */}

                    <View style={styles.vendorDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>GSTIN</Text>

                        <Text style={styles.detailValue} numberOfLines={1}>
                          {vendor.gstin || "Unregistered"}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>State</Text>

                        <Text style={styles.detailValue} numberOfLines={1}>
                          {vendor.state || "—"}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Credit</Text>

                        <Text style={styles.detailValue}>
                          {vendor.creditDays ?? 0} days
                        </Text>
                      </View>
                    </View>

                    {vendor.address ? (
                      <Text style={styles.vendorAddress} numberOfLines={1}>
                        {vendor.address}
                      </Text>
                    ) : null}

                    {/* ACTION BUTTONS */}

                    <View style={styles.vendorActions}>
                      <Pressable
                        onPress={() => handleViewVendor(vendor)}
                        style={styles.viewButton}
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleEditVendor(vendor)}
                        style={styles.editButton}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteVendor(vendor)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* ADD VENDOR */}

        <View style={styles.bottomActionContainer}>
          <Pressable onPress={handleAddVendor} style={styles.bottomAddButton}>
            <Text style={styles.bottomAddIcon}>+</Text>

            <Text style={styles.bottomAddText}>Add Vendor</Text>
          </Pressable>
        </View>

        {/* VIEW */}

        <VendorViewModal
          visible={showView}
          vendor={viewingVendor}
          onClose={() => {
            setShowView(false);
            setViewingVendor(null);
          }}
          onEdit={() => {
            if (viewingVendor) {
              handleEditVendor(viewingVendor);
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
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* HEADER */

  header: {
    minHeight: 76,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 6,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  backIcon: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "500",
    marginTop: -2,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#D6E3EC",
    fontSize: 11,
    marginTop: 2,
  },

  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  profileText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* CONTENT */

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  contentLarge: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },

  /* SEARCH */

  searchContainer: {
    minHeight: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    color: colors.mutedText,
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
    alignItems: "center",
    justifyContent: "center",
  },

  clearSearchText: {
    color: colors.mutedText,
    fontSize: 22,
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  summaryCard: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },

  summaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "600",
  },

  summaryValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 4,
  },

  summaryValueSmall: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },

  /* LIST */

  listHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  listSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  vendorList: {
    gap: 10,
  },

  vendorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },

  vendorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  vendorIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  vendorIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E5F4F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  vendorIconText: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: "900",
  },

  vendorMain: {
    flex: 1,
  },

  vendorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },

  vendorMobile: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },

  balanceContainer: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  balanceLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "600",
  },

  balanceValue: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },

  balanceValueDue: {
    color: colors.warning,
  },

  vendorDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  vendorDetails: {
    flexDirection: "row",
    gap: 8,
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 3,
  },

  detailValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },

  vendorAddress: {
    color: colors.mutedText,
    fontSize: 11,
    marginTop: 10,
  },

  /* ACTIONS */

  vendorActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  viewButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },

  viewButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  editButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E7B7B4",
    backgroundColor: "#FFF7F6",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
  },

  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E5F4F2",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: "900",
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },

  /* BOTTOM ADD */

  bottomActionContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  bottomAddButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  bottomAddIcon: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "500",
    marginRight: 7,
  },

  bottomAddText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 20,
  },

  /* FORM */

  formSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  formScreen: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },

  formHeader: {
    minHeight: 76,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 6,
  },

  formHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  formBackButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  formBackIcon: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "500",
    marginTop: -2,
  },

  formHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  formHeaderSubtitle: {
    color: "#D6E3EC",
    fontSize: 11,
    marginTop: 3,
  },

  formLogo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  formLogoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },

  formScroll: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  viewCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  viewProfileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  viewAvatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#E5F4F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  viewAvatarText: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: "900",
  },

  viewProfileText: {
    flex: 1,
  },

  viewVendorName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },

  viewVendorMobile: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 4,
  },

  viewSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },

  viewRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },

  viewItem: {
    flex: 1,
  },

  viewFullItem: {
    width: "100%",
    marginBottom: 16,
  },

  viewLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 5,
  },

  viewValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  viewEditButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  viewEditButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
