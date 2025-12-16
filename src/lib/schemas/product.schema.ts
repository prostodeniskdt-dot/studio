import { z } from 'zod';

export const productCategorySchema = z.enum([
  'Whiskey',
  'Rum',
  'Vodka',
  'Gin',
  'Tequila',
  'Liqueur',
  'Wine',
  'Beer',
  'Syrup',
  'Brandy',
  'Vermouth',
  'Absinthe',
  'Bitters',
  'Other',
]);

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Название продукта обязательно'),
  category: productCategorySchema,
  subCategory: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  
  // Экономика
  costPerBottle: z.number().min(0, 'Стоимость не может быть отрицательной'),
  sellingPricePerPortion: z.number().min(0, 'Цена продажи не может быть отрицательной'),
  portionVolumeMl: z.number().positive('Объем порции должен быть положительным'),
  
  // Профиль бутылки
  bottleVolumeMl: z.number().positive('Объем бутылки должен быть положительным'),
  fullBottleWeightG: z.number().positive().optional(),
  emptyBottleWeightG: z.number().positive().optional(),

  // Закупки
  reorderPointMl: z.number().min(0).optional(),
  reorderQuantity: z.number().positive().optional(),
  defaultSupplierId: z.string().optional(),

  isActive: z.boolean(),
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;

