import type { InventoryLine, Product } from '@/lib/types';

/**
 * Calculates the theoretical end stock in milliliters.
 * Handles edge cases: missing product, negative values, invalid data.
 */
export function calculateTheoreticalEndStock(line: Partial<InventoryLine>, product: Product): number {
  if (!product) return 0;
  
  // Safely parse numeric values, defaulting to 0 for invalid values
  const startStock = Math.max(0, Number(line.startStock) || 0);
  const purchases = Math.max(0, Number(line.purchases) || 0);
  const sales = Math.max(0, Number(line.sales) || 0);
  const portionVolumeMl = Math.max(0, Number(product.portionVolumeMl) || 0);
  
  const salesVolume = sales * portionVolumeMl;
  const theoretical = startStock + purchases - salesVolume;
  
  // Return 0 if calculation results in negative (edge case: more sales than stock)
  return Math.max(0, theoretical);
}

/**
 * Calculates the difference in volume between actual and theoretical stock.
 * 
 * @param endStock - Actual end stock in milliliters
 * @param theoreticalEndStock - Theoretical end stock in milliliters
 * @returns Difference in milliliters. Negative = loss, Positive = surplus, Zero = match
 * 
 * @example
 * ```ts
 * const diff = calculateDifferenceVolume(1000, 1100);
 * // Result: -100 (loss of 100ml)
 * ```
 */
export function calculateDifferenceVolume(endStock: number, theoreticalEndStock: number): number {
  return endStock - theoreticalEndStock;
}

/**
 * Calculates the monetary value of the variance.
 * 
 * Formula: differenceMoney = differenceVolume * (costPerBottle / bottleVolumeMl)
 * 
 * @param differenceVolume - Volume difference in milliliters
 * @param product - Product with costPerBottle and bottleVolumeMl
 * @returns Monetary value of the variance in rubles (0 if invalid product data)
 * 
 * @example
 * ```ts
 * const diff = calculateDifferenceMoney(-100, { costPerBottle: 2000, bottleVolumeMl: 700, ... });
 * // Result: -285.71 (loss of 285.71 rubles)
 * ```
 */
export function calculateDifferenceMoney(differenceVolume: number, product: Product): number {
  if (!product) return 0;
  
  const bottleVolumeMl = Number(product.bottleVolumeMl) || 0;
  const costPerBottle = Number(product.costPerBottle) || 0;
  
  // Edge case: division by zero or invalid volume
  if (bottleVolumeMl <= 0 || costPerBottle < 0) return 0;
  
  const costPerMl = costPerBottle / bottleVolumeMl;
  const result = differenceVolume * costPerMl;
  
  // Handle NaN and Infinity
  if (!isFinite(result)) return 0;
  
  return result;
}

/**
 * Calculates the percentage of variance relative to the total volume sold.
 * 
 * Formula: percentage = (differenceVolume / volumeSold) * 100
 * 
 * @param differenceVolume - Volume difference in milliliters
 * @param line - Inventory line with sales count
 * @param product - Product with portionVolumeMl
 * @returns Percentage of variance (0 if no sales occurred)
 * 
 * @example
 * ```ts
 * const line = { sales: 10 };
 * const product = { portionVolumeMl: 40, ... };
 * const percent = calculateDifferencePercent(-100, line, product);
 * // Result: -25% (100ml loss / 400ml sold)
 * ```
 */
export function calculateDifferencePercent(differenceVolume: number, line: Partial<InventoryLine>, product: Product): number {
  if (!product) return 0;
  
  const portionVolumeMl = Number(product.portionVolumeMl) || 0;
  const sales = Math.max(0, Number(line.sales) || 0);
  
  if (portionVolumeMl <= 0) return 0;
  
  const volumeSold = sales * portionVolumeMl;
  
  if (volumeSold === 0) {
      // Edge case: no sales
      if (differenceVolume === 0) {
          return 0; // No sales, no difference -> 0%
      }
      // If there's a difference but no sales, we can't calculate a percentage of sales.
      // Returning 0 is a safe fallback to avoid misleading percentages.
      return 0;
  }
  
  const percentage = (differenceVolume / volumeSold) * 100;
  
  // Handle NaN and Infinity
  if (!isFinite(percentage)) return 0;
  
  return percentage;
}

/**
 * Performs all calculations for an inventory line and returns all calculated fields.
 * 
 * This is a convenience function that calculates:
 * - theoreticalEndStock
 * - differenceVolume
 * - differenceMoney
 * - differencePercent
 * 
 * @param line - Partial inventory line with startStock, purchases, sales, endStock
 * @param product - Product with pricing and volume information
 * @returns Object containing all calculated fields
 * 
 * @example
 * ```ts
 * const line = { startStock: 1000, purchases: 500, sales: 10, endStock: 1000 };
 * const product = { costPerBottle: 2000, bottleVolumeMl: 700, portionVolumeMl: 40, ... };
 * const calculated = calculateLineFields(line, product);
 * // Returns: { theoreticalEndStock: 1100, differenceVolume: -100, differenceMoney: -285.71, differencePercent: -25 }
 * ```
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
