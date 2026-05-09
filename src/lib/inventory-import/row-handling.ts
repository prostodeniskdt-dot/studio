import type { BlankParsedRow } from './types';
import { normalizeForMatch, parseVolumeMlFromText } from './normalize';

export type ResolvedRowEconomics = {
  usesVolumeCalculator: boolean;
  stockMode: 'volume_ml' | 'pieces';
  endStock: number;
  defaultBottleMl: number;
};

export function resolveImportRowEconomics(row: BlankParsedRow): ResolvedRowEconomics {
  const u = normalizeForMatch(row.unitRaw);
  const qty = row.quantityFact ?? 0;

  if (/\b(шт|штук|штука|pcs?|piece)\b/.test(u) || u === 'шт') {
    return {
      usesVolumeCalculator: false,
      stockMode: 'pieces',
      endStock: qty,
      defaultBottleMl: 1,
    };
  }

  if (/\b(кг|kg|килограм)\b/.test(u)) {
    return {
      usesVolumeCalculator: false,
      stockMode: 'pieces',
      endStock: qty,
      defaultBottleMl: 1000,
    };
  }

  let endStock = qty;
  if (/\b(мл|ml)\b/.test(u)) {
    endStock = qty;
  } else {
    endStock = qty * 1000;
  }

  const fromName = parseVolumeMlFromText(row.name);
  const defaultBottleMl = fromName && fromName > 0 ? fromName : 700;

  return {
    usesVolumeCalculator: true,
    stockMode: 'volume_ml',
    endStock,
    defaultBottleMl,
  };
}
