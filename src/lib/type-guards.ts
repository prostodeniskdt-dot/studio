/**
 * Type guards for Firestore data validation
 */

import type { 
  Product, 
  InventorySession, 
  InventoryLine, 
  UserProfile, 
  Supplier, 
  PurchaseOrder,
  PurchaseOrderLine 
} from './types';
import { Timestamp } from 'firebase/firestore';

/**
 * Type guard for Firestore Timestamp
 */
export function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as any).toDate === 'function' &&
    typeof (value as any).toMillis === 'function'
  );
}

/**
 * Type guard for Product
 */
export function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.costPerBottle === 'number' &&
    typeof obj.sellingPricePerPortion === 'number' &&
    typeof obj.portionVolumeMl === 'number' &&
    typeof obj.bottleVolumeMl === 'number' &&
    typeof obj.isActive === 'boolean' &&
    (isFirestoreTimestamp(obj.createdAt) || obj.createdAt === undefined) &&
    (isFirestoreTimestamp(obj.updatedAt) || obj.updatedAt === undefined)
  );
}

/**
 * Type guard for InventorySession
 */
export function isInventorySession(value: unknown): value is InventorySession {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.barId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.status === 'string' &&
    ['draft', 'in_progress', 'completed'].includes(obj.status) &&
    typeof obj.createdByUserId === 'string' &&
    (isFirestoreTimestamp(obj.createdAt) || obj.createdAt === undefined) &&
    (isFirestoreTimestamp(obj.closedAt) || obj.closedAt === undefined || obj.closedAt === null)
  );
}

/**
 * Type guard for InventoryLine
 */
export function isInventoryLine(value: unknown): value is InventoryLine {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.productId === 'string' &&
    typeof obj.inventorySessionId === 'string' &&
    typeof obj.startStock === 'number' &&
    typeof obj.purchases === 'number' &&
    typeof obj.endStock === 'number' &&
    typeof obj.sales === 'number' &&
    typeof obj.theoreticalEndStock === 'number' &&
    typeof obj.differenceVolume === 'number' &&
    typeof obj.differenceMoney === 'number' &&
    typeof obj.differencePercent === 'number'
  );
}

/**
 * Type guard for UserProfile
 */
export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string' &&
    ['admin', 'manager', 'bartender'].includes(obj.role) &&
    (isFirestoreTimestamp(obj.createdAt) || obj.createdAt === undefined)
  );
}

/**
 * Type guard for Supplier
 */
export function isSupplier(value: unknown): value is Supplier {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.barId === 'string' &&
    typeof obj.name === 'string'
  );
}

/**
 * Type guard for PurchaseOrder
 */
export function isPurchaseOrder(value: unknown): value is PurchaseOrder {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.barId === 'string' &&
    typeof obj.supplierId === 'string' &&
    typeof obj.status === 'string' &&
    ['draft', 'ordered', 'partially_received', 'received', 'cancelled'].includes(obj.status) &&
    typeof obj.createdByUserId === 'string' &&
    (isFirestoreTimestamp(obj.orderDate) || obj.orderDate === undefined) &&
    (isFirestoreTimestamp(obj.createdAt) || obj.createdAt === undefined) &&
    (isFirestoreTimestamp(obj.expectedDeliveryDate) || obj.expectedDeliveryDate === undefined)
  );
}

/**
 * Type guard for PurchaseOrderLine
 */
export function isPurchaseOrderLine(value: unknown): value is PurchaseOrderLine {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  return (
    typeof obj.id === 'string' &&
    typeof obj.purchaseOrderId === 'string' &&
    typeof obj.productId === 'string' &&
    typeof obj.quantity === 'number' &&
    typeof obj.costPerItem === 'number' &&
    typeof obj.receivedQuantity === 'number'
  );
}

/**
 * Type guard for array of Products
 */
export function isProductArray(value: unknown): value is Product[] {
  return Array.isArray(value) && value.every(item => isProduct(item));
}

/**
 * Type guard for array of InventorySessions
 */
export function isInventorySessionArray(value: unknown): value is InventorySession[] {
  return Array.isArray(value) && value.every(item => isInventorySession(item));
}

/**
 * Type guard for array of InventoryLines
 */
export function isInventoryLineArray(value: unknown): value is InventoryLine[] {
  return Array.isArray(value) && value.every(item => isInventoryLine(item));
}

/**
 * Safely convert Firestore data to typed object
 */
export function safeParseFirestoreData<T>(
  data: unknown,
  typeGuard: (value: unknown) => value is T
): T | null {
  if (typeGuard(data)) {
    return data;
  }
  return null;
}

/**
 * Safely convert Firestore array to typed array
 */
export function safeParseFirestoreArray<T>(
  data: unknown,
  typeGuard: (value: unknown) => value is T
): T[] {
  if (Array.isArray(data)) {
    return data.filter(typeGuard);
  }
  return [];
}

