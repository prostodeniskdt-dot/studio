import type { BlankParsedRow } from './types';
import { normalizeForMatch, levenshtein } from './normalize';

export type ProductMatchCandidate = {
  id: string;
  name: string;
  barcode: string | null;
  externalCode: string | null;
  isPremix: boolean;
};

const BARCODE_THRESH = /^\d{8,}$/;

export function findBestProductMatch(
  row: BlankParsedRow,
  candidates: ProductMatchCandidate[],
  wantPremix: boolean
): { productId: string; score: number } | null {
  const pool = candidates.filter((p) => p.isPremix === wantPremix);
  if (pool.length === 0) return null;

  const rowBc = (row.barcode ?? '').replace(/\s/g, '');
  const rowCode = (row.code ?? '').replace(/\s/g, '');
  const rowName = normalizeForMatch(row.name);

  if (BARCODE_THRESH.test(rowBc)) {
    const hit = pool.find((p) => (p.barcode ?? '').replace(/\s/g, '') === rowBc);
    if (hit) return { productId: hit.id, score: 1000 };
  }

  if (rowCode.length > 0) {
    const hit = pool.find((p) => (p.externalCode ?? '').replace(/\s/g, '') === rowCode);
    if (hit) return { productId: hit.id, score: 980 };
  }

  let best: { productId: string; score: number } | null = null;
  for (const p of pool) {
    const pn = normalizeForMatch(p.name);
    if (!pn) continue;
    if (pn === rowName) {
      const s = 900;
      if (!best || s > best.score) best = { productId: p.id, score: s };
      continue;
    }
    const maxLen = Math.max(pn.length, rowName.length, 1);
    const dist = levenshtein(pn, rowName);
    const ratio = 1 - dist / maxLen;
    if (ratio < 0.75) continue;
    const score = 500 + Math.round(ratio * 300);
    if (!best || score > best.score) best = { productId: p.id, score };
  }

  if (best && best.score >= 770) return best;
  return null;
}
