export interface Vendor { 
  id: string; 
  businessId: string; 
  name: string;  
  mobile: string; 
  gstin?: string; 
  state: string; 
  address?: string; 
  creditDays: number; 
  openingBalance: number; 
  businessDetail?: string; 
  createdAt: string; 
  updatedAt: string; 
} 

export interface CreateVendorInput { 
  name: string; 
  mobile: string; 
  gstin?: string; 
  state: string; 
  address?: string; 
  creditDays: number; 
  openingBalance: number; 
  businessDetail?: string;  
} 