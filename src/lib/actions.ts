'use server';

import type { InventoryLine, Product } from './types';
import { getUpcomingHoliday, russianHolidays2024 } from './holidays';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server';
import { purchaseOrderSchema, purchaseOrderLineSchema } from './schemas';
import { z } from 'zod';
import { logger } from './logger';

// Импортируем функцию и типы явно
import { analyzeInventoryVariance as _analyzeInventoryVariance } from '@/ai/flows/analyze-inventory-variance';
import type { VarianceAnalysisInput, VarianceAnalysisResult } from '@/ai/flows/analyze-inventory-variance';

// Явно экспортируем как async функцию (Next.js требует явный async export в 'use server' файлах)
export async function analyzeInventoryVariance(input: VarianceAnalysisInput): Promise<VarianceAnalysisResult> {
  return _analyzeInventoryVariance(input);
}

// Экспортируем типы
export type { VarianceAnalysisInput, VarianceAnalysisResult };

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
export async function createPurchaseOrdersFromSession(input: unknown): Promise<CreatePurchaseOrdersOutput> {
    // Validate input with Zod
    const inputSchema = z.object({
        lines: z.array(z.any()), // InventoryLine schema would be complex, using any for now
        products: z.array(z.any()), // Product schema
        barId: z.string().min(1),
        userId: z.string().min(1),
    });
    
    const validated = inputSchema.parse(input);
    const { lines, products, barId, userId } = validated;
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
                logger.warn("Skipping order for products with unknown supplier.");
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
    } catch(e: unknown) {
        logger.error("Failed to create purchase orders:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Не удалось создать заказы на закупку: ${errorMessage}`);
    }
}
