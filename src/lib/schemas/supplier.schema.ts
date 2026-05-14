import { z } from 'zod';

export const supplierSchema = z.object({
  id: z.string().min(1),
  barId: z.string().min(1),
  name: z.string().min(1, 'Название поставщика обязательно'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
});

export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierOutput = z.output<typeof supplierSchema>;

