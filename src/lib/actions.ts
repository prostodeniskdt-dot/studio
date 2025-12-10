'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { InventoryLine, Product, Supplier, UserRole, PurchaseOrder, PurchaseOrderLine } from './types';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateLineFields } from './calculations';

const AnalyzeInventoryVarianceInputSchema = z.object({
  productName: z.string().describe('The name of the product being analyzed.'),
  theoreticalEndStock: z.number().describe('The theoretical end stock level of the product.'),
  endStock: z.number().describe('The actual end stock level of the product.'),
  sales: z.number().describe('The amount of the product sold during the inventory session.'),
  purchases: z.number().describe('The amount of the product purchased during the inventory session.'),
  startStock: z.number().describe('The starting stock level of the product.'),
});
export type AnalyzeInventoryVarianceInput = z.infer<typeof AnalyzeInventoryVarianceInputSchema>;

const AnalyzeInventoryVarianceOutputSchema = z.object({
  analysis: z.string().describe('An analysis of potential causes for the inventory variance.'),
});
export type AnalyzeInventoryVarianceOutput = z.infer<typeof AnalyzeInventoryVarianceOutputSchema>;


export async function runVarianceAnalysis(line: InventoryLine & { product?: Product }) {
  if (!line.product) {
    throw new Error('Данные о продукте отсутствуют для анализа.');
  }

  const { name, portionVolumeMl } = line.product;
  const { startStock, purchases, sales, endStock, theoreticalEndStock } = line;

  if (
    name === undefined ||
    startStock === undefined ||
    purchases === undefined ||
    sales === undefined ||
    endStock === undefined ||
    theoreticalEndStock === undefined ||
    portionVolumeMl === undefined
  ) {
    throw new Error('Неполные данные для анализа.');
  }

  const input: AnalyzeInventoryVarianceInput = {
    productName: name,
    startStock: startStock,
    purchases: purchases,
    sales: sales * portionVolumeMl, 
    endStock: endStock,
    theoreticalEndStock: theoreticalEndStock,
  };

  try {
    const result = await analyzeInventoryVarianceFlow(input);
    return result;
  } catch (error) {
    console.error('Error in runVarianceAnalysis calling Genkit flow:', error);
    throw new Error('Сбой AI-анализа. Пожалуйста, проверьте свой API-ключ Gemini и повторите попытку.');
  }
}

// Server action to add a staff member
export async function addStaffMember(barId: string, email: string, role: 'manager' | 'bartender'): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = initializeAdminApp();
    
    // Find user by email
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('email', '==', email).limit(1);
    const userSnapshot = await userQuery.get();

    if (userSnapshot.empty) {
      return { success: false, error: 'Пользователь с таким email не найден.' };
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Check if user is already a member
    const memberRef = db.collection('bars').doc(barId).collection('members').doc(userId);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      return { success: false, error: 'Этот пользователь уже является сотрудником бара.' };
    }

    // Add user to the members subcollection
    await memberRef.set({
      userId: userId,
      role: role,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in addStaffMember server action:", error);
    return { success: false, error: 'Произошла ошибка на сервере.' };
  }
}

// Server action to remove a staff member
export async function removeStaffMember(barId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = initializeAdminApp();
    const memberRef = db.collection('bars').doc(barId).collection('members').doc(userId);
    
    await memberRef.delete();
    
    return { success: true };
  } catch (error) {
    console.error("Error in removeStaffMember server action:", error);
    return { success: false, error: 'Произошла ошибка на сервере.' };
  }
}

export async function upsertSupplier(barId: string, supplier: Omit<Supplier, 'barId'>): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const supplierRef = db.collection('bars').doc(barId).collection('suppliers').doc(supplier.id);

        await supplierRef.set({
            ...supplier,
            barId: barId,
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error in upsertSupplier server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при сохранении поставщика.' };
    }
}

export async function deleteSupplier(barId: string, supplierId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const supplierRef = db.collection('bars').doc(barId).collection('suppliers').doc(supplierId);
        
        await supplierRef.delete();
        
        return { success: true };
    } catch (error) {
        console.error("Error in deleteSupplier server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при удалении поставщика.' };
    }
}

export async function upsertPurchaseOrder(barId: string, order: Omit<PurchaseOrder, 'barId' | 'createdAt' | 'createdByUserId'> & { createdByUserId: string }): Promise<{ success: boolean; error?: string, id?: string }> {
    try {
        const { db } = initializeAdminApp();
        const orderRef = db.collection('bars').doc(barId).collection('purchaseOrders').doc(order.id);

        const dataToSet: any = {
            ...order,
            barId: barId,
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docSnap = await orderRef.get();
        if (!docSnap.exists) {
            dataToSet.createdAt = FieldValue.serverTimestamp();
        }

        await orderRef.set(dataToSet, { merge: true });

        return { success: true, id: order.id };
    } catch (error) {
        console.error("Error in upsertPurchaseOrder server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при сохранении заказа.' };
    }
}

export async function deletePurchaseOrder(barId: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const orderRef = db.collection('bars').doc(barId).collection('purchaseOrders').doc(orderId);
        
        const linesSnapshot = await orderRef.collection('lines').get();
        const batch = db.batch();
        linesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        // After deleting lines, delete the order itself
        batch.delete(orderRef);
        
        await batch.commit();
        
        return { success: true };
    } catch (error) {
        console.error("Error in deletePurchaseOrder server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при удалении заказа.' };
    }
}

export async function addPurchaseOrderLine(barId: string, orderId: string, product: Product): Promise<{ success: boolean; error?: string, id?: string }> {
    try {
        const { db } = initializeAdminApp();
        const linesCollection = db.collection('bars').doc(barId).collection('purchaseOrders').doc(orderId).collection('lines');
        
        // Prevent adding duplicates
        const existingLineQuery = linesCollection.where('productId', '==', product.id).limit(1);
        const existingLineSnapshot = await existingLineQuery.get();
        if (!existingLineSnapshot.empty) {
            return { success: false, error: 'Продукт уже в заказе.' };
        }

        const newLineRef = linesCollection.doc();
        const newLineData: Omit<PurchaseOrderLine, 'id'> & { id: string } = {
            id: newLineRef.id,
            purchaseOrderId: orderId,
            productId: product.id,
            quantity: product.reorderQuantity || 1,
            costPerItem: product.costPerBottle,
            receivedQuantity: 0,
        };
        await newLineRef.set(newLineData);
        return { success: true, id: newLineRef.id };
    } catch (error) {
        console.error("Error in addPurchaseOrderLine server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}

export async function updatePurchaseOrderLines(barId: string, orderId: string, lines: PurchaseOrderLine[]): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const batch = db.batch();
        const linesCollection = db.collection('bars').doc(barId).collection('purchaseOrders').doc(orderId).collection('lines');
        
        lines.forEach(line => {
            const lineRef = linesCollection.doc(line.id);
            batch.update(lineRef, {
                quantity: line.quantity,
                costPerItem: line.costPerItem,
                receivedQuantity: line.receivedQuantity || 0
            });
        });
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error in updatePurchaseOrderLines server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}

export async function deletePurchaseOrderLine(barId: string, orderId: string, lineId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const lineRef = db.collection('bars').doc(barId).collection('purchaseOrders').doc(orderId).collection('lines').doc(lineId);
        await lineRef.delete();
        return { success: true };
    } catch (error) {
        console.error("Error in deletePurchaseOrderLine server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}


export async function saveInventoryLines(barId: string, sessionId: string, lines: InventoryLine[]): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const batch = db.batch();
        const productsCollection = db.collection('products');
        const linesCollection = db.collection('bars').doc(barId).collection('inventorySessions').doc(sessionId).collection('lines');
        
        // Fetch all necessary products in one go
        const productIds = lines.map(line => line.productId);
        const productDocs = await db.getAll(...productIds.map(id => productsCollection.doc(id)));
        const productsMap = new Map(productDocs.map(doc => [doc.id, doc.data() as Product]));

        for (const line of lines) {
            const product = productsMap.get(line.productId);
            if (product) {
                const lineRef = linesCollection.doc(line.id);
                const calculatedFields = calculateLineFields(line, product);
                batch.update(lineRef, {
                    startStock: line.startStock,
                    purchases: line.purchases,
                    sales: line.sales,
                    endStock: line.endStock,
                    ...calculatedFields
                });
            }
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error in saveInventoryLines server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при сохранении данных.' };
    }
}

export async function completeInventorySession(barId: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { db } = initializeAdminApp();
        const sessionRef = db.collection('bars').doc(barId).collection('inventorySessions').doc(sessionId);
        
        await sessionRef.update({
            status: 'completed',
            closedAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true };
    } catch (error) {
        console.error("Error in completeInventorySession server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при завершении сессии.' };
    }
}

export async function addProductToSession(barId: string, sessionId: string, productId: string): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
        const { db } = initializeAdminApp();
        const linesCollection = db.collection('bars').doc(barId).collection('inventorySessions').doc(sessionId).collection('lines');
        
        const productSnap = await db.collection('products').doc(productId).get();
        if (!productSnap.exists) {
            return { success: false, error: 'Продукт не найден.' };
        }
        const product = productSnap.data() as Product;

        const newLineRef = linesCollection.doc();
        const line: Omit<InventoryLine, 'id'> = {
            productId: product.id,
            inventorySessionId: sessionId,
            startStock: 0,
            purchases: 0,
            sales: 0,
            endStock: 0,
            ...calculateLineFields({ startStock: 0, purchases: 0, sales: 0, endStock: 0 } as InventoryLine, product),
        };

        await newLineRef.set({ ...line, id: newLineRef.id });

        return { success: true, id: newLineRef.id };
    } catch (error) {
        console.error("Error in addProductToSession server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}