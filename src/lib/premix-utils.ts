import type { Product, PremixIngredient } from '@/lib/types';

/**
 * Рассчитывает стоимость примикса на основе суммы ингредиентов.
 * 
 * Для каждого ингредиента: стоимость = (стоимость за бутылку / объем бутылки) * объем ингредиента
 * Общая стоимость = сумма стоимостей всех ингредиентов
 * 
 * @param premix - Примикс для расчета стоимости (должен иметь isPremix: true и premixIngredients)
 * @param ingredientProducts - Map продуктов-ингредиентов (key: productId, value: Product)
 * @returns Рассчитанная стоимость примикса за бутылку в рублях. 
 *          Если premix не является примиксом, возвращает costPerBottle.
 *          Если ингредиент не найден, его стоимость не учитывается.
 * 
 * @example
 * ```ts
 * const premix = { isPremix: true, premixIngredients: [
 *   { productId: 'ing1', volumeMl: 600 },
 *   { productId: 'ing2', volumeMl: 400 }
 * ], ... };
 * const ingredients = new Map([
 *   ['ing1', { costPerBottle: 1000, bottleVolumeMl: 700, ... }],
 *   ['ing2', { costPerBottle: 500, bottleVolumeMl: 500, ... }]
 * ]);
 * const cost = calculatePremixCost(premix, ingredients);
 * // Result: 1257.14 (857.14 + 400)
 * ```
 */
export function calculatePremixCost(
  premix: Product,
  ingredientProducts: Map<string, Product>
): number {
  if (!premix.isPremix || !premix.premixIngredients) {
    return premix.costPerBottle ?? 0; // Вернуть текущую стоимость если не примикс
  }

  return premix.premixIngredients.reduce((total, ingredient) => {
    const product = ingredientProducts.get(ingredient.productId);
    if (!product) {
      console.warn(`Product not found for ingredient ${ingredient.productId}`);
      return total;
    }
    
    // Стоимость ингредиента = (стоимость за бутылку / объем бутылки) * объем ингредиента
    if (product.bottleVolumeMl <= 0) {
      console.warn(`Invalid bottle volume for product ${product.id}`);
      return total;
    }
    
    const costPerMl = (product.costPerBottle ?? 0) / product.bottleVolumeMl;
    return total + (costPerMl * ingredient.volumeMl);
  }, 0);
}

/**
 * Рассчитывает объем каждого ингредиента на основе фактического объема примикса.
 * Пропорционально разлагает объем примикса на ингредиенты.
 * 
 * Formula: ingredientVolume = (premixVolumeMl / premix.bottleVolumeMl) * ingredient.volumeMl
 * 
 * @param premix - Примикс для разложения (должен иметь isPremix: true и premixIngredients)
 * @param premixVolumeMl - Фактический объем примикса в миллилитрах
 * @returns Массив объектов с productId и volumeMl для каждого ингредиента
 * @throws Error если premix не является примиксом или имеет невалидный bottleVolumeMl
 * 
 * @example
 * ```ts
 * const premix = { isPremix: true, bottleVolumeMl: 1000, premixIngredients: [
 *   { productId: 'ing1', volumeMl: 600 },
 *   { productId: 'ing2', volumeMl: 400 }
 * ], ... };
 * const ingredients = expandPremixToIngredients(premix, 500); // Half bottle
 * // Result: [{ productId: 'ing1', volumeMl: 300 }, { productId: 'ing2', volumeMl: 200 }]
 * ```
 */
export function expandPremixToIngredients(
  premix: Product,
  premixVolumeMl: number
): Array<{ productId: string; volumeMl: number }> {
  if (!premix.isPremix || !premix.premixIngredients) {
    throw new Error('Product is not a premix');
  }

  if (premix.bottleVolumeMl <= 0) {
    throw new Error('Invalid bottle volume for premix');
  }

  // Пропорционально разложить объем примикса на ингредиенты
  const ratio = premixVolumeMl / premix.bottleVolumeMl;
  
  return premix.premixIngredients.map(ingredient => ({
    productId: ingredient.productId,
    volumeMl: Math.round(ingredient.volumeMl * ratio),
  }));
}

