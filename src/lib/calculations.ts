import type { InventoryLine, Product } from '@/lib/types';

/**
 * Calculates the theoretical end stock in milliliters.
 */
export function calculateTheoreticalEndStock(line: InventoryLine, product: Product): number {
  if (!product) return 0;
  return line.startStock + line.purchases - (line.sales * product.portionVolumeMl);
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
  if (!product || product.bottleVolumeMl === 0) return 0;
  const costPerMl = product.costPerBottle / product.bottleVolumeMl;
  return differenceVolume * costPerMl;
}

/**
 * Calculates the percentage of variance relative to the total volume used.
 */
export function calculateDifferencePercent(differenceVolume: number, line: InventoryLine, product: Product): number {
  if (!product) return 0;
  const volumeSold = line.sales * product.portionVolumeMl;
  if (volumeSold === 0) {
      if (differenceVolume !== 0) {
          // Handle case where there are no sales, but there is a variance
          // (e.g., from starting stock vs. ending stock)
          // We can compare it to the starting stock
          if (line.startStock > 0) {
              return (differenceVolume / line.startStock) * 100;
          }
          return differenceVolume > 0 ? 100 : -100; // Or some other indicator of total loss/gain
      }
      return 0; // No sales and no difference
  }
  return (differenceVolume / volumeSold) * 100;
}

/**
 * A wrapper function to perform all calculations for a given inventory line and returns the calculated fields.
 */
export function calculateLineFields(line: InventoryLine, product: Product) {
  const theoreticalEndStock = calculateTheoreticalEndStock(line, product);
  const differenceVolume = calculateDifferenceVolume(line.endStock, theoreticalEndStock);
  const differenceMoney = calculateDifferenceMoney(differenceVolume, product);
  const differencePercent = calculateDifferencePercent(differenceVolume, line, product);

  return {
    theoreticalEndStock,
    differenceVolume,
    differenceMoney,
    differencePercent,
  };
}
