import { calculatePremixCost, expandPremixToIngredients } from '@/lib/premix-utils';
import type { Product, PremixIngredient } from '@/lib/types';

describe('premix-utils', () => {
  const mockIngredient1: Product = {
    id: 'ing1',
    name: 'Ingredient 1',
    category: 'Vodka',
    costPerBottle: 1000,
    sellingPricePerPortion: 200,
    portionVolumeMl: 50,
    bottleVolumeMl: 700,
    isActive: true,
  };

  const mockIngredient2: Product = {
    id: 'ing2',
    name: 'Ingredient 2',
    category: 'Syrup',
    costPerBottle: 500,
    sellingPricePerPortion: 100,
    portionVolumeMl: 30,
    bottleVolumeMl: 500,
    isActive: true,
  };

  const mockPremix: Product = {
    id: 'premix1',
    name: 'Test Premix',
    category: 'Premix',
    costPerBottle: 0, // Will be calculated
    sellingPricePerPortion: 300,
    portionVolumeMl: 100,
    bottleVolumeMl: 1000,
    isPremix: true,
    premixIngredients: [
      {
        productId: 'ing1',
        volumeMl: 600,
        ratio: 0.6,
      },
      {
        productId: 'ing2',
        volumeMl: 400,
        ratio: 0.4,
      },
    ] as PremixIngredient[],
    barId: 'bar_test',
    costCalculationMode: 'auto',
    isActive: true,
  };

  describe('calculatePremixCost', () => {
    it('should calculate cost correctly for premix', () => {
      const ingredientMap = new Map<string, Product>();
      ingredientMap.set('ing1', mockIngredient1);
      ingredientMap.set('ing2', mockIngredient2);

      const result = calculatePremixCost(mockPremix, ingredientMap);

      // ing1: (1000 / 700) * 600 ≈ 857.14
      // ing2: (500 / 500) * 400 = 400
      // total ≈ 1257.14
      expect(result).toBeCloseTo(1257.14, 2);
    });

    it('should return existing costPerBottle if not a premix', () => {
      const nonPremix: Product = {
        ...mockPremix,
        isPremix: false,
        premixIngredients: undefined,
        costPerBottle: 1500,
      };

      const ingredientMap = new Map<string, Product>();
      const result = calculatePremixCost(nonPremix, ingredientMap);

      expect(result).toBe(1500);
    });

    it('should handle missing ingredients gracefully', () => {
      const ingredientMap = new Map<string, Product>();
      ingredientMap.set('ing1', mockIngredient1);
      // ing2 is missing

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = calculatePremixCost(mockPremix, ingredientMap);

      // Should only calculate cost for ing1
      expect(result).toBeCloseTo(857.14, 2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Product not found for ingredient ing2')
      );
      consoleSpy.mockRestore();
    });

    it('should handle zero bottle volume in ingredient', () => {
      const ingredientWithZeroVolume: Product = {
        ...mockIngredient1,
        bottleVolumeMl: 0,
      };

      const ingredientMap = new Map<string, Product>();
      ingredientMap.set('ing1', ingredientWithZeroVolume);
      ingredientMap.set('ing2', mockIngredient2);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = calculatePremixCost(mockPremix, ingredientMap);

      // Should only calculate cost for ing2
      expect(result).toBeCloseTo(400, 2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid bottle volume')
      );
      consoleSpy.mockRestore();
    });

    it('should handle empty ingredients array', () => {
      const premixWithNoIngredients: Product = {
        ...mockPremix,
        premixIngredients: [],
      };

      const ingredientMap = new Map<string, Product>();
      const result = calculatePremixCost(premixWithNoIngredients, ingredientMap);

      expect(result).toBe(0);
    });

    it('should handle missing premixIngredients', () => {
      const premixWithoutIngredients: Product = {
        ...mockPremix,
        premixIngredients: undefined,
      };

      const ingredientMap = new Map<string, Product>();
      const result = calculatePremixCost(premixWithoutIngredients, ingredientMap);

      expect(result).toBe(0); // Returns costPerBottle which is 0
    });
  });

  describe('expandPremixToIngredients', () => {
    it('should expand premix to ingredients correctly', () => {
      const result = expandPremixToIngredients(mockPremix, 500); // Half bottle

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        productId: 'ing1',
        volumeMl: 300, // 600 * 0.5 = 300
      });
      expect(result[1]).toEqual({
        productId: 'ing2',
        volumeMl: 200, // 400 * 0.5 = 200
      });
    });

    it('should handle full bottle volume', () => {
      const result = expandPremixToIngredients(mockPremix, 1000); // Full bottle

      expect(result[0].volumeMl).toBe(600);
      expect(result[1].volumeMl).toBe(400);
    });

    it('should round volumes correctly', () => {
      const result = expandPremixToIngredients(mockPremix, 333); // One third

      // 600 * (333/1000) = 199.8 ≈ 200
      // 400 * (333/1000) = 133.2 ≈ 133
      expect(result[0].volumeMl).toBe(200);
      expect(result[1].volumeMl).toBe(133);
    });

    it('should throw error if product is not a premix', () => {
      const nonPremix: Product = {
        ...mockPremix,
        isPremix: false,
        premixIngredients: undefined,
      };

      expect(() => expandPremixToIngredients(nonPremix, 500)).toThrow(
        'Product is not a premix'
      );
    });

    it('should throw error if premixIngredients is missing', () => {
      const premixWithoutIngredients: Product = {
        ...mockPremix,
        premixIngredients: undefined,
      };

      expect(() => expandPremixToIngredients(premixWithoutIngredients, 500)).toThrow(
        'Product is not a premix'
      );
    });

    it('should throw error if bottle volume is invalid', () => {
      const premixWithInvalidVolume: Product = {
        ...mockPremix,
        bottleVolumeMl: 0,
      };

      expect(() => expandPremixToIngredients(premixWithInvalidVolume, 500)).toThrow(
        'Invalid bottle volume for premix'
      });
    });

    it('should handle zero volume', () => {
      const result = expandPremixToIngredients(mockPremix, 0);

      expect(result[0].volumeMl).toBe(0);
      expect(result[1].volumeMl).toBe(0);
    });

    it('should handle volume larger than bottle volume', () => {
      const result = expandPremixToIngredients(mockPremix, 2000); // Double bottle

      expect(result[0].volumeMl).toBe(1200); // 600 * 2
      expect(result[1].volumeMl).toBe(800); // 400 * 2
    });
  });
});

