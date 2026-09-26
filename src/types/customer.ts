export interface Customer {
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

export interface CreateCustomerInput {
  name: string;
  mobile: string;
  gstin?: string;
  state: string;
  address?: string;
  creditDays: number;
  openingBalance: number;
  businessDetail?: string;
}
