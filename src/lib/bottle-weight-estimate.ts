/**
 * В импорте из таблиц часто есть только масса тары и объём.
 * Для расчёта по весу нужны оба веса; оцениваем массу полной бутылки как тара + приблизительная масса жидкостей.
 * Коэффициент ~0,93 г/мл типичен для крепкого алкоголя (водка/виски~40%); при необходимости пользователь уточняет вес в карточке.
 */
export const APPROX_SPIRIT_LIQUID_MASS_G_PER_ML = 0.93;

export function estimateFullBottleWeightG(bottleVolumeMl: number, emptyBottleWeightG: number): number {
  return Math.round(emptyBottleWeightG + bottleVolumeMl * APPROX_SPIRIT_LIQUID_MASS_G_PER_ML);
}
