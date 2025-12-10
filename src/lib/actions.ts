'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { InventoryLine, Product, Supplier, UserRole, PurchaseOrder } from './types';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

        const dataToSet = {
            ...order,
            barId: barId,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (!(await orderRef.get()).exists) {
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
        
        // TODO: Also delete subcollection 'lines'
        
        await orderRef.delete();
        
        return { success: true };
    } catch (error) {
        console.error("Error in deletePurchaseOrder server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при удалении заказа.' };
    }
}
