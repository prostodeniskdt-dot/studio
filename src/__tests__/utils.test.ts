import { dedupeProductsByName } from '@/lib/utils';
import type { Product } from '@/lib/types';

describe('dedupeProductsByName', () => {
  const createProduct = (name: string, volume: number, isActive = true, updatedAt?: Date): Product => ({
    id: `prod_${name}_${volume}`,
    name,
    category: 'Whiskey',
    costPerBottle: 2000,
    sellingPricePerPortion: 400,
    portionVolumeMl: 40,
    bottleVolumeMl: volume,
    isActive,
    updatedAt: updatedAt ? { toDate: () => updatedAt, toMillis: () => updatedAt.getTime() } as any : undefined,
  });

  it('should remove duplicates with same name and volume', () => {
    const products = [
      createProduct('Jameson', 700),
      createProduct('Jameson', 700),
      createProduct('Jack Daniels', 750),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['Jameson', 'Jack Daniels']);
  });

  it('should keep products with different volumes', () => {
    const products = [
      createProduct('Jameson', 700),
      createProduct('Jameson', 750),
      createProduct('Jameson', 1000),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(3);
  });

  it('should prefer active products over inactive', () => {
    const products = [
      createProduct('Jameson', 700, false),
      createProduct('Jameson', 700, true),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });

  it('should prefer more recently updated product', () => {
    const oldDate = new Date('2024-01-01');
    const newDate = new Date('2024-12-01');

    const products = [
      createProduct('Jameson', 700, true, oldDate),
      createProduct('Jameson', 700, true, newDate),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(1);
    expect(result[0].updatedAt?.toMillis()).toBe(newDate.getTime());
  });

  it('should handle case-insensitive matching', () => {
    const products = [
      createProduct('jameson', 700),
      createProduct('JAMESON', 700),
      createProduct('Jameson', 700),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const result = dedupeProductsByName([]);
    expect(result).toHaveLength(0);
  });

  it('should handle single product', () => {
    const products = [createProduct('Jameson', 700)];
    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jameson');
  });

  it('should normalize whitespace', () => {
    const products = [
      createProduct('Jameson', 700),
      createProduct('  Jameson  ', 700),
      createProduct('Jameson\n', 700),
    ];

    const result = dedupeProductsByName(products);
    expect(result).toHaveLength(1);
  });
});

