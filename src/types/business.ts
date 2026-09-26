export type BusinessType = 'RETAIL';

export interface Business {
  id: string;

  name: string;
  businessType: BusinessType;

  gstin?: string;

  createdAt: string;
  updatedAt: string;
}