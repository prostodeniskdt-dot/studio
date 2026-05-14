import { z } from 'zod';

export const inventorySessionStatusSchema = z.enum(['draft', 'in_progress', 'completed']);

export const inventoryLineSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  inventorySessionId: z.string().min(1),
  
  // All volumes in ml
  startStock: z.number().min(0),
  purchases: z.number().min(0),
  endStock: z.number().min(0),
  
  // Sales in number of portions
  sales: z.number().min(0),

  // Calculated fields
  theoreticalEndStock: z.number(),
  differenceVolume: z.number(),
  differenceMoney: z.number(),
  differencePercent: z.number(),
});

export const inventorySessionSchema = z.object({
  id: z.string().min(1),
  barId: z.string().min(1),
  name: z.string().min(1, 'Название инвентаризации обязательно'),
  status: inventorySessionStatusSchema,
  createdByUserId: z.string().min(1),
  createdAt: z.any(), // Firestore Timestamp
  closedAt: z.any().optional(), // Firestore Timestamp
  lines: z.array(inventoryLineSchema).optional(),
});

export type InventorySessionInput = z.input<typeof inventorySessionSchema>;
export type InventorySessionOutput = z.output<typeof inventorySessionSchema>;
export type InventoryLineInput = z.input<typeof inventoryLineSchema>;
export type InventoryLineOutput = z.output<typeof inventoryLineSchema>;

