import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

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
    useWindowDimensions,
} from 'react-native';

import {
    router,
    useLocalSearchParams,
} from 'expo-router';

import { Picker } from '@react-native-picker/picker';

import {
    SafeAreaView,
} from 'react-native-safe-area-context';

import { colors } from '../../src/theme/colors';

import {
    loadPurchaseWorkflow,
    loadPurchaseWorkflowDocument,
    savePurchaseWorkflow,
} from '../../src/services/purchaseService';

import {
    loadVendors,
} from '../../src/services/vendorService';

import {
    loadProducts,
} from '../../src/services/productService';

import type {
    DocumentType,
    PurchaseStatus,
    SupplyType,
    WorkflowDetail,
    WorkflowDocument,
} from '../../src/repositories/purchaseRepository';


/*         =
   LOCAL TYPES
        = */


type VendorOption = {
    id: string;
    name: string;
    state: string;
    gstin?: string;
};


type ProductOption = {
    id: string;
    name: string;
    hsn?: string;
    unit: string;
    purchasePrice: number;
    gstRate: number;
};


type PurchaseItem = {
    id: string;
    productId: string;
    productName: string;
    hsn: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    gstRate: string;
    discount: string;
    sourceItemId?: string;
};


interface FormDataProps {
    vendors: VendorOption[];

    products: ProductOption[];

    documentType:
    DocumentType;

    sourceType?:
    DocumentType;

    sourceId?:
    string;

    sourceDocument?:
    WorkflowDetail | null;

    returnPurchases:
    WorkflowDocument[];
}

type PurchaseDocumentConfig = {
    title: string;
    subtitle: string;
    saveLabel: string;
    successTitle: string;
    successMessage: string;
    showInvoice: boolean;
    showPayment: boolean;
    showRefund: boolean;
};


const DOCUMENT_CONFIG:
    Record<
        DocumentType,
        PurchaseDocumentConfig
    > = {

    REQUEST: {
        title:
            'Purchase request',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Purchase request',

        successTitle:
            'Purchase request saved',

        successMessage:
            'Purchase request has been saved successfully.',

        showInvoice: false,

        showPayment: false,

        showRefund: false,
    },


    RFQ: {
        title:
            'Request for quotation',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Request for quotation',

        successTitle:
            'RFQ saved',

        successMessage:
            'Request for quotation has been saved successfully.',

        showInvoice: false,

        showPayment: false,

        showRefund: false,
    },


    PO: {
        title:
            'Purchase order',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Purchase order',

        successTitle:
            'Purchase order saved',

        successMessage:
            'Purchase order has been saved successfully.',

        showInvoice: false,

        showPayment: false,

        showRefund: false,
    },


    GRN: {
        title:
            'Goods receipt note',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Goods receipt note',

        successTitle:
            'Goods receipt note saved',

        successMessage:
            'Goods receipt note has been saved successfully.',

        showInvoice: false,

        showPayment: false,

        showRefund: false,
    },


    PURCHASE: {
        title:
            'Purchase bill',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Purchase bill',

        successTitle:
            'Purchase saved',

        successMessage:
            'Purchase bill has been saved successfully.',

        showInvoice: true,

        showPayment: true,

        showRefund: false,
    },


    RETURN: {
        title:
            'Purchase return',

        subtitle:
            'Vendor and inward stock flow',

        saveLabel:
            'Save Purchase return',

        successTitle:
            'Purchase return saved',

        successMessage:
            'Purchase return has been saved successfully.',

        showInvoice: false,

        showPayment: false,

        showRefund: true,
    },
};

/*         =
   HELPERS
        = */

const todayIso = () =>
    new Date()
        .toISOString()
        .slice(0, 10);


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


/*         =
   PURCHASE WORKFLOW FORM
        = */

function WorkflowForm({
    vendors,
    products,
    documentType,
    sourceType,
    sourceId,
    sourceDocument,
    returnPurchases,
}: FormDataProps) {

    const config =
        DOCUMENT_CONFIG[
        documentType
        ];

    const { width } =
        useWindowDimensions();

    const isSmall =
        width < 380;

    const isWide =
        width >= 760;


    /*        ======
       HEADER
           ====== */

    const [vendorId, setVendorId] =
        useState('');

    const [
        invoiceNumber,
        setInvoiceNumber,
    ] = useState('');

    const [
        purchaseDate,
        setPurchaseDate,
    ] = useState(
        todayIso(),
    );

    const [
        dueDate,
        setDueDate,
    ] = useState(
        todayIso(),
    );

    const [
        supplyType,
        setSupplyType,
    ] =
        useState<SupplyType>(
            'WITHIN_STATE',
        );

    const [
        counterBranch,
        setCounterBranch,
    ] = useState('');

    const [
        salesperson,
        setSalesperson,
    ] = useState('');

    const [
        deliveryMethod,
        setDeliveryMethod,
    ] = useState('');

    const [
        paidAmount,
        setPaidAmount,
    ] = useState('0');

    const [
        refundAmount,
        setRefundAmount,
    ] = useState('0');

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        saving,
        setSaving,
    ] = useState(false);


    /*        ======
       NEW LINE
           ====== */

    const [
        selectedProductId,
        setSelectedProductId,
    ] = useState('');

    const [
        lineQuantity,
        setLineQuantity,
    ] = useState('1');

    const [
        lineRate,
        setLineRate,
    ] = useState('');

    const [
        lineGstRate,
        setLineGstRate,
    ] = useState('');

    const [
        lineDiscount,
        setLineDiscount,
    ] = useState('0');

    const [
        items,
        setItems,
    ] =
        useState<PurchaseItem[]>(
            [],
        );


    const selectedVendor =
        vendors.find(
            vendor =>
                vendor.id ===
                vendorId,
        );


    const selectedProduct =
        products.find(
            product =>
                product.id ===
                selectedProductId,
        );


    /*        ======
       AUTO PRODUCT VALUES
           ====== */

    useEffect(() => {

        if (!selectedProduct) {

            setLineRate('');

            setLineGstRate('');

            return;
        }

        setLineRate(
            String(
                selectedProduct
                    .purchasePrice,
            ),
        );

        setLineGstRate(
            String(
                selectedProduct
                    .gstRate,
            ),
        );

    }, [
        selectedProduct,
    ]);

    useEffect(() => {

        if (!sourceDocument) {
            return;
        }


        const source =
            sourceDocument.document;


        /*      ==
           HEADER PREFILL
             == */

        setVendorId(
            source.vendor_id || '',
        );


        setSupplyType(
            source.supply_type,
        );


        setCounterBranch(
            source.counter_branch || '',
        );


        setSalesperson(
            source.salesperson || '',
        );


        setDeliveryMethod(
            source.delivery_method || '',
        );


        /*
         * A converted document should never be dated
         * before its source document.
         */
        const today =
            todayIso();


        const nextDate =
            today <
                source.document_date
                ? source.document_date
                : today;


        setPurchaseDate(
            nextDate,
        );


        const nextDueDate =
            source.due_date &&
                source.due_date >=
                nextDate
                ? source.due_date
                : nextDate;


        setDueDate(
            nextDueDate,
        );


        /*      ==
           ITEM PREFILL
             == */

        const sourceItems =
            sourceDocument.items
                .map(
                    item => {

                        const remainingQuantity =
                            Math.max(
                                item.quantity -
                                (
                                    item.returned_quantity ||
                                    0
                                ),
                                0,
                            );


                        const quantity =
                            documentType ===
                                'RETURN'
                                ? remainingQuantity
                                : item.quantity;


                        return {

                            id:
                                `source_${item.id}`,

                            sourceItemId:
                                item.id,

                            productId:
                                item.product_id,

                            productName:
                                item.product_name,

                            hsn:
                                item.hsn ||
                                '',

                            unit:
                                item.unit ||
                                '',

                            quantity:
                                String(
                                    quantity,
                                ),

                            unitPrice:
                                String(
                                    item.unit_price,
                                ),

                            gstRate:
                                String(
                                    item.gst_rate,
                                ),

                            discount:
                                String(
                                    item.discount || 0,
                                ),
                        };
                    },
                )
                .filter(
                    item =>
                        Number(
                            item.quantity,
                        ) > 0,
                );


        setItems(
            sourceItems,
        );

    }, [
        sourceDocument,
        documentType,
    ]);

    /*        ======
       CALCULATIONS
           ====== */

    const calculations =
        useMemo(() => {

            let taxableValue = 0;
            let gstAmount = 0;
            let discount = 0;

            items.forEach(
                item => {

                    const quantity =
                        Number(
                            item.quantity,
                        ) || 0;

                    const rate =
                        Number(
                            item.unitPrice,
                        ) || 0;

                    const gstRate =
                        Number(
                            item.gstRate,
                        ) || 0;

                    const itemDiscount =
                        Number(
                            item.discount,
                        ) || 0;

                    const gross =
                        quantity *
                        rate;

                    const taxable =
                        Math.max(
                            gross -
                            itemDiscount,
                            0,
                        );

                    const gst =
                        taxable *
                        gstRate /
                        100;

                    taxableValue +=
                        taxable;

                    gstAmount +=
                        gst;

                    discount +=
                        itemDiscount;
                },
            );


            const totalAmount =
                taxableValue +
                gstAmount;


            const paid =
                Math.max(
                    Number(
                        paidAmount,
                    ) || 0,
                    0,
                );


            const due =
                Math.max(
                    totalAmount -
                    paid,
                    0,
                );


            let paymentStatus:
                PurchaseStatus =
                'UNPAID';


            if (
                paid > 0 &&
                paid < totalAmount
            ) {
                paymentStatus =
                    'PARTIAL';
            }


            if (
                totalAmount > 0 &&
                paid >= totalAmount
            ) {
                paymentStatus =
                    'PAID';
            }


            let cgstAmount = 0;
            let sgstAmount = 0;
            let igstAmount = 0;


            if (
                supplyType ===
                'WITHIN_STATE'
            ) {

                cgstAmount =
                    gstAmount / 2;

                sgstAmount =
                    gstAmount / 2;

            } else {

                igstAmount =
                    gstAmount;
            }


            return {
                taxableValue,
                gstAmount,
                cgstAmount,
                sgstAmount,
                igstAmount,
                discount,
                totalAmount,
                paid,
                due,
                paymentStatus,
            };

        }, [
            items,
            paidAmount,
            supplyType,
        ]);


    /*        ======
       ITEM HELPERS
           ====== */

    const updateItem = (
        id: string,
        field:
            keyof PurchaseItem,
        value: string,
    ) => {

        setItems(
            current =>
                current.map(
                    item =>
                        item.id === id
                            ? {
                                ...item,
                                [field]:
                                    value,
                            }
                            : item,
                ),
        );
    };


    const changeQuantity = (
        id: string,
        amount: number,
    ) => {

        setItems(
            current =>
                current.map(
                    item => {

                        if (
                            item.id !== id
                        ) {
                            return item;
                        }

                        const currentQuantity =
                            Number(
                                item.quantity,
                            ) || 1;

                        const nextQuantity =
                            Math.max(
                                currentQuantity +
                                amount,
                                1,
                            );

                        return {
                            ...item,

                            quantity:
                                String(
                                    nextQuantity,
                                ),
                        };
                    },
                ),
        );
    };


    const removeItem = (
        id: string,
    ) => {

        setItems(
            current =>
                current.filter(
                    item =>
                        item.id !== id,
                ),
        );
    };


    /*        ======
       ADD LINE
           ====== */

    const handleAddLine = () => {

        if (!selectedProduct) {

            Alert.alert(
                'Product required',
                'Please select a product.',
            );

            return;
        }


        const quantity =
            Number(
                lineQuantity,
            ) || 0;

        const rate =
            Number(
                lineRate,
            ) || 0;

        const gstRate =
            Number(
                lineGstRate,
            ) || 0;

        const discount =
            Number(
                lineDiscount,
            ) || 0;


        if (
            quantity <= 0
        ) {

            Alert.alert(
                'Invalid quantity',
                'Quantity must be greater than zero.',
            );

            return;
        }


        if (
            rate < 0
        ) {

            Alert.alert(
                'Invalid rate',
                'Purchase rate cannot be negative.',
            );

            return;
        }


        if (
            gstRate < 0 ||
            gstRate > 100
        ) {

            Alert.alert(
                'Invalid GST',
                'GST rate must be between 0 and 100.',
            );

            return;
        }


        if (
            discount < 0
        ) {

            Alert.alert(
                'Invalid discount',
                'Discount cannot be negative.',
            );

            return;
        }


        const existing =
            items.find(
                item =>
                    item.productId ===
                    selectedProduct.id,
            );


        if (existing) {

            updateItem(
                existing.id,
                'quantity',
                String(
                    (
                        Number(
                            existing.quantity,
                        ) || 0
                    ) +
                    quantity,
                ),
            );

        } else {

            setItems(
                current => [
                    ...current,

                    {
                        id:
                            `purchase_line_${Date.now()}_${Math.random()}`,

                        productId:
                            selectedProduct.id,

                        productName:
                            selectedProduct.name,

                        hsn:
                            selectedProduct.hsn ??
                            '',

                        unit:
                            selectedProduct.unit,

                        quantity:
                            String(
                                quantity,
                            ),

                        unitPrice:
                            String(
                                rate,
                            ),

                        gstRate:
                            String(
                                gstRate,
                            ),

                        discount:
                            String(
                                discount,
                            ),
                    },
                ],
            );
        }


        setSelectedProductId('');

        setLineQuantity('1');

        setLineRate('');

        setLineGstRate('');

        setLineDiscount('0');
    };


    /*        ======
       SAVE
           ====== */

    const handleSave =
        async () => {
            if (
                documentType ===
                'RETURN' &&
                (
                    sourceType !==
                    'PURCHASE' ||
                    !sourceId ||
                    !sourceDocument
                )
            ) {

                Alert.alert(
                    'Original purchase required',
                    'Select an original Purchase Bill before creating a Purchase Return.',
                );

                return;
            }
            if (!vendorId) {

                Alert.alert(
                    'Vendor required',
                    'Please select a vendor.',
                );

                return;
            }


            if (!purchaseDate) {

                Alert.alert(
                    'Date required',
                    'Please enter the document date.',
                );

                return;
            }


            if (!dueDate) {

                Alert.alert(
                    'Due date required',
                    'Please enter the due date.',
                );

                return;
            }


            if (
                dueDate <
                purchaseDate
            ) {

                Alert.alert(
                    'Invalid due date',
                    'Due date cannot be before the purchase date.',
                );

                return;
            }


            if (
                items.length === 0
            ) {

                Alert.alert(
                    'Items required',
                    'Please add at least one item.',
                );

                return;
            }


            if (
                (
                    documentType ===
                    'PURCHASE' ||
                    documentType ===
                    'RETURN'
                ) &&
                calculations
                    .totalAmount <= 0
            ) {

                Alert.alert(
                    'Invalid total',
                    'Document total must be greater than zero.',
                );

                return;
            }


            if (
                documentType ===
                'PURCHASE' &&
                calculations.paid >
                calculations.totalAmount
            ) {

                Alert.alert(
                    'Invalid payment',
                    'Paid amount cannot exceed purchase total.',
                );

                return;
            }


            if (saving) {
                return;
            }


            setSaving(true);


            try {
                await savePurchaseWorkflow({

                    documentType,

                    vendorId,

                    documentDate:
                        purchaseDate,

                    dueDate,

                    supplyType,

                    invoiceNumber:
                        documentType ===
                            'PURCHASE'
                            ? (
                                invoiceNumber
                                    .trim() ||
                                undefined
                            )
                            : undefined,

                    counterBranch:
                        counterBranch
                            .trim() ||
                        undefined,

                    salesperson:
                        salesperson
                            .trim() ||
                        undefined,

                    deliveryMethod:
                        deliveryMethod
                            .trim() ||
                        undefined,

                    notes:
                        notes.trim() ||
                        undefined,

                    paidAmount:
                        documentType ===
                            'PURCHASE'
                            ? calculations.paid
                            : 0,


                    refundAmount:
                        documentType ===
                            'RETURN'
                            ? Math.max(
                                Number(
                                    refundAmount,
                                ) || 0,
                                0,
                            )
                            : 0,

                    sourceType,

                    sourceId,

                    items:
                        items.map(
                            item => ({

                                productId:
                                    item.productId,

                                productName:
                                    item.productName,

                                hsn:
                                    item.hsn ||
                                    undefined,

                                unit:
                                    item.unit ||
                                    undefined,

                                quantity:
                                    Number(
                                        item.quantity,
                                    ) || 0,

                                unitPrice:
                                    Number(
                                        item.unitPrice,
                                    ) || 0,

                                gstRate:
                                    Number(
                                        item.gstRate,
                                    ) || 0,

                                discount:
                                    Number(
                                        item.discount,
                                    ) || 0,

                                sourceItemId:
                                    item.sourceItemId,
                            }),
                        ),
                });


                Alert.alert(
                    config.successTitle,
                    config.successMessage,
                    [
                        {
                            text: 'OK',

                            onPress: () =>
                                router.back(),
                        },
                    ],
                );

            } catch (error) {

                console.error(
                    'savePurchaseWorkflow error:',
                    error,
                );


                Alert.alert(
                    `Unable to save ${config.title}`,

                    error instanceof Error
                        ? error.message
                        : 'Something went wrong while saving the document.',
                );

            } finally {

                setSaving(false);
            }
        };


    /*        ======
       UI
           ====== */

    return (
        <FormScreen
            title={
                config.title
            }
            subtitle={
                config.subtitle
            }
            saving={
                saving
            }
        >

            <View
                style={
                    styles.infoBanner
                }
            >
                <Text
                    style={
                        styles.infoBannerText
                    }
                >
                    {documentType ===
                        'PURCHASE'
                        ? 'Only the Purchase Bill posts stock inward and records the vendor payable.'
                        : documentType ===
                            'RETURN'
                            ? 'Purchase Return reverses stock from an existing Purchase Bill.'
                            : 'This is a workflow document and does not post stock or vendor payable.'}
                </Text>
            </View>


            {sourceDocument && (

                <View
                    style={
                        styles.infoBanner
                    }
                >

                    <Text
                        style={
                            styles.infoBannerText
                        }
                    >
                        Converted from{' '}
                        {
                            sourceDocument
                                .document
                                .document_number
                        }
                        {' • '}
                        {
                            sourceDocument
                                .document
                                .vendor_name
                        }
                        . Vendor and item details have been carried forward automatically.
                    </Text>

                </View>

            )}

            {documentType ===
                'RETURN' && (

                    <View
                        style={
                            styles.formField
                        }
                    >

                        <Text
                            style={
                                styles.label
                            }
                        >
                            ORIGINAL PURCHASE BILL *
                        </Text>


                        <View
                            style={
                                styles.pickerField
                            }
                        >

                            <Picker
                                selectedValue={
                                    sourceDocument
                                        ?.document
                                        .id ||
                                    sourceId ||
                                    ''
                                }

                                onValueChange={(
                                    value: string,
                                ) => {

                                    if (!value) {
                                        return;
                                    }


                                    router.replace({
                                        pathname:
                                            '/purchases/add',

                                        params: {
                                            type:
                                                'RETURN',

                                            sourceType:
                                                'PURCHASE',

                                            sourceId:
                                                value,
                                        },
                                    });
                                }}

                                enabled={
                                    !saving
                                }
                            >

                                <Picker.Item
                                    label="Select original Purchase Bill"
                                    value=""
                                />


                                {returnPurchases.map(
                                    purchase => {

                                        const available =
                                            Math.max(
                                                purchase.total_amount -
                                                purchase.return_amount,
                                                0,
                                            );


                                        return (

                                            <Picker.Item
                                                key={
                                                    purchase.id
                                                }

                                                value={
                                                    purchase.id
                                                }

                                                label={
                                                    `${purchase.document_number} • ${purchase.vendor_name || 'Vendor'} • ${formatCurrency(available)} available`
                                                }
                                            />

                                        );
                                    },
                                )}

                            </Picker>

                        </View>


                        {returnPurchases.length ===
                            0 && (

                                <Text
                                    style={
                                        styles.helperText
                                    }
                                >
                                    No Purchase Bills with a remaining return value were found.
                                </Text>

                            )}

                    </View>

                )}

            {/* VENDOR */}

            <View
                style={
                    styles.formField
                }
            >

                <Text
                    style={
                        styles.label
                    }
                >
                    VENDOR *
                </Text>

                <View
                    style={
                        styles.pickerField
                    }
                >

                    <Picker
                        selectedValue={
                            vendorId
                        }
                        onValueChange={(
                            value: string,
                        ) =>
                            setVendorId(
                                value,
                            )
                        }
                        enabled={
                            !saving &&
                            !sourceDocument &&
                            documentType !==
                            'RETURN'
                        }
                    >

                        <Picker.Item
                            label="Select vendor"
                            value=""
                        />

                        {vendors.map(
                            vendor => (

                                <Picker.Item
                                    key={
                                        vendor.id
                                    }
                                    label={
                                        vendor.name
                                    }
                                    value={
                                        vendor.id
                                    }
                                />

                            ),
                        )}

                    </Picker>

                </View>


                {selectedVendor
                    ? (

                        <Text
                            style={
                                styles.helperText
                            }
                        >
                            {selectedVendor.gstin
                                ? `GSTIN ${selectedVendor.gstin} • `
                                : ''
                            }

                            {selectedVendor.state}
                        </Text>

                    )
                    : null}

            </View>


            {/* INVOICE */}

            {config.showInvoice && (

                <View
                    style={
                        styles.formField
                    }
                >

                    <Text
                        style={
                            styles.label
                        }
                    >
                        VENDOR INVOICE / REFERENCE
                    </Text>

                    <TextInput
                        value={
                            invoiceNumber
                        }
                        onChangeText={
                            setInvoiceNumber
                        }
                        placeholder="Optional vendor invoice number"
                        placeholderTextColor={
                            colors.mutedText
                        }
                        style={
                            styles.input
                        }
                        editable={
                            !saving
                        }
                    />

                </View>

            )}


            {/* DATES */}

            <View
                style={[
                    styles.formRow,

                    !isWide &&
                    styles.formColumn,
                ]}
            >

                <View
                    style={
                        styles.formRowField
                    }
                >

                    <Text
                        style={
                            styles.label
                        }
                    >
                        DOCUMENT DATE
                    </Text>

                    <TextInput
                        value={
                            purchaseDate
                        }
                        onChangeText={
                            setPurchaseDate
                        }
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={
                            colors.mutedText
                        }
                        style={
                            styles.input
                        }
                        editable={
                            !saving
                        }
                    />

                </View>


                <View
                    style={
                        styles.formRowField
                    }
                >

                    <Text
                        style={
                            styles.label
                        }
                    >
                        {documentType ===
                            'RFQ'
                            ? 'VALID / DUE DATE'
                            : 'DUE DATE'}
                    </Text>

                    <TextInput
                        value={
                            dueDate
                        }
                        onChangeText={
                            setDueDate
                        }
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={
                            colors.mutedText
                        }
                        style={
                            styles.input
                        }
                        editable={
                            !saving
                        }
                    />

                </View>

            </View>


            <SupplyPicker
                value={
                    supplyType
                }
                onChange={
                    setSupplyType
                }
                enabled={
                    !saving &&
                    documentType !==
                    'RETURN'
                }
            />


            <OptionalFields
                counterBranch={
                    counterBranch
                }
                setCounterBranch={
                    setCounterBranch
                }
                salesperson={
                    salesperson
                }
                setSalesperson={
                    setSalesperson
                }
                deliveryMethod={
                    deliveryMethod
                }
                setDeliveryMethod={
                    setDeliveryMethod
                }
                saving={
                    saving
                }
            />


            {/* ADD ITEM */}

            <View
                style={[
                    styles.lineCard,

                    isSmall &&
                    styles.lineCardSmall,
                ]}
            >

                <Text
                    style={
                        styles.lineCardTitle
                    }
                >
                    {documentType ===
                        'RETURN'
                        ? 'Items being returned'
                        : 'Add item or service'}
                </Text>

                {documentType !==
                    'RETURN' && (

                        <>

                            <ProductPicker
                                products={
                                    products
                                }
                                selectedProductId={
                                    selectedProductId
                                }
                                setSelectedProductId={
                                    setSelectedProductId
                                }
                                enabled={
                                    !saving
                                }
                            />


                            <View
                                style={[
                                    styles.formRow,
                                    styles.lineRow,

                                    !isWide &&
                                    styles.formColumn,
                                ]}
                            >

                                <NumberField
                                    label="QTY"
                                    value={
                                        lineQuantity
                                    }
                                    onChange={
                                        setLineQuantity
                                    }
                                />

                                <NumberField
                                    label="RATE"
                                    value={
                                        lineRate
                                    }
                                    onChange={
                                        setLineRate
                                    }
                                />

                                <NumberField
                                    label="GST %"
                                    value={
                                        lineGstRate
                                    }
                                    onChange={
                                        setLineGstRate
                                    }
                                />

                                <NumberField
                                    label="DISCOUNT"
                                    value={
                                        lineDiscount
                                    }
                                    onChange={
                                        setLineDiscount
                                    }
                                />

                            </View>


                            <Pressable
                                style={
                                    styles.addLineButton
                                }
                                onPress={
                                    handleAddLine
                                }
                                disabled={
                                    saving
                                }
                            >

                                <Text
                                    style={
                                        styles.addLineButtonText
                                    }
                                >
                                    Add line
                                </Text>

                            </Pressable>

                        </>

                    )}


                {items.length === 0
                    ? (

                        <Text
                            style={
                                styles.noLinesText
                            }
                        >
                            No lines added.
                        </Text>

                    )
                    : (

                        <View
                            style={
                                styles.selectedItems
                            }
                        >

                            {items.map(
                                (
                                    item,
                                    index,
                                ) => {

                                    const quantity =
                                        Number(
                                            item.quantity,
                                        ) || 0;

                                    const rate =
                                        Number(
                                            item.unitPrice,
                                        ) || 0;

                                    const gstRate =
                                        Number(
                                            item.gstRate,
                                        ) || 0;

                                    const discount =
                                        Number(
                                            item.discount,
                                        ) || 0;

                                    const taxable =
                                        Math.max(
                                            quantity *
                                            rate -
                                            discount,
                                            0,
                                        );

                                    const gst =
                                        taxable *
                                        gstRate /
                                        100;

                                    const total =
                                        taxable +
                                        gst;


                                    return (

                                        <View
                                            key={
                                                item.id
                                            }
                                            style={
                                                styles.itemCard
                                            }
                                        >

                                            <View
                                                style={
                                                    styles.itemTop
                                                }
                                            >

                                                <View
                                                    style={{
                                                        flex: 1,
                                                    }}
                                                >

                                                    <Text
                                                        style={
                                                            styles.itemName
                                                        }
                                                    >
                                                        {index + 1}.{' '}
                                                        {item.productName}
                                                    </Text>

                                                    <Text
                                                        style={
                                                            styles.itemMeta
                                                        }
                                                    >
                                                        HSN{' '}
                                                        {item.hsn ||
                                                            '—'}
                                                        {' • '}
                                                        {item.unit ||
                                                            'Unit'}
                                                        {' • GST '}
                                                        {item.gstRate}%
                                                    </Text>

                                                </View>


                                                <Pressable
                                                    style={
                                                        styles.removeButton
                                                    }
                                                    onPress={() =>
                                                        removeItem(
                                                            item.id,
                                                        )
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                >

                                                    <Text
                                                        style={
                                                            styles.removeButtonText
                                                        }
                                                    >
                                                        ×
                                                    </Text>

                                                </Pressable>

                                            </View>


                                            <View
                                                style={
                                                    styles.itemBottom
                                                }
                                            >

                                                <View
                                                    style={
                                                        styles.quantityEditor
                                                    }
                                                >

                                                    <Pressable
                                                        style={
                                                            styles.quantityButton
                                                        }
                                                        onPress={() =>
                                                            changeQuantity(
                                                                item.id,
                                                                -1,
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.quantityButtonText
                                                            }
                                                        >
                                                            −
                                                        </Text>
                                                    </Pressable>


                                                    <TextInput
                                                        value={
                                                            item.quantity
                                                        }
                                                        onChangeText={
                                                            value =>
                                                                updateItem(
                                                                    item.id,
                                                                    'quantity',
                                                                    value.replace(
                                                                        /[^0-9.]/g,
                                                                        '',
                                                                    ),
                                                                )
                                                        }
                                                        keyboardType="decimal-pad"
                                                        style={
                                                            styles.quantityInput
                                                        }
                                                    />


                                                    <Pressable
                                                        style={
                                                            styles.quantityButton
                                                        }
                                                        onPress={() =>
                                                            changeQuantity(
                                                                item.id,
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.quantityButtonText
                                                            }
                                                        >
                                                            +
                                                        </Text>
                                                    </Pressable>

                                                </View>


                                                <Text
                                                    style={
                                                        styles.itemTotal
                                                    }
                                                >
                                                    {formatCurrency(
                                                        total,
                                                    )}
                                                </Text>

                                            </View>

                                        </View>
                                    );
                                },
                            )}

                        </View>
                    )}

            </View>


            <TotalsCard
                supplyType={
                    supplyType
                }
                taxableValue={
                    calculations
                        .taxableValue
                }
                cgstAmount={
                    calculations
                        .cgstAmount
                }
                sgstAmount={
                    calculations
                        .sgstAmount
                }
                igstAmount={
                    calculations
                        .igstAmount
                }
                totalAmount={
                    calculations
                        .totalAmount
                }
                totalLabel="Total"
            />


            {/* PAYMENT */}
            {config.showPayment && (
                <View
                    style={
                        styles.formField
                    }
                >

                    <Text
                        style={
                            styles.label
                        }
                    >
                        PAID AMOUNT
                    </Text>

                    <TextInput
                        value={
                            paidAmount
                        }
                        onChangeText={
                            value =>
                                setPaidAmount(
                                    value.replace(
                                        /[^0-9.]/g,
                                        '',
                                    ),
                                )
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={
                            colors.mutedText
                        }
                        style={
                            styles.input
                        }
                        editable={
                            !saving
                        }
                    />


                    <Text
                        style={
                            styles.helperText
                        }
                    >
                        Status:{' '}
                        {calculations
                            .paymentStatus}
                        {' • Due '}
                        {formatCurrency(
                            calculations.due,
                        )}
                    </Text>

                </View>
            )}

            <NotesField
                value={
                    notes
                }
                onChange={
                    setNotes
                }
                placeholder={
                    documentType ===
                        'RFQ'
                        ? 'Quotation instructions or terms'
                        : documentType ===
                            'PO'
                            ? 'Purchase order instructions or terms'
                            : documentType ===
                                'GRN'
                                ? 'Goods receipt notes'
                                : documentType ===
                                    'RETURN'
                                    ? 'Return reason or notes'
                                    : 'Optional reference or terms'
                }
                enabled={
                    !saving
                }
            />
            {config.showRefund && (

                <View
                    style={
                        styles.formField
                    }
                >

                    <Text
                        style={
                            styles.label
                        }
                    >
                        REFUND AMOUNT
                    </Text>

                    <TextInput
                        value={
                            refundAmount
                        }
                        onChangeText={
                            value =>
                                setRefundAmount(
                                    value.replace(
                                        /[^0-9.]/g,
                                        '',
                                    ),
                                )
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={
                            colors.mutedText
                        }
                        style={
                            styles.input
                        }
                        editable={
                            !saving
                        }
                    />

                    <Text
                        style={
                            styles.helperText
                        }
                    >
                        Enter the amount actually refunded to the vendor payment source. Leave 0 when the return should only reduce the vendor payable.
                    </Text>

                </View>

            )}


            <FormActions
                saving={
                    saving
                }
                disabled={
                    items.length === 0
                }
                saveLabel={
                    config.saveLabel
                }
                onSave={
                    handleSave
                }
            />

        </FormScreen>
    );
}



/*         =
   SHARED FORM SCREEN
        = */

function FormScreen({
    title,
    subtitle,
    saving,
    children,
}: {
    title: string;
    subtitle: string;
    saving: boolean;
    children:
    React.ReactNode;
}) {

    const { width } =
        useWindowDimensions();

    const isSmall =
        width < 380;

    const isWide =
        width >= 760;


    return (

        <SafeAreaView
            style={
                styles.safeArea
            }
            edges={[
                'top',
                'bottom',
            ]}
        >

            <KeyboardAvoidingView
                style={
                    styles.keyboard
                }
                behavior={
                    Platform.OS ===
                        'ios'
                        ? 'padding'
                        : undefined
                }
            >

                <View
                    style={
                        styles.screen
                    }
                >

                    <View
                        style={[
                            styles.header,

                            isSmall &&
                            styles.headerSmall,
                        ]}
                    >

                        <Pressable
                            style={
                                styles.backButton
                            }
                            onPress={() =>
                                router.back()
                            }
                            disabled={
                                saving
                            }
                        >
                            <Text
                                style={
                                    styles.backButtonText
                                }
                            >
                                ‹
                            </Text>
                        </Pressable>


                        <View
                            style={
                                styles.headerText
                            }
                        >

                            <Text
                                style={[
                                    styles.title,

                                    isSmall &&
                                    styles.titleSmall,
                                ]}
                            >
                                {title}
                            </Text>

                            <Text
                                style={
                                    styles.subtitle
                                }
                            >
                                {subtitle}
                            </Text>

                        </View>

                    </View>


                    <ScrollView
                        contentContainerStyle={[
                            styles.content,

                            isWide &&
                            styles.contentWide,
                        ]}
                        showsVerticalScrollIndicator={
                            false
                        }
                        keyboardShouldPersistTaps="handled"
                    >

                        {children}

                    </ScrollView>

                </View>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}


/*         =
   SHARED CONTROLS
        = */

function SupplyPicker({
    value,
    onChange,
    enabled,
}: {
    value: SupplyType;
    onChange:
    (value: SupplyType) =>
        void;
    enabled: boolean;
}) {

    return (

        <View
            style={
                styles.formField
            }
        >

            <Text
                style={
                    styles.label
                }
            >
                SUPPLY
            </Text>

            <View
                style={
                    styles.pickerField
                }
            >

                <Picker
                    selectedValue={
                        value
                    }
                    onValueChange={(
                        next:
                            SupplyType,
                    ) =>
                        onChange(
                            next,
                        )
                    }
                    enabled={
                        enabled
                    }
                >

                    <Picker.Item
                        label="Within state (CGST + SGST)"
                        value="WITHIN_STATE"
                    />

                    <Picker.Item
                        label="Other State (IGST)"
                        value="OTHER_STATE"
                    />

                </Picker>

            </View>

        </View>
    );
}


function OptionalFields({
    counterBranch,
    setCounterBranch,
    salesperson,
    setSalesperson,
    deliveryMethod,
    setDeliveryMethod,
    saving,
}: {
    counterBranch: string;
    setCounterBranch:
    (value: string) =>
        void;

    salesperson: string;
    setSalesperson:
    (value: string) =>
        void;

    deliveryMethod: string;
    setDeliveryMethod:
    (value: string) =>
        void;

    saving: boolean;
}) {

    return (

        <>

            <View
                style={
                    styles.formField
                }
            >

                <Text
                    style={
                        styles.label
                    }
                >
                    COUNTER OR BRANCH
                </Text>

                <TextInput
                    value={
                        counterBranch
                    }
                    onChangeText={
                        setCounterBranch
                    }
                    placeholder="Counter or branch"
                    placeholderTextColor={
                        colors.mutedText
                    }
                    style={
                        styles.input
                    }
                    editable={
                        !saving
                    }
                />

            </View>


            <View
                style={
                    styles.formField
                }
            >

                <Text
                    style={
                        styles.label
                    }
                >
                    SALESPERSON
                </Text>

                <TextInput
                    value={
                        salesperson
                    }
                    onChangeText={
                        setSalesperson
                    }
                    placeholder="Salesperson"
                    placeholderTextColor={
                        colors.mutedText
                    }
                    style={
                        styles.input
                    }
                    editable={
                        !saving
                    }
                />

            </View>


            <View
                style={
                    styles.formField
                }
            >

                <Text
                    style={
                        styles.label
                    }
                >
                    DELIVERY OR PICKUP
                </Text>

                <TextInput
                    value={
                        deliveryMethod
                    }
                    onChangeText={
                        setDeliveryMethod
                    }
                    placeholder="Delivery or pickup"
                    placeholderTextColor={
                        colors.mutedText
                    }
                    style={
                        styles.input
                    }
                    editable={
                        !saving
                    }
                />

            </View>

        </>
    );
}


function ProductPicker({
    products,
    selectedProductId,
    setSelectedProductId,
    enabled,
}: {
    products:
    ProductOption[];

    selectedProductId:
    string;

    setSelectedProductId:
    (value: string) =>
        void;

    enabled:
    boolean;
}) {

    return (

        <>

            <Text
                style={
                    styles.label
                }
            >
                ITEM
            </Text>

            <View
                style={
                    styles.pickerField
                }
            >

                <Picker
                    selectedValue={
                        selectedProductId
                    }
                    onValueChange={(
                        value: string,
                    ) =>
                        setSelectedProductId(
                            value,
                        )
                    }
                    enabled={
                        enabled
                    }
                >

                    <Picker.Item
                        label="Select product"
                        value=""
                    />

                    {products.map(
                        product => (

                            <Picker.Item
                                key={
                                    product.id
                                }
                                label={
                                    `${product.name} • ${formatCurrency(
                                        product
                                            .purchasePrice,
                                    )}`
                                }
                                value={
                                    product.id
                                }
                            />

                        ),
                    )}

                </Picker>

            </View>

        </>
    );
}


function NumberField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange:
    (value: string) =>
        void;
}) {

    return (

        <View
            style={
                styles.formRowField
            }
        >

            <Text
                style={
                    styles.label
                }
            >
                {label}
            </Text>

            <TextInput
                value={
                    value
                }
                onChangeText={
                    next =>
                        onChange(
                            next.replace(
                                /[^0-9.]/g,
                                '',
                            ),
                        )
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={
                    colors.mutedText
                }
                style={
                    styles.input
                }
            />

        </View>
    );
}


function TotalsCard({
    supplyType,
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    totalLabel,
}: {
    supplyType:
    SupplyType;

    taxableValue:
    number;

    cgstAmount:
    number;

    sgstAmount:
    number;

    igstAmount:
    number;

    totalAmount:
    number;

    totalLabel:
    string;
}) {

    return (

        <View
            style={
                styles.totalCard
            }
        >

            <View
                style={
                    styles.totalRow
                }
            >

                <Text
                    style={
                        styles.totalRowLabel
                    }
                >
                    Taxable value
                </Text>

                <Text
                    style={
                        styles.totalRowValue
                    }
                >
                    {formatCurrency(
                        taxableValue,
                    )}
                </Text>

            </View>


            {supplyType ===
                'WITHIN_STATE'
                ? (

                    <>

                        <View
                            style={
                                styles.totalRow
                            }
                        >

                            <Text
                                style={
                                    styles.totalRowLabel
                                }
                            >
                                CGST
                            </Text>

                            <Text
                                style={
                                    styles.totalRowValue
                                }
                            >
                                {formatCurrency(
                                    cgstAmount,
                                )}
                            </Text>

                        </View>


                        <View
                            style={
                                styles.totalRow
                            }
                        >

                            <Text
                                style={
                                    styles.totalRowLabel
                                }
                            >
                                SGST
                            </Text>

                            <Text
                                style={
                                    styles.totalRowValue
                                }
                            >
                                {formatCurrency(
                                    sgstAmount,
                                )}
                            </Text>

                        </View>

                    </>

                )
                : (

                    <View
                        style={
                            styles.totalRow
                        }
                    >

                        <Text
                            style={
                                styles.totalRowLabel
                            }
                        >
                            IGST
                        </Text>

                        <Text
                            style={
                                styles.totalRowValue
                            }
                        >
                            {formatCurrency(
                                igstAmount,
                            )}
                        </Text>

                    </View>
                )}


            <View
                style={
                    styles.totalDivider
                }
            />


            <View
                style={
                    styles.totalRow
                }
            >

                <Text
                    style={
                        styles.grandTotalLabel
                    }
                >
                    {totalLabel}
                </Text>

                <Text
                    style={
                        styles.grandTotalValue
                    }
                >
                    {formatCurrency(
                        totalAmount,
                    )}
                </Text>

            </View>

        </View>
    );
}


function NotesField({
    value,
    onChange,
    placeholder,
    enabled,
}: {
    value: string;
    onChange:
    (value: string) =>
        void;
    placeholder:
    string;
    enabled:
    boolean;
}) {

    return (

        <View
            style={
                styles.formField
            }
        >

            <Text
                style={
                    styles.label
                }
            >
                NOTES
            </Text>

            <TextInput
                value={
                    value
                }
                onChangeText={
                    onChange
                }
                placeholder={
                    placeholder
                }
                placeholderTextColor={
                    colors.mutedText
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                    styles.input,
                    styles.notesInput,
                ]}
                editable={
                    enabled
                }
            />

        </View>
    );
}


function FormActions({
    saving,
    disabled,
    saveLabel,
    onSave,
}: {
    saving: boolean;
    disabled: boolean;
    saveLabel: string;
    onSave:
    () => void;
}) {

    return (

        <View
            style={
                styles.formActions
            }
        >

            <Pressable
                style={[
                    styles.cancelButton,

                    saving &&
                    styles.disabledButton,
                ]}
                onPress={() =>
                    router.back()
                }
                disabled={
                    saving
                }
            >

                <Text
                    style={
                        styles.cancelButtonText
                    }
                >
                    Cancel
                </Text>

            </Pressable>


            <Pressable
                style={[
                    styles.saveButton,

                    (
                        saving ||
                        disabled
                    ) &&
                    styles.disabledButton,
                ]}
                onPress={
                    onSave
                }
                disabled={
                    saving ||
                    disabled
                }
            >

                <Text
                    style={
                        styles.saveButtonText
                    }
                >
                    {saving
                        ? 'Saving...'
                        : saveLabel}
                </Text>

            </Pressable>

        </View>
    );
}


/*         =
   MAIN ADD SCREEN
        = */

export default function PurchaseAddScreen() {

    const params =
        useLocalSearchParams<{
            type?:
            string |
            string[];

            sourceType?:
            string |
            string[];

            sourceId?:
            string |
            string[];
        }>();


    /*        ====
       ROUTE PARAMS
           ==== */

    const rawType =
        Array.isArray(
            params.type,
        )
            ? params.type[0]
            : params.type;


    const rawSourceType =
        Array.isArray(
            params.sourceType,
        )
            ? params.sourceType[0]
            : params.sourceType;


    const rawSourceId =
        Array.isArray(
            params.sourceId,
        )
            ? params.sourceId[0]
            : params.sourceId;


    const VALID_DOCUMENT_TYPES:
        DocumentType[] = [
            'REQUEST',
            'RFQ',
            'PO',
            'GRN',
            'PURCHASE',
            'RETURN',
        ];


    const documentType:
        DocumentType =
        VALID_DOCUMENT_TYPES.includes(
            rawType as DocumentType,
        )
            ? (
                rawType as
                DocumentType
            )
            : 'PURCHASE';


    const sourceType:
        DocumentType |
        undefined =
        VALID_DOCUMENT_TYPES.includes(
            rawSourceType as
            DocumentType,
        )
            ? (
                rawSourceType as
                DocumentType
            )
            : undefined;


    const sourceId =
        rawSourceId?.trim() ||
        undefined;


    /*        ====
       FORM DATA
           ==== */

    const [
        vendors,
        setVendors,
    ] =
        useState<VendorOption[]>(
            [],
        );


    const [
        products,
        setProducts,
    ] =
        useState<ProductOption[]>(
            [],
        );

    const [
        sourceDocument,
        setSourceDocument,
    ] =
        useState<
            WorkflowDetail | null
        >(
            null,
        );

    const [
        returnPurchases,
        setReturnPurchases,
    ] =
        useState<
            WorkflowDocument[]
        >(
            [],
        );


    /*        ====
       LOAD FORM DATA
           ==== */

    const loadFormData =
        useCallback(
            async () => {

                try {

                    /*
                     * sourceType and sourceId must either
                     * both exist or both be absent.
                     */
                    if (
                        Boolean(
                            sourceType,
                        ) !==
                        Boolean(
                            sourceId,
                        )
                    ) {

                        throw new Error(
                            'The source document information is incomplete.',
                        );
                    }


                    const [
                        vendorData,
                        productData,
                        loadedSource,
                        workflowData,
                    ] =
                        await Promise.all([

                            loadVendors(),

                            loadProducts(),

                            sourceType &&
                                sourceId
                                ? loadPurchaseWorkflowDocument(
                                    sourceType,
                                    sourceId,
                                )
                                : Promise.resolve(
                                    null,
                                ),

                            documentType ===
                                'RETURN'
                                ? loadPurchaseWorkflow()
                                : Promise.resolve(
                                    [],
                                ),

                        ]);
                    if (
                        documentType ===
                        'RETURN' &&
                        sourceType &&
                        sourceType !==
                        'PURCHASE'
                    ) {

                        throw new Error(
                            'A Purchase Return must use a Purchase Bill as its original document.',
                        );
                    }


                    /*
                     * If conversion was requested,
                     * the original document must exist.
                     */
                    if (
                        sourceType &&
                        sourceId &&
                        !loadedSource
                    ) {

                        throw new Error(
                            'The source purchase document could not be found.',
                        );
                    }


                    /*      ==
                       SOURCE DOCUMENT
                         == */

                    setSourceDocument(
                        loadedSource,
                    );

                    setReturnPurchases(

                        workflowData
                            .filter(
                                document =>
                                    document
                                        .document_type ===
                                    'PURCHASE',
                            )
                            .filter(
                                document =>

                                    (
                                        document
                                            .total_amount -
                                        document
                                            .return_amount
                                    ) >
                                    0.005,
                            )

                    );


                    /*      ==
                       VENDORS
                         == */

                    setVendors(
                        vendorData.map(
                            vendor => ({

                                id:
                                    vendor.id,

                                name:
                                    vendor.name,

                                state:
                                    vendor.state,

                                gstin:
                                    vendor.gstin,

                            }),
                        ),
                    );


                    /*      ==
                       PRODUCTS
                         == */

                    setProducts(
                        productData.map(
                            product => ({

                                id:
                                    product.id,

                                name:
                                    product.name,

                                hsn:
                                    product.hsn,

                                unit:
                                    product.unit,

                                purchasePrice:
                                    product
                                        .purchasePrice,

                                gstRate:
                                    product
                                        .gstRate,

                            }),
                        ),
                    );


                } catch (error) {

                    console.error(
                        'Unable to load purchase form:',
                        error,
                    );


                    Alert.alert(
                        'Unable to load form',

                        error instanceof Error
                            ? error.message
                            : 'Something went wrong while loading the purchase form.',
                        [
                            {
                                text:
                                    'Go back',

                                onPress: () =>
                                    router.back(),
                            },
                        ],
                    );

                }

            },
            [
                documentType,
                sourceType,
                sourceId,
            ],
        );


    /*        ====
       INITIAL LOAD
           ==== */

    useEffect(() => {

        loadFormData();

    }, [
        loadFormData,
    ]);


    /*        ====
       SCREEN
           ==== */

    return (

        <WorkflowForm
            vendors={
                vendors
            }

            products={
                products
            }

            documentType={
                documentType
            }

            sourceType={
                sourceType
            }

            sourceId={
                sourceId
            }

            sourceDocument={
                sourceDocument
            }

            returnPurchases={
                returnPurchases
            }
        />

    );
}


/*         =
   STYLES
        = */

const styles =
    StyleSheet.create({

        safeArea: {
            flex: 1,

            backgroundColor:
                colors.background,
        },


        keyboard: {
            flex: 1,
        },


        screen: {
            flex: 1,

            backgroundColor:
                colors.background,
        },


        header: {
            minHeight: 72,

            paddingHorizontal: 16,

            paddingVertical: 12,

            backgroundColor:
                colors.primary,

            flexDirection:
                'row',

            alignItems:
                'center',

            gap: 12,
        },


        headerSmall: {
            paddingHorizontal: 10,
        },


        backButton: {
            width: 42,

            height: 42,

            borderRadius: 13,

            backgroundColor:
                'rgba(255,255,255,0.14)',

            alignItems:
                'center',

            justifyContent:
                'center',
        },


        backButtonText: {
            color: '#FFFFFF',

            fontSize: 32,

            lineHeight: 34,

            fontWeight: '400',
        },


        headerText: {
            flex: 1,

            minWidth: 0,
        },


        title: {
            color: '#FFFFFF',

            fontSize: 20,

            fontWeight: '800',
        },


        titleSmall: {
            fontSize: 18,
        },


        subtitle: {
            color: '#DCE8ED',

            fontSize: 11,

            marginTop: 3,
        },


        content: {
            width: '100%',

            padding: 14,

            paddingBottom: 60,

            alignSelf: 'center',
        },


        contentWide: {
            maxWidth: 900,

            paddingHorizontal: 24,

            paddingTop: 20,
        },


        infoBanner: {
            backgroundColor:
                '#EAF6F4',

            borderWidth: 1,

            borderColor:
                '#B9DDD8',

            borderRadius: 14,

            padding: 12,

            marginBottom: 14,
        },


        infoBannerText: {
            color:
                colors.text,

            fontSize: 11,

            lineHeight: 17,

            fontWeight: '600',
        },


        formField: {
            width: '100%',

            marginBottom: 14,
        },


        label: {
            color:
                colors.text,

            fontSize: 10,

            fontWeight: '800',

            marginBottom: 6,
        },


        input: {
            width: '100%',

            minHeight: 48,

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 13,

            backgroundColor:
                colors.card,

            color:
                colors.text,

            paddingHorizontal: 12,

            fontSize: 13,
        },


        pickerField: {
            width: '100%',

            minHeight: 48,

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 13,

            backgroundColor:
                colors.card,

            overflow: 'hidden',

            justifyContent:
                'center',
        },


        helperText: {
            color:
                colors.mutedText,

            fontSize: 10,

            marginTop: 6,

            lineHeight: 15,
        },


        formRow: {
            width: '100%',

            flexDirection:
                'row',

            gap: 12,

            marginBottom: 14,
        },


        formColumn: {
            flexDirection:
                'column',

            gap: 0,
        },


        formRowField: {
            flex: 1,

            minWidth: 0,

            marginBottom: 10,
        },


        lineRow: {
            marginTop: 12,

            marginBottom: 4,
        },


        lineCard: {
            width: '100%',

            backgroundColor:
                colors.card,

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 18,

            padding: 14,

            marginBottom: 15,
        },


        lineCardSmall: {
            padding: 11,
        },


        lineCardTitle: {
            color:
                colors.text,

            fontSize: 15,

            fontWeight: '800',

            marginBottom: 13,
        },


        addLineButton: {
            minHeight: 46,

            backgroundColor:
                '#E6F5F2',

            borderRadius: 13,

            alignItems:
                'center',

            justifyContent:
                'center',

            marginTop: 4,
        },


        addLineButtonText: {
            color:
                colors.teal,

            fontSize: 12,

            fontWeight: '900',
        },


        noLinesText: {
            color:
                colors.mutedText,

            fontSize: 10,

            textAlign: 'center',

            paddingVertical: 18,
        },


        selectedItems: {
            width: '100%',

            gap: 8,

            marginTop: 12,
        },


        itemCard: {
            width: '100%',

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 14,

            padding: 11,

            backgroundColor:
                colors.background,
        },


        itemTop: {
            width: '100%',

            flexDirection:
                'row',

            alignItems:
                'flex-start',

            gap: 8,
        },


        itemName: {
            color:
                colors.text,

            fontSize: 12,

            fontWeight: '800',
        },


        itemMeta: {
            color:
                colors.mutedText,

            fontSize: 9,

            lineHeight: 14,

            marginTop: 4,
        },


        removeButton: {
            width: 32,

            height: 32,

            borderRadius: 10,

            backgroundColor:
                '#FCE8E8',

            alignItems:
                'center',

            justifyContent:
                'center',
        },


        removeButtonText: {
            color:
                '#B73B3B',

            fontSize: 19,

            fontWeight: '800',
        },


        itemBottom: {
            width: '100%',

            marginTop: 11,

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',

            gap: 12,
        },


        quantityEditor: {
            flexDirection:
                'row',

            alignItems:
                'center',

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 12,

            overflow: 'hidden',

            backgroundColor:
                colors.card,
        },


        quantityButton: {
            width: 38,

            height: 40,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                '#EFF6F5',
        },


        quantityButtonText: {
            color:
                colors.teal,

            fontSize: 18,

            fontWeight: '800',
        },


        quantityInput: {
            width: 55,

            height: 40,

            color:
                colors.text,

            textAlign: 'center',

            fontSize: 12,

            fontWeight: '700',
        },


        itemTotal: {
            color:
                colors.text,

            fontSize: 13,

            fontWeight: '900',
        },


        totalCard: {
            width: '100%',

            backgroundColor:
                colors.card,

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 18,

            padding: 14,

            marginBottom: 15,
        },


        totalRow: {
            width: '100%',

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',

            paddingVertical: 7,

            gap: 12,
        },


        totalRowLabel: {
            color:
                colors.mutedText,

            fontSize: 11,

            fontWeight: '600',
        },


        totalRowValue: {
            color:
                colors.text,

            fontSize: 12,

            fontWeight: '800',
        },


        totalDivider: {
            height: 1,

            width: '100%',

            backgroundColor:
                colors.border,

            marginVertical: 7,
        },


        grandTotalLabel: {
            color:
                colors.text,

            fontSize: 14,

            fontWeight: '900',
        },


        grandTotalValue: {
            color:
                colors.teal,

            fontSize: 18,

            fontWeight: '900',
        },


        notesInput: {
            minHeight: 105,

            paddingTop: 12,
        },


        formActions: {
            width: '100%',

            flexDirection:
                'row',

            gap: 10,

            marginTop: 5,

            marginBottom: 20,
        },


        cancelButton: {
            flex: 1,

            minHeight: 50,

            borderWidth: 1,

            borderColor:
                colors.border,

            borderRadius: 14,

            backgroundColor:
                colors.card,

            alignItems:
                'center',

            justifyContent:
                'center',
        },


        cancelButtonText: {
            color:
                colors.text,

            fontSize: 12,

            fontWeight: '800',
        },


        saveButton: {
            flex: 1.5,

            minHeight: 50,

            borderRadius: 14,

            backgroundColor:
                colors.teal,

            alignItems:
                'center',

            justifyContent:
                'center',

            paddingHorizontal: 10,
        },


        saveButtonText: {
            color: '#FFFFFF',

            fontSize: 12,

            fontWeight: '900',

            textAlign: 'center',
        },


        disabledButton: {
            opacity: 0.45,
        },

    });

    