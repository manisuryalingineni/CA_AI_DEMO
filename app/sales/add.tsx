import React, {

  useCallback,

  useEffect,

  useMemo,

  useRef,

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

  Stack,

  router,

  useLocalSearchParams,

} from 'expo-router';



import { Picker } from '@react-native-picker/picker';



import {

  SafeAreaView,

  useSafeAreaInsets,

} from 'react-native-safe-area-context';



import { getBusiness } from '../../src/repositories/businessRepository';

import { loadCustomers } from '../../src/services/customerService';

import { loadProducts } from '../../src/services/productService';



import {

  calculateSalesReturnLines,

  calculateSalesWorkflowLines,

  loadSalesWorkflow,

  loadSalesWorkflowDocument,

  saveSalesWorkflow,

} from '../../src/services/saleService';



import {

  SALES_DOCUMENT_LABELS,

  isSalesDocumentType,

} from '../../src/types/sale';



import type {

  SalesCalculatedTotals,

  SalesCustomField,

  SalesDocumentType,

  SalesReturnLineInput,

  SalesSupplyType,

  SalesWorkflowDetail,

  SalesWorkflowDocument,

  SalesWorkflowLineInput,

} from '../../src/types/sale';



/* =========================================================

   REFERENCE APK BUSINESS-SPECIFIC DOCUMENT FIELDS

========================================================= */



const BUSINESS_DOC_FIELDS: Record<string, [string, string, string]> = {

  RETAIL: [

    'Counter or branch',

    'Salesperson',

    'Delivery or pickup',

  ],

  WHOLESALE: [

    'Dealer price list',

    'Dispatch route',

    'Transport reference',

  ],

  SERVICE: [

    'Estimate or job number',

    'Technician or consultant',

    'Service period',

  ],

  MANUFACTURING: [

    'Production order',

    'Batch or lot',

    'Warehouse',

  ],

  RESTAURANT: [

    'Table or order number',

    'Dine-in / takeaway / delivery',

    'KOT reference',

  ],

  CONSTRUCTION: [

    'Project and site',

    'RA bill number',

    'Retention percentage',

  ],

  TRANSPORT: [

    'Vehicle and trip number',

    'From and destination',

    'POD / LR number',

  ],

  ECOMMERCE: [

    'Marketplace',

    'Marketplace order ID',

    'Settlement reference',

  ],

  PROFESSIONAL: [

    'Engagement name',

    'Billable hours or retainer period',

    'TDS section',

  ],

  HEALTHCARE: [

    'Patient or appointment ID',

    'Doctor / department',

    'Insurance or cash',

  ],

  EDUCATION: [

    'Course and batch',

    'Student ID',

    'Fee period',

  ],

  HOTEL: [

    'Booking and room number',

    'Check-in / check-out',

    'Guest count',

  ],

  OTHER: [

    'Department / job',

    'Business reference',

    'Delivery terms',

  ],

};



/* =========================================================

   LOCAL TYPES

========================================================= */



type CustomerOption = {

  id: string;

  name: string;

  gstin?: string;

  state?: string;

};



type ProductOption = {

  id: string;

  name: string;

  hsn?: string;

  unit: string;

  salePrice: number;

  gstRate: number;


};



type DraftLine = {

  key: string;

  productId: string;

  productName: string;

  hsn?: string;

  unit: string;

  quantity: string;

  unitPrice: string;

  gstRate: string;

  sourceItemId?: string;

  maxQuantity?: number;

};



type BusinessIdentity = {

  id: string;

  name: string;

  businessType: string;

};



/* =========================================================

   HELPERS

========================================================= */



const C = {

  navy: '#08233D',

  teal: '#0B9489',

  tealDark: '#08766F',

  bg: '#F2F6F8',

  card: '#FFFFFF',

  ink: '#122A3B',

  muted: '#6E7E89',

  border: '#D6E0E5',

  notice: '#EAF6FF',

  noticeBorder: '#BBDCEE',

  noticeText: '#245B78',

  softTeal: '#E4F5F2',

  danger: '#B33B34',

  warning: '#A26700',

};



function todayIso(): string {

  return new Date().toISOString().slice(0, 10);

}



function firstParam(value: string | string[] | undefined): string {

  return Array.isArray(value) ? value[0] ?? '' : value ?? '';

}



function money(value: number): string {

  return `₹${Number(value || 0).toLocaleString('en-IN', {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  })}`;

}



function numberText(value: number): string {

  if (!Number.isFinite(value)) return '0';

  return String(value);

}



function numeric(value: string): number {

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;

}



function decimalInput(value: string): string {

  const cleaned = value.replace(/[^0-9.]/g, '');

  const [head, ...rest] = cleaned.split('.');

  return rest.length ? `${head}.${rest.join('')}` : head;

}



function record(value: unknown): Record<string, unknown> {

  return value && typeof value === 'object'

    ? value as Record<string, unknown>

    : {};

}



function stringValue(value: unknown): string {

  return typeof value === 'string' ? value : '';

}



function numberValue(value: unknown): number {

  return typeof value === 'number' && Number.isFinite(value) ? value : 0;

}



function normalizeCustomer(value: unknown): CustomerOption | null {

  const row = record(value);

  const id = stringValue(row.id).trim();

  const name = stringValue(row.name).trim();

  if (!id || !name) return null;

  return {

    id,

    name,

    gstin: stringValue(row.gstin).trim() || undefined,

    state: stringValue(row.state).trim() || undefined,

  };

}



function normalizeProduct(value: unknown): ProductOption | null {

  const row = record(value);

  const id = stringValue(row.id).trim();

  const name = stringValue(row.name).trim();

  if (!id || !name) return null;





  return {

    id,

    name,

    hsn: stringValue(row.hsn).trim() || undefined,

    unit: stringValue(row.unit).trim() || 'Unit',

    salePrice: numberValue(row.salePrice ?? row.sale_price),

    gstRate: numberValue(row.gstRate ?? row.gst_rate),


  };

}



function businessIdentity(value: unknown): BusinessIdentity | null {

  const row = record(value);

  const id = stringValue(row.id).trim();

  if (!id) return null;

  return {

    id,

    name: stringValue(row.name).trim() || 'Business',

    businessType:

      stringValue(row.business_type).trim() ||

      stringValue(row.businessType).trim() ||

      'OTHER',

  };

}



function errorText(error: unknown): string {

  return error instanceof Error ? error.message : 'Please try again.';

}



function lineKey(prefix = 'line'): string {

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

}



function titleFor(type: SalesDocumentType): string {

  return SALES_DOCUMENT_LABELS[type];

}



function subtitleFor(type: SalesDocumentType): string {

  if (type === 'SALES_RETURN') return 'Customer return and outward sales reversal';

  return 'Customer and outward sales flow';

}



function saveLabel(type: SalesDocumentType): string {

  return `Save ${SALES_DOCUMENT_LABELS[type]}`;

}



function fieldsForBusiness(type: string): [string, string, string] {

  const normalized = type.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return BUSINESS_DOC_FIELDS[normalized] ?? BUSINESS_DOC_FIELDS.OTHER;

}



/* =========================================================

   MAIN SCREEN

========================================================= */



export default function SalesAddScreen() {

  const params = useLocalSearchParams<{

    type?: string | string[];

    sourceType?: string | string[];

    sourceId?: string | string[];

  }>();



  const rawType = firstParam(params.type);

  const documentType: SalesDocumentType =

    isSalesDocumentType(rawType) ? rawType : 'QUOTATION';



  const rawSourceType = firstParam(params.sourceType);

  const routeSourceType: SalesDocumentType | null =

    isSalesDocumentType(rawSourceType) ? rawSourceType : null;

  const routeSourceId = firstParam(params.sourceId).trim();



  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();

  const wide = width >= 760;



  const [business, setBusiness] = useState<BusinessIdentity | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const [products, setProducts] = useState<ProductOption[]>([]);

  const [workflow, setWorkflow] = useState<SalesWorkflowDocument[]>([]);

  const [sourceDetail, setSourceDetail] = useState<SalesWorkflowDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);



  const [customerId, setCustomerId] = useState('');

  const [documentDate, setDocumentDate] = useState(todayIso());

  const [dueDate, setDueDate] = useState(todayIso());

  const [supplyType, setSupplyType] = useState<SalesSupplyType>('WITHIN_STATE');

  const [customValues, setCustomValues] = useState(['', '', '']);

  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<DraftLine[]>([]);



  const [selectedProductId, setSelectedProductId] = useState('');

  const [lineQty, setLineQty] = useState('1');

  const [lineRate, setLineRate] = useState('0');

  const [lineGst, setLineGst] = useState('0');




  const [selectedReturnInvoiceId, setSelectedReturnInvoiceId] = useState('');

  const loadToken = useRef(0);



  const fieldLabels = useMemo(

    () => fieldsForBusiness(business?.businessType || 'OTHER'),

    [business?.businessType],

  );



  const invoices = useMemo(

    () => workflow.filter(item => item.documentType === 'SALES_INVOICE'),

    [workflow],

  );



  const sourceLocked = Boolean(sourceDetail);



  const loadSource = useCallback(async (

    sourceType: SalesDocumentType,

    sourceId: string,

  ) => {

    const token = ++loadToken.current;

    const detail = await loadSalesWorkflowDocument(sourceType, sourceId);

    if (token !== loadToken.current) return;

    if (!detail) throw new Error('The source sales document could not be found.');



    if (documentType === 'SALES_RETURN' && sourceType !== 'SALES_INVOICE') {

      throw new Error('A sales return must be created from a Tax invoice.');

    }



    setSourceDetail(detail);

    setCustomerId(detail.document.customerId ?? '');

    setSupplyType(detail.document.supplyType ?? 'WITHIN_STATE');

    setNotes(detail.document.notes ?? '');



    const sourceFields = new Map(

      detail.document.customFields.map(field => [field.key, field.value]),

    );

    setCustomValues([

      sourceFields.get('extra0') ?? '',

      sourceFields.get('extra1') ?? '',

      sourceFields.get('extra2') ?? '',

    ]);



    if (documentType === 'SALES_RETURN') {

      setLines(

        detail.items

          .filter(item => item.returnableQuantity > 0)

          .map(item => ({

            key: lineKey('return'),

            productId: item.productId,

            productName: item.productName,

            hsn: item.hsn,

            unit: item.unit || 'Unit',

            quantity: '0',

            unitPrice: numberText(item.unitPrice),

            gstRate: numberText(item.gstRate),

            sourceItemId: item.id,

            maxQuantity: item.returnableQuantity,

          })),

      );

    } else {

      setLines(

        detail.items.map(item => ({

          key: lineKey('copy'),

          productId: item.productId,

          productName: item.productName,

          hsn: item.hsn,

          unit: item.unit || 'Unit',

          quantity: numberText(item.quantity),

          unitPrice: numberText(item.unitPrice),

          gstRate: numberText(item.gstRate),

          sourceItemId: item.id,

          maxQuantity: item.quantity,

        })),

      );

    }

  }, [documentType]);



  const loadForm = useCallback(async () => {

    setLoading(true);

    setLoadError(null);

    try {

      const [businessRaw, customerRaw, productRaw, workflowRows] = await Promise.all([

        getBusiness(),

        loadCustomers(),

        loadProducts(),

        loadSalesWorkflow(),

      ]);



      const activeBusiness = businessIdentity(businessRaw);

      if (!activeBusiness) {

        throw new Error('Business setup is required before creating a sales document.');

      }



      const customerOptions = (customerRaw as unknown[])

        .map(normalizeCustomer)

        .filter((value): value is CustomerOption => Boolean(value));



      const productOptions = (productRaw as unknown[])

        .map(normalizeProduct)

        .filter((value): value is ProductOption => Boolean(value));



      setBusiness(activeBusiness);

      setCustomers(customerOptions);

      setProducts(productOptions);

      setWorkflow(workflowRows);



      if (productOptions.length) {

        const first = productOptions[0];

        setSelectedProductId(first.id);

        setLineRate(numberText(first.salePrice));

        setLineGst(numberText(first.gstRate));


      }



      if (routeSourceType && routeSourceId) {

        await loadSource(routeSourceType, routeSourceId);

      } else if (documentType === 'SALES_RETURN') {

        const firstInvoice = workflowRows.find(

          item => item.documentType === 'SALES_INVOICE' && item.totalAmount > item.returnAmount,

        );

        if (firstInvoice) {

          setSelectedReturnInvoiceId(firstInvoice.id);

          await loadSource('SALES_INVOICE', firstInvoice.id);

        }

      }

    } catch (error) {

      setLoadError(errorText(error));

    } finally {

      setLoading(false);

    }

  }, [documentType, loadSource, routeSourceId, routeSourceType]);



  useEffect(() => {

    void loadForm();

    return () => {

      loadToken.current += 1;

    };

  }, [loadForm]);



  const selectedProduct = useMemo(

    () => products.find(item => item.id === selectedProductId) ?? null,

    [products, selectedProductId],

  );



  function selectProduct(productId: string) {

    setSelectedProductId(productId);

    const product = products.find(item => item.id === productId);

    if (!product) return;

    setLineRate(numberText(product.salePrice));

    setLineGst(numberText(product.gstRate));


  }



  async function chooseReturnInvoice(invoiceId: string) {

    setSelectedReturnInvoiceId(invoiceId);

    setSourceDetail(null);

    setLines([]);

    if (!invoiceId) return;

    try {

      setLoading(true);

      await loadSource('SALES_INVOICE', invoiceId);

    } catch (error) {

      Alert.alert('Unable to load invoice', errorText(error));

    } finally {

      setLoading(false);

    }

  }



  function updateCustom(index: number, value: string) {

    setCustomValues(current => current.map((item, i) => i === index ? value : item));

  }



  function updateLine(key: string, field: keyof DraftLine, value: string) {

    setLines(current => current.map(line => line.key === key ? { ...line, [field]: value } : line));

  }



  function removeLine(key: string) {

    setLines(current => current.filter(line => line.key !== key));

  }



  async function addLine() {

    if (!selectedProduct) {

      Alert.alert('Select item', 'Select an item or service first.');

      return;

    }



    const quantity = numeric(lineQty);

    const rate = numeric(lineRate);

    const gst = numeric(lineGst);



    if (quantity <= 0) {

      Alert.alert('Invalid quantity', 'Quantity must be greater than zero.');

      return;

    }

    if (rate < 0 || gst < 0 || gst > 100) {

      Alert.alert('Check line', 'Rate or GST value is invalid.');

      return;

    }





    setLines(current => [

      ...current,

      {

        key: lineKey(),

        productId: selectedProduct.id,

        productName: selectedProduct.name,

        hsn: selectedProduct.hsn,

        unit: selectedProduct.unit,

        quantity: numberText(quantity),

        unitPrice: numberText(rate),

        gstRate: numberText(gst),


      },

    ]);



    setLineQty('1');


  }



  const calculations = useMemo<SalesCalculatedTotals>(() => {

    try {

      if (documentType === 'SALES_RETURN') {

        const original = sourceDetail?.items ?? [];

        const requested: SalesReturnLineInput[] = lines

          .filter(line => Boolean(line.sourceItemId) && numeric(line.quantity) > 0)

          .map(line => ({

            sourceItemId: line.sourceItemId as string,

            quantity: numeric(line.quantity),

          }));

        return calculateSalesReturnLines(original, requested, supplyType);

      }



      const items: SalesWorkflowLineInput[] = lines.map(line => ({

        productId: line.productId,

        quantity: numeric(line.quantity),

        unitPrice: numeric(line.unitPrice),

        gstRate: numeric(line.gstRate),

        sourceItemId: line.sourceItemId,

      }));

      return calculateSalesWorkflowLines(items, supplyType);

    } catch {

      return {

        items: [],

        subtotal: 0,

        discount: 0,

        gstAmount: 0,

        cgstAmount: 0,

        sgstAmount: 0,

        igstAmount: 0,

        totalAmount: 0,

      };

    }

  }, [documentType, lines, sourceDetail?.items, supplyType]);



  const validLines = documentType === 'SALES_RETURN'

    ? lines.filter(line => numeric(line.quantity) > 0)

    : lines;



  async function handleSave() {

    if (saving) return;



    if (!/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) {

      Alert.alert('Document date', 'Use date format YYYY-MM-DD.');

      return;

    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {

      Alert.alert('Due date', 'Use date format YYYY-MM-DD.');

      return;

    }

    if (dueDate && dueDate < documentDate) {

      Alert.alert('Invalid due date', 'Due date cannot be before the document date.');

      return;

    }

    if (!validLines.length) {

      Alert.alert('Add item', documentType === 'SALES_RETURN'

        ? 'Enter a return quantity for at least one invoice line.'

        : 'Add at least one item or service.');

      return;

    }



    for (const line of validLines) {

      const qty = numeric(line.quantity);

      if (qty <= 0) {

        Alert.alert('Invalid quantity', `${line.productName} must have a quantity greater than zero.`);

        return;

      }

      if (line.maxQuantity != null && qty > line.maxQuantity + 0.0000005) {

        Alert.alert(

          'Quantity too high',

          `${line.productName} can use at most ${line.maxQuantity} ${line.unit}.`,

        );

        return;

      }

    }



    const customFields: SalesCustomField[] = fieldLabels.map((label, index) => ({

      key: `extra${index}`,

      label,

      value: customValues[index]?.trim() ?? '',

    }));



    try {

      setSaving(true);



      if (documentType === 'SALES_RETURN') {

        if (!sourceDetail || sourceDetail.document.documentType !== 'SALES_INVOICE') {

          throw new Error('Select the original Tax invoice for this sales return.');

        }



        await saveSalesWorkflow({

          documentType: 'SALES_RETURN',

          customerId: sourceDetail.document.customerId,

          documentDate,

          dueDate: dueDate || undefined,

          supplyType,

          source: {

            documentType: 'SALES_INVOICE',

            id: sourceDetail.document.id,

            documentNumber: sourceDetail.document.documentNumber,

          },

          items: validLines.map(line => ({

            sourceItemId: line.sourceItemId as string,

            quantity: numeric(line.quantity),

          })),

          customFields,

          notes: notes.trim() || undefined,

        });

      } else {

        const source = sourceDetail

          ? {

              documentType: sourceDetail.document.documentType,

              id: sourceDetail.document.id,

              documentNumber: sourceDetail.document.documentNumber,

            }

          : undefined;



        const items: SalesWorkflowLineInput[] = validLines.map(line => ({

          productId: line.productId,

          quantity: numeric(line.quantity),

          unitPrice: numeric(line.unitPrice),

          gstRate: numeric(line.gstRate),

          sourceItemId: line.sourceItemId,

        }));



        if (documentType === 'QUOTATION') {

          await saveSalesWorkflow({

            documentType,

            customerId: customerId || undefined,

            documentDate,

            dueDate: dueDate || undefined,

            supplyType,

            items,

            customFields,

            notes: notes.trim() || undefined,

          });

        } else if (documentType === 'SALES_ORDER') {

          await saveSalesWorkflow({

            documentType,

            customerId: customerId || undefined,

            documentDate,

            dueDate: dueDate || undefined,

            supplyType,

            source: source?.documentType === 'QUOTATION'

              ? { documentType: 'QUOTATION', id: source.id, documentNumber: source.documentNumber }

              : undefined,

            items,

            customFields,

            notes: notes.trim() || undefined,

          });

        } else if (documentType === 'DELIVERY_CHALLAN') {

          await saveSalesWorkflow({

            documentType,

            customerId: customerId || undefined,

            documentDate,

            dueDate: dueDate || undefined,

            supplyType,

            source: source?.documentType === 'SALES_ORDER'

              ? { documentType: 'SALES_ORDER', id: source.id, documentNumber: source.documentNumber }

              : undefined,

            items,

            customFields,

            notes: notes.trim() || undefined,

          });

        } else {

          await saveSalesWorkflow({

            documentType: 'SALES_INVOICE',

            customerId: customerId || undefined,

            documentDate,

            dueDate: dueDate || undefined,

            supplyType,

            source: source?.documentType === 'DELIVERY_CHALLAN'

              ? { documentType: 'DELIVERY_CHALLAN', id: source.id, documentNumber: source.documentNumber }

              : undefined,

            items,

            customFields,

            notes: notes.trim() || undefined,

          });

        }

      }



      Alert.alert(

        `${titleFor(documentType)} saved`,

        'The sales document was saved successfully.',

        [{ text: 'OK', onPress: () => router.back() }],

      );

    } catch (error) {

      Alert.alert('Unable to save', errorText(error));

    } finally {

      setSaving(false);

    }

  }



  if (loading) {

    return (

      <View style={styles.backdrop}>

        <SafeAreaView style={styles.loadingSheet}>

          <Text style={styles.loadingTitle}>Loading sales form...</Text>

          <Text style={styles.loadingText}>Preparing customers, items and workflow data.</Text>

        </SafeAreaView>

      </View>

    );

  }



  if (loadError) {

    return (

      <View style={styles.backdrop}>

        <SafeAreaView style={styles.loadingSheet}>

          <Text style={styles.loadingTitle}>Unable to open form</Text>

          <Text style={styles.loadingText}>{loadError}</Text>

          <Pressable style={styles.primaryButton} onPress={() => void loadForm()}>

            <Text style={styles.primaryButtonText}>Retry</Text>

          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>

            <Text style={styles.secondaryButtonText}>Go back</Text>

          </Pressable>

        </SafeAreaView>

      </View>

    );

  }



  return (

    <View style={styles.backdrop}>

      <Stack.Screen

        options={{

          headerShown: false,

          presentation: 'transparentModal',

          animation: 'slide_from_bottom',

          contentStyle: { backgroundColor: 'transparent' },

        }}

      />



      <KeyboardAvoidingView

        style={styles.keyboard}

        behavior={Platform.OS === 'ios' ? 'padding' : undefined}

      >

        <SafeAreaView

          style={[

            styles.sheet,

            wide && styles.sheetWide,

            { paddingBottom: Math.max(insets.bottom, 8) },

          ]}

          edges={['top']}

        >

          <View style={styles.modalHeader}>

            <View style={styles.modalHeaderText}>

              <Text style={styles.modalTitle}>{titleFor(documentType)}</Text>

              <Text style={styles.modalSubtitle}>{subtitleFor(documentType)}</Text>

            </View>

            <Pressable

              style={styles.closeButton}

              onPress={() => router.back()}

              disabled={saving}

              accessibilityLabel="Close sales form"

            >

              <Text style={styles.closeText}>×</Text>

            </Pressable>

          </View>



          <ScrollView

            contentContainerStyle={styles.content}

            keyboardShouldPersistTaps="handled"

            showsVerticalScrollIndicator={false}

          >

            <View style={styles.notice}>

              <Text style={styles.noticeText}>

                {sourceDetail

                  ? `Converted from ${sourceDetail.document.documentNumber} without re-entry. `

                  : ''}

                {business?.businessType

                  ? `${business.businessType.replace(/_/g, ' ')} fields are shown below.`

                  : 'Business-specific fields are shown below.'}

              </Text>

            </View>



            {documentType === 'SALES_RETURN' && !routeSourceId && (

              <Field label="ORIGINAL TAX INVOICE *">

                <View style={styles.pickerBox}>

                  <Picker

                    selectedValue={selectedReturnInvoiceId}

                    onValueChange={value => void chooseReturnInvoice(String(value))}

                    enabled={!saving}

                    style={styles.picker}

                  >

                    <Picker.Item label="Select invoice" value="" />

                    {invoices.map(invoice => (

                      <Picker.Item

                        key={invoice.id}

                        label={`${invoice.documentNumber} • ${invoice.customerName} • ${money(invoice.totalAmount)}`}

                        value={invoice.id}

                      />

                    ))}

                  </Picker>

                </View>

              </Field>

            )}



            <Field label="CUSTOMER">

              <View style={[styles.pickerBox, sourceLocked && styles.readOnly]}>

                <Picker

                  selectedValue={customerId}

                  onValueChange={value => setCustomerId(String(value))}

                  enabled={!saving && !sourceLocked}

                  style={styles.picker}

                >

                  <Picker.Item label="Walk-in Customer" value="" />

                  {customers.map(customer => (

                    <Picker.Item key={customer.id} label={customer.name} value={customer.id} />

                  ))}

                </Picker>

              </View>

            </Field>



            <View style={styles.twoColumns}>

              <Field label="DOCUMENT DATE" style={styles.halfField}>

                <TextInput

                  value={documentDate}

                  onChangeText={setDocumentDate}

                  placeholder="YYYY-MM-DD"

                  placeholderTextColor={C.muted}

                  style={styles.input}

                  editable={!saving}

                  autoCapitalize="none"

                />

              </Field>



              <Field label={documentType === 'QUOTATION' ? 'VALID UNTIL' : 'DUE DATE'} style={styles.halfField}>

                <TextInput

                  value={dueDate}

                  onChangeText={setDueDate}

                  placeholder="YYYY-MM-DD"

                  placeholderTextColor={C.muted}

                  style={styles.input}

                  editable={!saving}

                  autoCapitalize="none"

                />

              </Field>

            </View>



            <Field label="SUPPLY">

              <View style={[styles.pickerBox, sourceLocked && styles.readOnly]}>

                <Picker

                  selectedValue={supplyType}

                  onValueChange={value => setSupplyType(value as SalesSupplyType)}

                  enabled={!saving && !sourceLocked}

                  style={styles.picker}

                >

                  <Picker.Item label="Within state (CGST + SGST)" value="WITHIN_STATE" />

                  <Picker.Item label="Other state (IGST)" value="OTHER_STATE" />

                </Picker>

              </View>

            </Field>



            {fieldLabels.map((label, index) => (

              <Field key={label} label={label.toUpperCase()}>

                <TextInput

                  value={customValues[index]}

                  onChangeText={value => updateCustom(index, value)}

                  placeholder={label}

                  placeholderTextColor={C.muted}

                  style={styles.input}

                  editable={!saving}

                />

              </Field>

            ))}



            {documentType === 'SALES_RETURN' ? (

              <View style={styles.lineBox}>

                <Text style={styles.lineBoxTitle}>Return invoice items</Text>

                {!sourceDetail ? (

                  <Text style={styles.noLines}>Select the original Tax invoice first.</Text>

                ) : lines.length === 0 ? (

                  <Text style={styles.noLines}>This invoice has no remaining returnable quantity.</Text>

                ) : (

                  lines.map(line => (

                    <View key={line.key} style={styles.savedLine}>

                      <View style={styles.savedLineTop}>

                        <View style={styles.savedLineMain}>

                          <Text style={styles.savedLineName}>{line.productName}</Text>

                          <Text style={styles.savedLineMeta}>

                            {line.hsn ? `HSN/SAC ${line.hsn} • ` : ''}

                            {money(numeric(line.unitPrice))} • GST {line.gstRate}%

                          </Text>

                          <Text style={styles.returnableText}>

                            Returnable: {line.maxQuantity ?? 0} {line.unit}

                          </Text>

                        </View>

                      </View>

                      <View style={styles.returnQtyRow}>

                        <Text style={styles.miniLabel}>RETURN QTY</Text>

                        <TextInput

                          value={line.quantity}

                          onChangeText={value => updateLine(line.key, 'quantity', decimalInput(value))}

                          keyboardType="decimal-pad"

                          style={styles.smallInput}

                          editable={!saving}

                        />

                      </View>

                    </View>

                  ))

                )}

              </View>

            ) : sourceLocked ? (

              <View style={styles.lineBox}>

                <Text style={styles.lineBoxTitle}>Items carried from source</Text>

                {lines.map(line => (

                  <View key={line.key} style={styles.savedLine}>

                    <View style={styles.savedLineTop}>

                      <View style={styles.savedLineMain}>

                        <Text style={styles.savedLineName}>{line.productName}</Text>

                        <Text style={styles.savedLineMeta}>

                          {line.hsn ? `HSN/SAC ${line.hsn} • ` : ''}

                          {line.unit} • GST {line.gstRate}%

                        </Text>

                      </View>

                      <Text style={styles.savedLineAmount}>

                        {money(numeric(line.quantity) * numeric(line.unitPrice))}

                      </Text>

                    </View>

                    <View style={styles.sourceLineFields}>

                      <View style={styles.sourceLineField}>

                        <Text style={styles.miniLabel}>QTY</Text>

                        <TextInput

                          value={line.quantity}

                          onChangeText={value => updateLine(line.key, 'quantity', decimalInput(value))}

                          keyboardType="decimal-pad"

                          style={styles.smallInput}

                          editable={!saving}

                        />

                      </View>

                      <View style={styles.sourceLineField}>

                        <Text style={styles.miniLabel}>RATE</Text>

                        <View style={[styles.smallInput, styles.readOnly, styles.readOnlyValue]}>

                          <Text style={styles.readOnlyText}>{money(numeric(line.unitPrice))}</Text>

                        </View>

                      </View>

                    </View>

                  </View>

                ))}

              </View>

            ) : (

              <View style={styles.lineBox}>

                <Text style={styles.lineBoxTitle}>Add item or service</Text>



                <View style={styles.itemQtyRow}>

                  <View style={styles.itemPickerArea}>

                    <Text style={styles.miniLabel}>ITEM</Text>

                    <View style={styles.pickerBoxCompact}>

                      <Picker

                        selectedValue={selectedProductId}

                        onValueChange={value => selectProduct(String(value))}

                        enabled={!saving}

                        style={styles.picker}

                      >

                        {products.length === 0 && <Picker.Item label="No items available" value="" />}

                        {products.map(product => (

                          <Picker.Item key={product.id} label={product.name} value={product.id} />

                        ))}

                      </Picker>

                    </View>

                  </View>



                  <View style={styles.qtyArea}>

                    <Text style={styles.miniLabel}>QTY</Text>

                    <TextInput

                      value={lineQty}

                      onChangeText={value => setLineQty(decimalInput(value))}

                      keyboardType="decimal-pad"

                      style={styles.input}

                      editable={!saving}

                    />

                  </View>

                </View>



                <View style={styles.itemQtyRow}>

                  <View style={styles.itemPickerArea}>

                    <Text style={styles.miniLabel}>RATE</Text>

                    <TextInput

                      value={lineRate}

                      onChangeText={value => setLineRate(decimalInput(value))}

                      keyboardType="decimal-pad"

                      style={styles.input}

                      editable={!saving}

                    />

                  </View>

                  <View style={styles.qtyArea}>

                    <Text style={styles.miniLabel}>GST %</Text>

                    <TextInput

                      value={lineGst}

                      onChangeText={value => setLineGst(decimalInput(value))}

                      keyboardType="decimal-pad"

                      style={styles.input}

                      editable={!saving}

                    />

                  </View>

                </View>





                <Pressable

                  style={[styles.addLineButton, (!selectedProductId || saving) && styles.disabled]}

                  onPress={() => void addLine()}

                  disabled={!selectedProductId || saving}

                >

                  <Text style={styles.addLineText}>Add line</Text>

                </Pressable>



                {lines.length === 0 ? (

                  <Text style={styles.noLines}>No lines added.</Text>

                ) : (

                  lines.map(line => (

                    <View key={line.key} style={styles.savedLine}>

                      <View style={styles.savedLineTop}>

                        <View style={styles.savedLineMain}>

                          <Text style={styles.savedLineName}>{line.productName}</Text>

                          <Text style={styles.savedLineMeta}>

                            {line.quantity} {line.unit} × {money(numeric(line.unitPrice))} + {line.gstRate}%

                          </Text>


                        </View>

                        <Pressable onPress={() => removeLine(line.key)} disabled={saving} style={styles.removeButton}>

                          <Text style={styles.removeText}>×</Text>

                        </Pressable>

                      </View>

                    </View>

                  ))

                )}

              </View>

            )}



            <View style={styles.totalsCard}>

              <View style={styles.totalRow}>

                <Text style={styles.totalLabel}>Taxable value</Text>

                <Text style={styles.totalValue}>{money(calculations.subtotal)}</Text>

              </View>

              {supplyType === 'OTHER_STATE' ? (

                <View style={styles.totalRow}>

                  <Text style={styles.totalLabel}>IGST</Text>

                  <Text style={styles.totalValue}>{money(calculations.igstAmount)}</Text>

                </View>

              ) : (

                <>

                  <View style={styles.totalRow}>

                    <Text style={styles.totalLabel}>CGST</Text>

                    <Text style={styles.totalValue}>{money(calculations.cgstAmount)}</Text>

                  </View>

                  <View style={styles.totalRow}>

                    <Text style={styles.totalLabel}>SGST</Text>

                    <Text style={styles.totalValue}>{money(calculations.sgstAmount)}</Text>

                  </View>

                </>

              )}

              <View style={styles.totalDivider} />

              <View style={styles.totalRow}>

                <Text style={styles.grandLabel}>Total</Text>

                <Text style={styles.grandValue}>{money(calculations.totalAmount)}</Text>

              </View>

            </View>



            <Field label="NOTES">

              <TextInput

                value={notes}

                onChangeText={setNotes}

                placeholder="Optional reference or terms"

                placeholderTextColor={C.muted}

                style={[styles.input, styles.notesInput]}

                multiline

                numberOfLines={3}

                textAlignVertical="top"

                editable={!saving}

              />

            </Field>



            <View style={styles.actions}>

              <Pressable

                style={[styles.cancelButton, saving && styles.disabled]}

                onPress={() => router.back()}

                disabled={saving}

              >

                <Text style={styles.cancelText}>Cancel</Text>

              </Pressable>

              <Pressable

                style={[styles.saveButton, (saving || validLines.length === 0) && styles.disabled]}

                onPress={() => void handleSave()}

                disabled={saving || validLines.length === 0}

              >

                <Text style={styles.saveText}>{saving ? 'Saving...' : saveLabel(documentType)}</Text>

              </Pressable>

            </View>

          </ScrollView>

        </SafeAreaView>

      </KeyboardAvoidingView>

    </View>

  );

}



/* =========================================================

   SMALL SHARED FIELD COMPONENT

========================================================= */



function Field({

  label,

  children,

  style,

}: {

  label: string;

  children: React.ReactNode;

  style?: object;

}) {

  return (

    <View style={[styles.field, style]}>

      <Text style={styles.label}>{label}</Text>

      {children}

    </View>

  );

}



/* =========================================================

   STYLES — MATCH REFERENCE APK SALES FORM

========================================================= */



const styles = StyleSheet.create({

  backdrop: {

    flex: 1,

    backgroundColor: 'rgba(4,25,43,0.72)',

    justifyContent: 'flex-end',

  },

  keyboard: {

    flex: 1,

    justifyContent: 'flex-end',

  },

  sheet: {

    flex: 1,

    width: '100%',

    backgroundColor: C.bg,

    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    overflow: 'hidden',

  },

  sheetWide: {

    maxWidth: 760,

    alignSelf: 'center',

    marginTop: 34,

    marginBottom: 20,

    borderRadius: 28,

  },

  modalHeader: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: 12,

    paddingHorizontal: 20,

    paddingTop: 18,

    paddingBottom: 14,

  },

  modalHeaderText: {

    flex: 1,

    minWidth: 0,

  },

  modalTitle: {

    color: C.ink,

    fontSize: 26,

    fontWeight: '900',

  },

  modalSubtitle: {

    color: C.muted,

    fontSize: 12,

    marginTop: 3,

  },

  closeButton: {

    width: 45,

    height: 45,

    borderRadius: 23,

    backgroundColor: '#EEF1F2',

    alignItems: 'center',

    justifyContent: 'center',

  },

  closeText: {

    color: '#111111',

    fontSize: 29,

    lineHeight: 32,

  },

  content: {

    paddingHorizontal: 20,

    paddingBottom: 24,

  },

  notice: {

    backgroundColor: C.notice,

    borderColor: C.noticeBorder,

    borderWidth: 1,

    borderRadius: 14,

    paddingHorizontal: 14,

    paddingVertical: 13,

    marginBottom: 14,

  },

  noticeText: {

    color: C.noticeText,

    fontSize: 12,

    lineHeight: 18,

  },

  field: {

    marginBottom: 12,

  },

  halfField: {

    flex: 1,

    minWidth: 0,

  },

  label: {

    color: '#334B5B',

    fontSize: 10,

    fontWeight: '900',

    marginBottom: 6,

  },

  input: {

    minHeight: 54,

    borderWidth: 1,

    borderColor: C.border,

    borderRadius: 14,

    backgroundColor: C.card,

    color: C.ink,

    fontSize: 16,

    paddingHorizontal: 14,

    paddingVertical: 10,

  },

  notesInput: {

    minHeight: 92,

  },

  pickerBox: {

    minHeight: 54,

    borderWidth: 1,

    borderColor: C.border,

    borderRadius: 14,

    backgroundColor: C.card,

    overflow: 'hidden',

    justifyContent: 'center',

  },

  pickerBoxCompact: {

    minHeight: 54,

    borderWidth: 1,

    borderColor: C.border,

    borderRadius: 14,

    backgroundColor: C.card,

    overflow: 'hidden',

    justifyContent: 'center',

  },

  picker: {

    color: C.ink,

  },

  readOnly: {

    opacity: 0.78,

    backgroundColor: '#EFF3F4',

  },

  twoColumns: {

    flexDirection: 'row',

    gap: 10,

  },

  lineBox: {

    backgroundColor: C.card,

    borderWidth: 1,

    borderColor: '#DFE6EA',

    borderRadius: 18,

    padding: 14,

    marginTop: 2,

    marginBottom: 14,

  },

  lineBoxTitle: {

    color: C.ink,

    fontSize: 13,

    fontWeight: '900',

    marginBottom: 11,

  },

  itemQtyRow: {

    flexDirection: 'row',

    alignItems: 'flex-end',

    gap: 8,

    marginBottom: 9,

  },

  itemPickerArea: {

    flex: 1,

    minWidth: 0,

  },

  qtyArea: {

    width: 94,

    flexShrink: 0,

  },

  miniLabel: {

    color: '#38505F',

    fontSize: 9,

    fontWeight: '900',

    marginBottom: 5,

  },


  addLineButton: {

    minHeight: 53,

    borderRadius: 14,

    backgroundColor: C.teal,

    alignItems: 'center',

    justifyContent: 'center',

  },

  addLineText: {

    color: '#FFFFFF',

    fontSize: 17,

    fontWeight: '900',

  },

  noLines: {

    color: C.muted,

    fontSize: 10,

    marginTop: 10,

  },

  savedLine: {

    borderTopWidth: 1,

    borderTopColor: '#E5EAED',

    paddingTop: 11,

    marginTop: 11,

  },

  savedLineTop: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: 10,

  },

  savedLineMain: {

    flex: 1,

    minWidth: 0,

  },

  savedLineName: {

    color: C.ink,

    fontSize: 12,

    fontWeight: '900',

  },

  savedLineMeta: {

    color: C.muted,

    fontSize: 9,

    lineHeight: 14,

    marginTop: 3,

  },

  savedLineAmount: {

    color: C.ink,

    fontSize: 12,

    fontWeight: '900',

  },

  removeButton: {

    width: 30,

    height: 30,

    borderRadius: 15,

    backgroundColor: '#FCEBE9',

    alignItems: 'center',

    justifyContent: 'center',

  },

  removeText: {

    color: C.danger,

    fontSize: 20,

    lineHeight: 22,

  },

  sourceLineFields: {

    flexDirection: 'row',

    gap: 8,

    marginTop: 10,

  },

  sourceLineField: {

    flex: 1,

  },

  smallInput: {

    minHeight: 44,

    borderWidth: 1,

    borderColor: C.border,

    borderRadius: 12,

    backgroundColor: C.card,

    color: C.ink,

    fontSize: 13,

    paddingHorizontal: 11,

    paddingVertical: 8,

  },

  readOnlyValue: {

    justifyContent: 'center',

  },

  readOnlyText: {

    color: C.ink,

    fontSize: 12,

    fontWeight: '700',

  },

  returnQtyRow: {

    marginTop: 10,

  },

  returnableText: {

    color: C.warning,

    fontSize: 9,

    fontWeight: '800',

    marginTop: 3,

  },

  totalsCard: {

    alignSelf: 'flex-end',

    width: '100%',

    maxWidth: 430,

    backgroundColor: C.card,

    borderRadius: 16,

    paddingHorizontal: 17,

    paddingVertical: 14,

    marginBottom: 14,

  },

  totalRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    gap: 12,

    marginVertical: 6,

  },

  totalLabel: {

    color: C.muted,

    fontSize: 12,

  },

  totalValue: {

    color: C.ink,

    fontSize: 12,

    fontWeight: '800',

  },

  totalDivider: {

    height: 1,

    backgroundColor: '#DFE5E8',

    marginVertical: 5,

  },

  grandLabel: {

    color: C.ink,

    fontSize: 16,

    fontWeight: '900',

  },

  grandValue: {

    color: C.ink,

    fontSize: 16,

    fontWeight: '900',

  },

  actions: {

    flexDirection: 'row',

    justifyContent: 'flex-end',

    gap: 10,

    marginTop: 4,

  },

  cancelButton: {

    minWidth: 115,

    minHeight: 54,

    borderRadius: 14,

    backgroundColor: C.softTeal,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 15,

  },

  cancelText: {

    color: C.tealDark,

    fontSize: 15,

    fontWeight: '900',

  },

  saveButton: {

    minWidth: 170,

    minHeight: 54,

    borderRadius: 14,

    backgroundColor: C.teal,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 16,

  },

  saveText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '900',

  },

  primaryButton: {

    marginTop: 18,

    minHeight: 46,

    borderRadius: 13,

    backgroundColor: C.teal,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 18,

  },

  primaryButtonText: {

    color: '#FFFFFF',

    fontWeight: '900',

  },

  secondaryButton: {

    marginTop: 8,

    minHeight: 46,

    borderRadius: 13,

    backgroundColor: C.softTeal,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 18,

  },

  secondaryButtonText: {

    color: C.tealDark,

    fontWeight: '900',

  },

  disabled: {

    opacity: 0.45,

  },

  loadingSheet: {

    width: '100%',

    maxWidth: 620,

    alignSelf: 'center',

    marginTop: 'auto',

    backgroundColor: C.bg,

    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    padding: 24,

  },

  loadingTitle: {

    color: C.ink,

    fontSize: 20,

    fontWeight: '900',

  },

  loadingText: {

    color: C.muted,

    fontSize: 12,

    lineHeight: 18,

    marginTop: 6,

  },

});
