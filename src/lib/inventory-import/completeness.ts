import type { Product } from '@/lib/types';

/**
 * Для UI: зелёная карточка / готов к калькулятору.
 * Позиции «только штуки» (usesVolumeCalculator=false) считаются заполненными без весов.
 */
export function isProductCardComplete(
  product: Pick<
    Product,
    | 'usesVolumeCalculator'
    | 'isPremix'
    | 'category'
    | 'bottleVolumeMl'
    | 'fullBottleWeightG'
    | 'emptyBottleWeightG'
    | 'premixIngredients'
  >
): boolean {
  const isPremix = product.isPremix === true || product.category === 'Premix';
  const usesCalc = product.usesVolumeCalculator ?? true;

  if (isPremix) {
    const hasIngredients = (product.premixIngredients?.length ?? 0) > 0;
    const hasBottle = Number(product.bottleVolumeMl) > 0;
    if (!hasIngredients || !hasBottle) return false;
    if (!usesCalc) return true;
    const fw = product.fullBottleWeightG;
    const ew = product.emptyBottleWeightG;
    return (
      typeof fw === 'number' &&
      typeof ew === 'number' &&
      Number.isFinite(fw) &&
      Number.isFinite(ew) &&
      fw > ew
    );
  }

  if (!usesCalc) return true;

  const bv = Number(product.bottleVolumeMl);
  const fw = product.fullBottleWeightG;
  const ew = product.emptyBottleWeightG;
  return (
    bv > 0 &&
    typeof fw === 'number' &&
    typeof ew === 'number' &&
    Number.isFinite(fw) &&
    Number.isFinite(ew) &&
    fw > ew
  );
}
