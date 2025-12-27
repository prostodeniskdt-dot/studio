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
  'Premix',
  'Other',
]);

export const premixIngredientSchema = z.object({
  productId: z.string().min(1, 'ID продукта обязателен'),
  volumeMl: z.number().positive('Объем должен быть положительным'),
  ratio: z.number().min(0).max(1, 'Доля должна быть от 0 до 1'),
});

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Название продукта обязательно'),
  category: productCategorySchema,
  subCategory: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  
  // Экономика (опциональные поля для обратной совместимости)
  costPerBottle: z.number().min(0, 'Стоимость не может быть отрицательной').optional(),
  sellingPricePerPortion: z.number().min(0, 'Цена продажи не может быть отрицательной').optional(),
  portionVolumeMl: z.number().positive('Объем порции должен быть положительным').optional(),
  
  // Профиль бутылки
  bottleVolumeMl: z.number().positive('Объем бутылки должен быть положительным'),
  fullBottleWeightG: z.number().positive().optional(),
  emptyBottleWeightG: z.number().positive().optional(),
  fullLiquidHeightCm: z.number().positive().optional(), // Реальная высота жидкости в полной бутылке (для калибровки)

  // Закупки
  reorderPointMl: z.number().min(0).optional(),
  reorderQuantity: z.number().positive().optional(),
  defaultSupplierId: z.string().optional(),

  // Примиксы
  isPremix: z.boolean().optional(),
  premixIngredients: z.array(premixIngredientSchema).optional(),
  barId: z.string().optional(),
  costCalculationMode: z.enum(['auto', 'manual']).optional(),
  
  // Библиотека и владение
  isInLibrary: z.boolean().optional(),
  createdByUserId: z.string().optional(),

  isActive: z.boolean(),
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
}).refine(
  (data) => {
    const isPremix = data.category === 'Premix' || data.isPremix === true;
    
    // barId и isInLibrary взаимоисключающие
    if (data.barId && data.isInLibrary === true) {
      return false;
    }
    
    // Если это примикс
    if (isPremix) {
      // premixIngredients обязателен и не пустой
      if (!data.premixIngredients || data.premixIngredients.length === 0) {
        return false;
      }
      // Сумма объемов ингредиентов не должна превышать объем бутылки
      const totalVolume = data.premixIngredients.reduce((sum, ing) => sum + ing.volumeMl, 0);
      if (totalVolume > data.bottleVolumeMl) {
        return false;
      }
      // isPremix должен быть true
      if (data.isPremix !== true) {
        return false;
      }
    }
    
    return true;
  },
  {
    message: "Примикс должен иметь ингредиенты, сумма объемов ингредиентов не должна превышать объем бутылки. barId и isInLibrary не могут быть установлены одновременно.",
  }
);

export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;

