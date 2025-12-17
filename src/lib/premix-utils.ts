import type { Product, PremixIngredient } from '@/lib/types';

/**
 * Рассчитывает стоимость примикса на основе суммы ингредиентов.
 * Для каждого ингредиента: (стоимость за бутылку / объем бутылки) * объем ингредиента
 * 
 * @param premix - Примикс для расчета стоимости
 * @param ingredientProducts - Map продуктов-ингредиентов (key: productId, value: Product)
 * @returns Рассчитанная стоимость примикса за бутылку
 */
export function calculatePremixCost(
  premix: Product,
  ingredientProducts: Map<string, Product>
): number {
  if (!premix.isPremix || !premix.premixIngredients) {
    return premix.costPerBottle; // Вернуть текущую стоимость если не примикс
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
    
    const costPerMl = product.costPerBottle / product.bottleVolumeMl;
    return total + (costPerMl * ingredient.volumeMl);
  }, 0);
}

/**
 * Рассчитывает объем каждого ингредиента на основе объема примикса.
 * Пропорционально разлагает объем примикса на ингредиенты.
 * 
 * @param premix - Примикс для разложения
 * @param premixVolumeMl - Фактический объем примикса в мл
 * @returns Массив с productId и volumeMl для каждого ингредиента
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

