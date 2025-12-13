'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { CalculatedInventoryLine, InventoryLine, InventorySession, Product, PurchaseOrder } from './types';
import { getUpcomingHoliday, russianHolidays2024 } from './holidays';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { translateProductName } from './utils';


export type AnalyzeInventoryVarianceInput = {
    productName: string;
    startStock: number;
    purchases: number;
    sales: number;
    theoreticalEndStock: number;
    endStock: number;
};
export type AnalyzeInventoryVarianceOutput = { analysis: string; };

export async function analyzeVariance(line: CalculatedInventoryLine): Promise<AnalyzeInventoryVarianceOutput> {
  try {
    if (!line.product) {
      throw new Error("Product data is missing for analysis.");
    }
    const analysisInput: AnalyzeInventoryVarianceInput = {
      productName: translateProductName(line.product.name),
      theoreticalEndStock: line.theoreticalEndStock,
      endStock: line.endStock,
      sales: line.sales,
      purchases: line.purchases,
      startStock: line.startStock
    };

    const result = await analyzeInventoryVarianceFlow(analysisInput);
    return result;
  } catch (e: any) {
    console.error("Variance analysis failed:", e);
    // Throw a user-friendly error to be caught by the client-side hook
    throw new Error('Не удалось выполнить анализ. Пожалуйста, попробуйте еще раз.');
  }
}

type CreatePurchaseOrdersInput = {
    lines: InventoryLine[];
    products: Product[];
    barId: string;
    userId: string;
};

type CreatePurchaseOrdersOutput = {
    orderIds: string[];
    createdCount: number;
    holidayBonus: boolean;
    holidayName?: string;
};

/**
 * Creates draft purchase orders based on an inventory session analysis.
 * Identifies products below their reorder point and groups them by supplier.
 * Applies a multiplier for upcoming holidays.
 * @returns An object containing the IDs of created orders and other metadata.
 */
export async function createPurchaseOrdersFromSession(input: CreatePurchaseOrdersInput): Promise<CreatePurchaseOrdersOutput> {
    const { lines, products, barId, userId } = input;
    const { firestore } = initializeFirebase();

    const HOLIDAY_MULTIPLIER = 2; // Increase order by 2x for holidays
    const PRE_HOLIDAY_DAYS = 5;   // Start increasing orders 5 days before a holiday

    const today = new Date();
    const upcomingHoliday = getUpcomingHoliday(today, russianHolidays2024, PRE_HOLIDAY_DAYS);
    const multiplier = upcomingHoliday ? HOLIDAY_MULTIPLIER : 1;

    const productsToOrder = lines.map(line => {
        const product = products.find(p => p.id === line.productId);
        if (!product || !product.reorderPointMl || !product.reorderQuantity) return null;
        if (line.endStock < product.reorderPointMl) {
            const recommendedQuantity = Math.ceil(product.reorderQuantity * multiplier);
            return { product, quantity: recommendedQuantity };
        }
        return null;
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    if (productsToOrder.length === 0) {
        throw new Error('Заказ не требуется: остатки всех продуктов выше минимального уровня.');
    }

    const ordersBySupplier: Record<string, { product: Product, quantity: number }[]> = {};
    productsToOrder.forEach(item => {
        const supplierId = item.product.defaultSupplierId || 'unknown';
        if (!ordersBySupplier[supplierId]) {
            ordersBySupplier[supplierId] = [];
        }
        ordersBySupplier[supplierId].push(item);
    });

    try {
        const batch = writeBatch(firestore);
        const createdOrderIds: string[] = [];

        for (const supplierId in ordersBySupplier) {
            if (supplierId === 'unknown') {
                // In a real app, you might want to handle this more gracefully
                console.warn("Skipping order for products with unknown supplier.");
                continue;
            }
            const orderRef = doc(collection(firestore, 'bars', barId, 'purchaseOrders'));
            createdOrderIds.push(orderRef.id);

            const orderData = {
                id: orderRef.id,
                barId,
                supplierId,
                status: 'draft' as const,
                orderDate: serverTimestamp(),
                createdAt: serverTimestamp(),
                createdByUserId: userId,
            };
            batch.set(orderRef, orderData);

            ordersBySupplier[supplierId].forEach(item => {
                const lineRef = doc(collection(orderRef, 'lines'));
                const lineData = {
                    id: lineRef.id,
                    purchaseOrderId: orderRef.id,
                    productId: item.product.id,
                    quantity: item.quantity,
                    costPerItem: item.product.costPerBottle,
                    receivedQuantity: 0,
                };
                batch.set(lineRef, lineData);
            });
        }
        
        if(createdOrderIds.length > 0) {
            await batch.commit();
        }

        return {
            orderIds: createdOrderIds,
            createdCount: createdOrderIds.length,
            holidayBonus: !!upcomingHoliday,
            holidayName: upcomingHoliday || undefined,
        };
    } catch(e: any) {
        console.error("Failed to create purchase orders:", e);
        throw new Error(`Не удалось создать заказы на закупку: ${e.message}`);
    }
}
