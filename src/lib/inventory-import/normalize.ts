/**
 * Единые правила нормализации для матчинга и отпечатка списка.
 */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/,/g, '.')
    .replace(/[^\p{L}\p{N}\s.%/+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function rowFingerprintKey(row: {
  code: string;
  barcode: string;
  name: string;
}): string {
  const code = normalizeForMatch(row.code).replace(/\s/g, '');
  const barcode = normalizeForMatch(row.barcode).replace(/\s/g, '');
  const name = normalizeForMatch(row.name);
  if (barcode.length > 4) return `b:${barcode}`;
  if (code.length > 0) return `c:${code}|${name}`;
  return `n:${name}`;
}

/**
 * Извлекает литраж из текстовой части названия («0,75л», «0.7 л», «700 мл»).
 */
export function parseVolumeMlFromText(text: string): number | undefined {
  const t = normalizeForMatch(text).replace(/\s+/g, ' ');
  const mlMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:мл|ml)\b/i);
  if (mlMatch) return Math.round(Number(mlMatch[1]));
  const lMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:л|l)\b/i);
  if (lMatch) return Math.round(Number(lMatch[1]) * 1000);
  return undefined;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array<number>(b.length + 1);
  const v1 = new Array<number>(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v0[b.length];
}
