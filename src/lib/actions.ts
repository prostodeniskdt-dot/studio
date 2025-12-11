'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { InventoryLine, Product, Supplier, UserRole, PurchaseOrder, PurchaseOrderLine } from './types';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateLineFields } from './calculations';

// This defines a standard response format for all server actions.
export type ServerActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};


const AnalyzeInventoryVarianceInputSchema = z.object({
  productName: z.string().describe('The name of the product being analyzed.'),
  theoreticalEndStock: z.number().describe('The theoretical end stock level of the product.'),
  endStock: z.number().describe('The actual end stock level of the product.'),
  sales: z.number().describe('The amount of the product sold during the inventory session.'),
  purchases: z.number().describe('The amount of the product purchased during the inventory session.'),
  startStock: z.string().describe('The starting stock level of the product.'),
});
export type AnalyzeInventoryVarianceInput = z.infer<typeof AnalyzeInventoryVarianceInputSchema>;

const AnalyzeInventoryVarianceOutputSchema = z.object({
  analysis: z.string().describe('An analysis of potential causes for the inventory variance.'),
});
export type AnalyzeInventoryVarianceOutput = z.infer<typeof AnalyzeInventoryVarianceOutputSchema>;


export async function runVarianceAnalysis(line: InventoryLine & { product?: Product }): Promise<ServerActionResponse<AnalyzeInventoryVarianceOutput>> {
  if (!line.product) {
    return { success: false, error: 'Данные о продукте отсутствуют для анализа.' };
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
    return { success: false, error: 'Неполные данные для анализа.' };
  }

  const input: AnalyzeInventoryVarianceInput = {
    productName: name,
    startStock: startStock.toString(),
    purchases: purchases,
    sales: sales * portionVolumeMl, 
    endStock: endStock,
    theoreticalEndStock: theoreticalEndStock,
  };

  try {
    const result = await analyzeInventoryVarianceFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in runVarianceAnalysis calling Genkit flow:', error);
    return { success: false, error: 'Сбой AI-анализа. Пожалуйста, проверьте свой API-ключ Gemini и повторите попытку.'};
  }
}

export async function createInventorySession({ barId, userId }: {barId: string, userId: string}): Promise<ServerActionResponse<{sessionId: string, isNew: boolean}>> {
  try {
    const { db } = initializeAdminApp();
    const inventoriesCollection = db.collection('bars').doc(barId).collection('inventorySessions');

    // Check for existing in-progress session
    const inProgressQuery = inventoriesCollection.where('status', '==', 'in_progress').limit(1);
    const inProgressSnapshot = await inProgressQuery.get();

    if (!inProgressSnapshot.empty) {
      const existingSessionId = inProgressSnapshot.docs[0].id;
      return { success: true, data: { sessionId: existingSessionId, isNew: false } };
    }

    // Create a new session
    const newSessionRef = inventoriesCollection.doc();
    const newSessionData = {
        id: newSessionRef.id,
        barId: barId,
        name: `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,
        status: 'in_progress' as const,
        createdByUserId: userId,
        createdAt: FieldValue.serverTimestamp(),
        closedAt: null,
    };
    
    await newSessionRef.set(newSessionData);
    
    return { success: true, data: { sessionId: newSessionRef.id, isNew: true } };
  } catch (error) {
    console.error("Error in createInventorySession server action:", error);
    return { success: false, error: 'Произошла ошибка на сервере при создании инвентаризации.' };
  }
}

export async function deleteInventorySession({ barId, sessionId }: {barId: string, sessionId: string}): Promise<ServerActionResponse> {
    try {
        const { db } = initializeAdminApp();
        const sessionRef = db.collection('bars').doc(barId).collection('inventorySessions').doc(sessionId);
        const linesCollection = sessionRef.collection('lines');
        
        // Delete all line items in the inventory session first
        const linesSnapshot = await linesCollection.get();
        if (!linesSnapshot.empty) {
            const batch = db.batch();
            linesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        // Then delete the session document itself
        await sessionRef.delete();
        
        return { success: true };
    } catch (error) {
        console.error("Error in deleteInventorySession server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при удалении инвентаризации.' };
    }
}


// Server action to add a staff member
export async function addStaffMember({ barId, email, role }: {barId: string, email: string, role: 'manager' | 'bartender'}): Promise<ServerActionResponse> {
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
export async function removeStaffMember({ barId, userId }: {barId: string, userId: string}): Promise<ServerActionResponse> {
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

export async function upsertSupplier({ barId, supplier }: {barId: string, supplier: Supplier}): Promise<ServerActionResponse> {
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

export async function deleteSupplier({ barId, supplierId }: {barId: string, supplierId: string}): Promise<ServerActionResponse> {
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

export async function upsertPurchaseOrder(orderData: {barId: string} & Partial<PurchaseOrder>): Promise<ServerActionResponse<{id: string}>> {
    try {
        const { db } = initializeAdminApp();
        const { barId, id, ...rest } = orderData;
        const orderRef = id 
            ? db.collection('bars').doc(barId).collection('purchaseOrders').doc(id)
            : db.collection('bars').doc(barId).collection('purchaseOrders').doc();


        const dataToSet: any = {
            ...rest,
            id: orderRef.id,
            barId: barId,
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docSnap = await orderRef.get();
        if (!docSnap.exists) {
            dataToSet.createdAt = FieldValue.serverTimestamp();
        }

        await orderRef.set(dataToSet, { merge: true });

        return { success: true, data: {id: orderRef.id} };
    } catch (error) {
        console.error("Error in upsertPurchaseOrder server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при сохранении заказа.' };
    }
}

export async function deletePurchaseOrder({ barId, orderId }: {barId: string, orderId: string}): Promise<ServerActionResponse> {
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

export async function addPurchaseOrderLine({ barId, orderId, product }: {barId: string, orderId: string, product: Product}): Promise<ServerActionResponse<{id: string}>> {
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
        return { success: true, data: {id: newLineRef.id} };
    } catch (error) {
        console.error("Error in addPurchaseOrderLine server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}

export async function updatePurchaseOrderLines({ barId, orderId, lines }: {barId: string, orderId: string, lines: PurchaseOrderLine[]}): Promise<ServerActionResponse> {
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

export async function deletePurchaseOrderLine({ barId, orderId, lineId }: {barId: string, orderId: string, lineId: string}): Promise<ServerActionResponse> {
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


export async function saveInventoryLines({ barId, sessionId, lines }: {barId: string, sessionId: string, lines: InventoryLine[]}): Promise<ServerActionResponse> {
    try {
        const { db } = initializeAdminApp();
        const batch = db.batch();
        const productsCollection = db.collection('products');
        const linesCollection = db.collection('bars').doc(barId).collection('inventorySessions').doc(sessionId).collection('lines');
        
        // Fetch all necessary products in one go
        const productIds = lines.map(line => line.productId);
        if (productIds.length === 0) {
            return { success: true }; // No lines to save
        }
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

export async function completeInventorySession({ barId, sessionId }: {barId: string, sessionId: string}): Promise<ServerActionResponse> {
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
        return { success: false, error: 'Произошла ошибка на сервере при завершении инвентаризации.' };
    }
}

export async function addProductToSession({ barId, sessionId, productId }: {barId: string, sessionId: string, productId: string}): Promise<ServerActionResponse<{id: string}>> {
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

        return { success: true, data: {id: newLineRef.id} };
    } catch (error) {
        console.error("Error in addProductToSession server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}


export async function upsertProduct(productData: Partial<Product>): Promise<ServerActionResponse<{id: string}>> {
  try {
    const { db } = initializeAdminApp();
    const productsCollection = db.collection('products');
    
    let productId = productData.id;
    
    if (productId) {
      // Update
      const productRef = productsCollection.doc(productId);
      await productRef.set({ ...productData, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { success: true, data: {id: productId }};
    } else {
      // Create
      const newProductRef = productsCollection.doc();
      const newProduct = {
        ...productData,
        id: newProductRef.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await newProductRef.set(newProduct);
      return { success: true, data: { id: newProductRef.id } };
    }
  } catch (error) {
    console.error("Error in upsertProduct server action:", error);
    return { success: false, error: 'Произошла ошибка на сервере при сохранении продукта.' };
  }
}

export async function archiveProduct({ productId, archive }: { productId: string, archive: boolean }): Promise<ServerActionResponse> {
    try {
        const { db } = initializeAdminApp();
        const productRef = db.collection('products').doc(productId);
        await productRef.update({ isActive: !archive });
        return { success: true };
    } catch (error) {
        console.error("Error in archiveProduct server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере.' };
    }
}


export async function createPurchaseOrderFromReport({ barId, userId, lines, products }: {barId: string, userId: string, lines: InventoryLine[], products: Product[]}): Promise<ServerActionResponse<{orderIds: string[]}>> {
    try {
        const { db } = initializeAdminApp();
        const ordersToCreate = new Map<string, { product: Product, quantity: number }[]>();

        // Group products by supplier
        for (const line of lines) {
            const product = products.find(p => p.id === line.productId);
            if (product && product.reorderPointMl !== undefined && product.reorderQuantity !== undefined && product.defaultSupplierId) {
                const calculated = calculateLineFields(line, product);
                if (calculated.endStock < product.reorderPointMl) {
                    if (!ordersToCreate.has(product.defaultSupplierId)) {
                        ordersToCreate.set(product.defaultSupplierId, []);
                    }
                    ordersToCreate.get(product.defaultSupplierId)?.push({ product, quantity: product.reorderQuantity });
                }
            }
        }
        
        if (ordersToCreate.size === 0) {
            return { success: true, data: { orderIds: [] } };
        }

        const batch = db.batch();
        const orderIds: string[] = [];
        const purchaseOrdersCol = db.collection('bars').doc(barId).collection('purchaseOrders');

        for (const [supplierId, items] of ordersToCreate.entries()) {
            const orderRef = purchaseOrdersCol.doc();
            orderIds.push(orderRef.id);

            const newOrder: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
                barId,
                supplierId,
                status: 'draft',
                orderDate: new Date() as any, // Will be converted by Timestamp
                createdByUserId: userId,
            };
            batch.set(orderRef, {
                ...newOrder,
                id: orderRef.id,
                createdAt: FieldValue.serverTimestamp(),
                orderDate: FieldValue.serverTimestamp(), // Use server time for consistency
            });

            const linesCol = orderRef.collection('lines');
            for (const { product, quantity } of items) {
                const lineRef = linesCol.doc();
                const newLine: Omit<PurchaseOrderLine, 'id'> = {
                    purchaseOrderId: orderRef.id,
                    productId: product.id,
                    quantity: quantity,
                    costPerItem: product.costPerBottle,
                    receivedQuantity: 0,
                };
                batch.set(lineRef, {...newLine, id: lineRef.id});
            }
        }
        
        await batch.commit();

        return { success: true, data: { orderIds } };
    } catch (error) {
        console.error("Error in createPurchaseOrderFromReport server action:", error);
        return { success: false, error: 'Произошла ошибка на сервере при создании заказа на закупку.' };
    }
}
