import type { BlankParsedRow } from './types';
import { normalizeForMatch } from './normalize';
import { splitDelimitedQuotedRow, type SessionDelimiter } from './split-quoted-row';

function parseNumberCell(s: string): number {
  const x = String(s)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/^−|^–/, '-');
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/** Первая строка похожа на заголовок: мало чисел, много текста. */
function rowLooksLikeHeader(cells: string[], minCols: number): boolean {
  if (cells.length < minCols) return true;
  let nums = 0;
  let text = 0;
  for (let i = 0; i < Math.min(cells.length, 6); i++) {
    const v = (cells[i] ?? '').trim();
    if (!v) continue;
    if (Number.isFinite(parseNumberCell(v))) nums++;
    else text++;
  }
  return text >= nums && text >= 1;
}

/**
 * Последний подходящий столбец с числом (справа налево), индекс >= startCol.
 */
function pickNumericColumn(cells: string[], startCol: number): { idx: number; val: number } | null {
  for (let j = cells.length - 1; j >= startCol; j--) {
    const n = parseNumberCell(cells[j] ?? '');
    if (Number.isFinite(n)) return { idx: j, val: n };
  }
  return null;
}

/**
 * Универсальная таблица «текст в первом столбце + число (остаток / количество) в одном из следующих».
 * Подхватывает выгрузки без наших точных заголовков или с лишними колонками.
 */
export function tryGenericInventoryRowsFromText(text: string): BlankParsedRow[] | null {
  const stripped = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const rawLines = stripped
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) return null;

  const delims: SessionDelimiter[] = [';', ',', '\t'];
  let best: BlankParsedRow[] | null = null;
  let bestLen = 0;

  for (const d of delims) {
    const matrix = rawLines.map((l) => splitDelimitedQuotedRow(l, d));
    const nonemptyCols = matrix.map((r) => r.filter((c) => c.trim().length > 0).length);
    const minCols = Math.min(...nonemptyCols);
    if (minCols < 2) continue;

    let dataStart = 0;
    if (matrix.length >= 2) {
      const r0 = matrix[0]!;
      const r1 = matrix[1]!;
      if (
        rowLooksLikeHeader(r0, 2) &&
        (pickNumericColumn(r1, 1) !== null ||
          matrix.slice(1, 5).some((row) => pickNumericColumn(row, 1) !== null))
      ) {
        dataStart = 1;
      }
    }

    const out: BlankParsedRow[] = [];
    for (let i = dataStart; i < matrix.length; i++) {
      const r = matrix[i]!;
      const name = (r[0] ?? '').trim();
      if (!name) continue;
      const lname = name.toLowerCase();
      if (lname === 'итого' || lname === 'всего') continue;
      if (/^группа\b/i.test(lname) && r.filter((c) => c.trim()).length < 3) continue;

      const picked = pickNumericColumn(r, 1);
      if (!picked) continue;
      let unitRaw = 'мл';
      const headerRow = dataStart > 0 ? matrix[0]! : null;
      const headerJoin = headerRow ? headerRow.join(' ').toLowerCase() : '';
      if (/\bшт\b|штук|pcs|piece/i.test(headerJoin)) {
        unitRaw = 'шт';
      } else if (/\bкг\b|\bkg\b/i.test(headerJoin)) {
        unitRaw = 'кг';
      } else if (/\bл\b|\bлитр|liter/i.test(headerJoin)) {
        unitRaw = 'л';
      }

      out.push({
        group: '',
        code: '',
        barcode: '',
        name,
        unitRaw,
        quantityFact: picked.val,
      });
    }

    if (out.length > bestLen) {
      bestLen = out.length;
      best = out;
    }
  }

  if (!best || best.length < 1) return null;

  const seen = new Set<string>();
  const deduped: BlankParsedRow[] = [];
  for (const r of best) {
    const k = normalizeForMatch(`${r.code}|${r.barcode}|${r.name}`).replace(/\s/g, '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }
  return deduped.length > 0 ? deduped : null;
}
