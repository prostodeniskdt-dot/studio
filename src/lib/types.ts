import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'bartender';

export interface UserProfile {
  id: string; // Firebase UID
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
}

export type ProductCategory = 'Whiskey' | 'Rum' | 'Vodka' | 'Gin' | 'Tequila' | 'Liqueur' | 'Wine' | 'Beer' | 'Syrup' | 'Brandy' | 'Vermouth' | 'Absinthe' | 'Bitters' | 'Other';
export type WhiskeySubCategory = 'Scotch' | 'Irish' | 'Bourbon' | 'Japanese' | 'Other';
export type RumSubCategory = 'White' | 'Gold' | 'Dark' | 'Spiced' | 'Other';
export type GinSubCategory = 'London Dry' | 'Old Tom' | 'Plymouth' | 'Other';
export type WineSubCategory = 'Red' | 'White' | 'Rose' | 'Sparkling' | 'Other';
export type BeerSubCategory = 'Lager' | 'Ale' | 'Stout' | 'IPA' | 'Other';
export type BrandySubCategory = 'Cognac' | 'Armagnac' | 'Calvados' | 'Other';
export type VermouthSubCategory = 'Dry' | 'Sweet' | 'Bianco' | 'Other';

export type ProductSubCategory = WhiskeySubCategory | RumSubCategory | GinSubCategory | WineSubCategory | BeerSubCategory | BrandySubCategory | VermouthSubCategory | string;


export interface Product {
  id: string; 
  name: string;
  category: ProductCategory;
  subCategory?: ProductSubCategory;
  imageUrl?: string;
  
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InventorySessionStatus = 'draft' | 'in_progress' | 'completed';

export interface InventorySession {
  id: string;
  barId: string;
  name: string;
  status: InventorySessionStatus;
  createdByUserId: string;
  createdAt: Timestamp;
  closedAt?: Timestamp;
  lines?: InventoryLine[]; // Can be a subcollection
}

export interface InventoryLine {
  id: string; 
  productId: string;
  inventorySessionId: string;
  
  // All volumes in ml
  startStock: number;
  purchases: number;
  endStock: number;
  
  // Sales in number of portions
  sales: number; 

  // Calculated fields - now adding them here as they are part of the line item
  theoreticalEndStock: number;
  differenceVolume: number;
  differenceMoney: number;
  differencePercent: number;
}

// UI-specific, not stored in DB
export interface CalculatedInventoryLine extends InventoryLine {
  product?: Product;
}

export interface Bar {
  id: string;
  name: string;
  location: string;
  ownerUserId: string;
}

export interface BarMember {
    userId: string;
    role: 'manager' | 'bartender';
    // for UI
    userProfile?: UserProfile;
}

export interface Supplier {
    id: string;
    barId: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
    id: string;
    barId: string;
    supplierId: string;
    // For UI
    supplier?: Supplier;
    status: PurchaseOrderStatus;
    orderDate: Timestamp;
    expectedDeliveryDate?: Timestamp;
    createdAt: Timestamp;
    createdByUserId: string;
    lines?: PurchaseOrderLine[];
    totalAmount?: number;
}

export interface PurchaseOrderLine {
    id: string;
    purchaseOrderId: string;
    productId: string;
    // For UI
    product?: Product;
    quantity: number;
    costPerItem: number;
    receivedQuantity?: number;
}
