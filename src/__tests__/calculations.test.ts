import {
  calculateTheoreticalEndStock,
  calculateDifferenceVolume,
  calculateDifferenceMoney,
  calculateDifferencePercent,
  calculateLineFields,
} from '@/lib/calculations';
import type { InventoryLine, Product } from '@/lib/types';

describe('calculations', () => {
  const mockProduct: Product = {
    id: 'prod1',
    name: 'Test Product',
    category: 'Whiskey',
    costPerBottle: 2000,
    sellingPricePerPortion: 400,
    portionVolumeMl: 40,
    bottleVolumeMl: 700,
    fullBottleWeightG: 1150,
    emptyBottleWeightG: 450,
    isActive: true,
  };

  describe('calculateTheoreticalEndStock', () => {
    it('should calculate theoretical end stock correctly', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
      };

      const result = calculateTheoreticalEndStock(line, mockProduct);
      // 1000 + 500 - (10 * 40) = 1100
      expect(result).toBe(1100);
    });

    it('should handle zero values', () => {
      const line: Partial<InventoryLine> = {
        startStock: 0,
        purchases: 0,
        sales: 0,
      };

      const result = calculateTheoreticalEndStock(line, mockProduct);
      expect(result).toBe(0);
    });

    it('should handle missing product', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
      };

      const result = calculateTheoreticalEndStock(line, null as any);
      expect(result).toBe(0);
    });
  });

  describe('calculateDifferenceVolume', () => {
    it('should calculate positive difference (surplus)', () => {
      const result = calculateDifferenceVolume(1200, 1100);
      expect(result).toBe(100);
    });

    it('should calculate negative difference (loss)', () => {
      const result = calculateDifferenceVolume(1000, 1100);
      expect(result).toBe(-100);
    });

    it('should return zero when values match', () => {
      const result = calculateDifferenceVolume(1100, 1100);
      expect(result).toBe(0);
    });
  });

  describe('calculateDifferenceMoney', () => {
    it('should calculate monetary difference correctly', () => {
      // costPerBottle: 2000, bottleVolumeMl: 700
      // costPerMl = 2000 / 700 ≈ 2.857
      // differenceVolume: 100ml
      // differenceMoney = 100 * 2.857 ≈ 285.7
      const result = calculateDifferenceMoney(100, mockProduct);
      expect(result).toBeCloseTo(285.71, 2);
    });

    it('should handle zero difference', () => {
      const result = calculateDifferenceMoney(0, mockProduct);
      expect(result).toBe(0);
    });

    it('should handle negative difference', () => {
      const result = calculateDifferenceMoney(-100, mockProduct);
      expect(result).toBeCloseTo(-285.71, 2);
    });

    it('should handle zero bottle volume', () => {
      const productWithZeroVolume = { ...mockProduct, bottleVolumeMl: 0 };
      const result = calculateDifferenceMoney(100, productWithZeroVolume);
      expect(result).toBe(0);
    });
  });

  describe('calculateDifferencePercent', () => {
    it('should calculate percentage correctly', () => {
      const line: Partial<InventoryLine> = {
        sales: 10, // 10 * 40ml = 400ml sold
      };
      // differenceVolume: 100ml, volumeSold: 400ml
      // percentage = (100 / 400) * 100 = 25%
      const result = calculateDifferencePercent(100, line, mockProduct);
      expect(result).toBe(25);
    });

    it('should return 0 when no sales and no difference', () => {
      const line: Partial<InventoryLine> = {
        sales: 0,
      };
      const result = calculateDifferencePercent(0, line, mockProduct);
      expect(result).toBe(0);
    });

    it('should return 0 when no sales but has difference', () => {
      const line: Partial<InventoryLine> = {
        sales: 0,
      };
      const result = calculateDifferencePercent(100, line, mockProduct);
      expect(result).toBe(0);
    });

    it('should handle negative percentage (loss)', () => {
      const line: Partial<InventoryLine> = {
        sales: 10,
      };
      const result = calculateDifferencePercent(-100, line, mockProduct);
      expect(result).toBe(-25);
    });
  });

  describe('calculateLineFields', () => {
    it('should calculate all fields correctly', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
        endStock: 1100,
      };

      const result = calculateLineFields(line, mockProduct);

      expect(result.theoreticalEndStock).toBe(1100);
      expect(result.differenceVolume).toBe(0);
      expect(result.differenceMoney).toBeCloseTo(0, 2);
      expect(result.differencePercent).toBe(0);
    });

    it('should handle loss scenario', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
        endStock: 1000, // Actual is less than theoretical (1100)
      };

      const result = calculateLineFields(line, mockProduct);

      expect(result.theoreticalEndStock).toBe(1100);
      expect(result.differenceVolume).toBe(-100);
      expect(result.differenceMoney).toBeLessThan(0);
      expect(result.differencePercent).toBeLessThan(0);
    });

    it('should handle surplus scenario', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
        endStock: 1200, // Actual is more than theoretical (1100)
      };

      const result = calculateLineFields(line, mockProduct);

      expect(result.theoreticalEndStock).toBe(1100);
      expect(result.differenceVolume).toBe(100);
      expect(result.differenceMoney).toBeGreaterThan(0);
      expect(result.differencePercent).toBeGreaterThan(0);
    });

    it('should use default values for missing fields', () => {
      const line: Partial<InventoryLine> = {};

      const result = calculateLineFields(line, mockProduct);

      expect(result.theoreticalEndStock).toBe(0);
      expect(result.differenceVolume).toBe(0);
      expect(result.differenceMoney).toBe(0);
      expect(result.differencePercent).toBe(0);
    });

    it('should handle very large numbers', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000000,
        purchases: 500000,
        sales: 10000,
        endStock: 1100000,
      };

      const result = calculateLineFields(line, mockProduct);
      expect(result.theoreticalEndStock).toBe(1100000);
      expect(result.differenceVolume).toBe(0);
    });

    it('should handle negative start stock (edge case)', () => {
      const line: Partial<InventoryLine> = {
        startStock: -100,
        purchases: 500,
        sales: 10,
        endStock: 0,
      };

      const result = calculateLineFields(line, mockProduct);
      expect(result.theoreticalEndStock).toBe(0); // -100 + 500 - 400 = 0
      expect(result.differenceVolume).toBe(0);
    });

    it('should handle missing portionVolumeMl in product', () => {
      const productWithoutPortion: Product = {
        ...mockProduct,
        portionVolumeMl: 0,
      };
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
        endStock: 1500,
      };

      const result = calculateLineFields(line, productWithoutPortion);
      expect(result.theoreticalEndStock).toBe(1500); // No sales volume calculated
      expect(result.differencePercent).toBe(0); // Should return 0 when portionVolumeMl is 0
    });

    it('should handle missing costPerBottle in product', () => {
      const productWithoutCost: Product = {
        ...mockProduct,
        costPerBottle: 0,
      };
      const line: Partial<InventoryLine> = {
        startStock: 1000,
        purchases: 500,
        sales: 10,
        endStock: 1000,
      };

      const result = calculateLineFields(line, productWithoutCost);
      expect(result.differenceMoney).toBe(0); // Should return 0 when costPerBottle is 0
    });

    it('should handle very small differences (precision)', () => {
      const line: Partial<InventoryLine> = {
        startStock: 1000.001,
        purchases: 500.002,
        sales: 10,
        endStock: 1100.003,
      };

      const result = calculateLineFields(line, mockProduct);
      expect(result.theoreticalEndStock).toBeCloseTo(1100.003, 2);
    });
  });
});

