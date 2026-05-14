import { z } from 'zod';

export const purchaseOrderStatusSchema = z.enum(['draft', 'ordered', 'received', 'cancelled']);

export const purchaseOrderLineSchema = z.object({
  id: z.string().min(1),
  purchaseOrderId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive('Количество должно быть положительным'),
  costPerItem: z.number().min(0, 'Стоимость не может быть отрицательной'),
  receivedQuantity: z.number().min(0),
});

export const purchaseOrderSchema = z.object({
  id: z.string().min(1),
  barId: z.string().min(1),
  supplierId: z.string().min(1),
  status: purchaseOrderStatusSchema,
  orderDate: z.any().optional(), // Firestore Timestamp
  createdAt: z.any(), // Firestore Timestamp
  createdByUserId: z.string().min(1),
});

export type PurchaseOrderInput = z.input<typeof purchaseOrderSchema>;
export type PurchaseOrderOutput = z.output<typeof purchaseOrderSchema>;
export type PurchaseOrderLineInput = z.input<typeof purchaseOrderLineSchema>;
export type PurchaseOrderLineOutput = z.output<typeof purchaseOrderLineSchema>;

