import type { InventoryLine, Product } from '@/lib/types';

/**
 * Calculates the theoretical end stock in milliliters.
 */
export function calculateTheoreticalEndStock(line: Partial<InventoryLine>, product: Product): number {
  if (!product) return 0;
  const salesVolume = (line.sales || 0) * (product.portionVolumeMl || 0);
  return (line.startStock || 0) + (line.purchases || 0) - salesVolume;
}

/**
 * Calculates the difference in volume between actual and theoretical stock.
 * A negative value indicates a loss (shortage), a positive value indicates a surplus.
 */
export function calculateDifferenceVolume(endStock: number, theoreticalEndStock: number): number {
  return endStock - theoreticalEndStock;
}

/**
 * Calculates the monetary value of the variance.
 */
export function calculateDifferenceMoney(differenceVolume: number, product: Product): number {
  if (!product || !product.bottleVolumeMl || product.bottleVolumeMl === 0) return 0;
  const costPerMl = (product.costPerBottle || 0) / product.bottleVolumeMl;
  return differenceVolume * costPerMl;
}

/**
 * Calculates the percentage of variance relative to the total volume used.
 */
export function calculateDifferencePercent(differenceVolume: number, line: Partial<InventoryLine>, product: Product): number {
  if (!product || !product.portionVolumeMl) return 0;
  
  const volumeSold = (line.sales || 0) * product.portionVolumeMl;
  
  if (volumeSold === 0) {
      if (differenceVolume === 0) {
          return 0; // No sales, no difference -> 0%
      }
      // If there's a difference but no sales, we can't calculate a percentage of sales.
      // We could base it on startStock, but that can be misleading.
      // Returning 100% or -100% for any difference might be too extreme.
      // A safe fallback is to return 0 if no sales occurred.
      return 0;
  }
  
  return (differenceVolume / volumeSold) * 100;
}

/**
 * A wrapper function to perform all calculations for a given inventory line and returns the calculated fields.
 */
export function calculateLineFields(line: Partial<InventoryLine>, product: Product) {
  const safeLine = {
    startStock: 0,
    purchases: 0,
    sales: 0,
    endStock: 0,
    ...line,
  } as InventoryLine;

  const theoreticalEndStock = calculateTheoreticalEndStock(safeLine, product);
  const differenceVolume = calculateDifferenceVolume(safeLine.endStock, theoreticalEndStock);
  const differenceMoney = calculateDifferenceMoney(differenceVolume, product);
  const differencePercent = calculateDifferencePercent(differenceVolume, safeLine, product);

  return {
    theoreticalEndStock,
    differenceVolume,
    differenceMoney,
    differencePercent,
  };
}
