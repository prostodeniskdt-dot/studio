import type { InventoryLine, Product, CalculatedInventoryLine } from '@/lib/types';

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
export function calculateDifferenceVolume(line: InventoryLine, theoreticalEndStock: number): number {
  return line.endStock - theoreticalEndStock;
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
  if (volumeSold === 0) return 0;
  return (differenceVolume / volumeSold) * 100;
}

/**
 * A wrapper function to perform all calculations for a given inventory line.
 */
export function calculateInventoryLine(line: InventoryLine, product: Product): CalculatedInventoryLine {
  const theoreticalEndStock = calculateTheoreticalEndStock(line, product);
  const differenceVolume = calculateDifferenceVolume(line, theoreticalEndStock);
  const differenceMoney = calculateDifferenceMoney(differenceVolume, product);
  const differencePercent = calculateDifferencePercent(differenceVolume, line, product);

  return {
    ...line,
    product,
    theoreticalEndStock,
    differenceVolume,
    differenceMoney,
    differencePercent,
  };
}
