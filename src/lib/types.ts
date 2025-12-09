export type UserRole = 'admin' | 'manager' | 'bartender';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export type ProductCategory = 'Whiskey' | 'Rum' | 'Vodka' | 'Gin' | 'Tequila' | 'Liqueur' | 'Wine' | 'Beer' | 'Syrup' | 'Other';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  bottleVolumeMl: number;
  costPerBottle: number;
  sellingPricePerPortion: number;
  portionVolumeMl: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InventorySessionStatus = 'draft' | 'in_progress' | 'completed';

export interface InventorySession {
  id: string;
  name: string;
  status: InventorySessionStatus;
  createdByUserId: string;
  createdAt: Date;
  closedAt?: Date;
  lines: InventoryLine[];
}

export interface InventoryLine {
  id: string;
  productId: string;
  // This will be populated for UI display
  product?: Product;

  // All volumes in ml
  startStock: number;
  purchases: number;
  endStock: number;
  
  // Sales in number of portions
  sales: number; 
}

export interface CalculatedInventoryLine extends InventoryLine {
  theoreticalEndStock: number;
  differenceVolume: number;
  differenceMoney: number;
  differencePercent: number;
}
