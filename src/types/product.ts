export interface Product {
    id: string;
    businessId: string;
  
    name: string;
    hsn?: string;
    unit: string;
  
    salePrice: number;
    purchasePrice: number;
    gstRate: number;
  
    openingStock: number;
  
    barcode?: string;
    brand?: string;
    rack?: string;
  
    createdAt: string;
    updatedAt: string;
  }