export type UserRole = 'admin' | 'manager' | 'bartender';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export type ProductCategory = 'Whiskey' | 'Rum' | 'Vodka' | 'Gin' | 'Tequila' | 'Liqueur' | 'Wine' | 'Beer' | 'Syrup' | 'Other';
export type WhiskeySubCategory = 'Scotch' | 'Irish' | 'Bourbon' | 'Japanese' | 'Other';
export type RumSubCategory = 'White' | 'Gold' | 'Dark' | 'Spiced' | 'Other';
export type GinSubCategory = 'London Dry' | 'Old Tom' | 'Plymouth' | 'Other';
export type WineSubCategory = 'Red' | 'White' | 'Rose' | 'Sparkling' | 'Other';
export type BeerSubCategory = 'Lager' | 'Ale' | 'Stout' | 'IPA' | 'Other';

export type ProductSubCategory = WhiskeySubCategory | RumSubCategory | GinSubCategory | WineSubCategory | BeerSubCategory;


export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  subCategory?: ProductSubCategory;
  
  // Экономика
  costPerBottle: number;
  sellingPricePerPortion: number;
  portionVolumeMl: number;
  
  // Профиль бутылки
  bottleVolumeMl: number;
  bottleHeightCm?: number;
  fullBottleWeightG?: number;
  emptyBottleWeightG?: number;

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
