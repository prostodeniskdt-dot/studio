import type { BlankParsedRow } from './types';
import { lineLooksLikeCompactAccountantHeader, parseBlankDelimitedLines } from './parse-delimited-text';
import { splitDelimitedQuotedRow, type SessionDelimiter } from './split-quoted-row';

export type ParsedSessionFile =
  | { kind: 'app_export'; bodyLines: string[]; delimiter: SessionDelimiter }
  | { kind: 'legacy_id'; bodyLines: string[]; delimiter: SessionDelimiter }
  | { kind: 'accountant_blank'; rows: BlankParsedRow[] }
  | { kind: 'unknown' };

export { splitDelimitedQuotedRow };
export type { SessionDelimiter };

function normalizeRawText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

const CUID_FIRST_CELL_RE = /^c[a-z0-9]{20,}$/i;

/** Угадываем разделитель по строке заголовка и первой строке данных (нужно ≥2 колонки). */
function guessSessionDelimiter(header: string, firstDataRow: string): SessionDelimiter {
  const options: SessionDelimiter[] = [';', ',', '\t'];
  let best: SessionDelimiter = ';';
  let bestMin = 0;
  for (const d of options) {
    const hCols = splitDelimitedQuotedRow(header, d).filter((x) => x.trim().length > 0).length;
    const dCols = splitDelimitedQuotedRow(firstDataRow, d).filter((x) => x.trim().length > 0).length;
    const m = Math.min(hCols, dCols);
    if (m >= 2 && m > bestMin) {
      bestMin = m;
      best = d;
    }
  }
  return best;
}

function looksLikeAppExportHeader(line: string): boolean {
  if (lineLooksLikeCompactAccountantHeader(line)) return false;
  const hl = line.toLowerCase().replace(/\s+/g, ' ');
  const hasName =
    hl.includes('наименование продукта') ||
    hl.includes('наименование') ||
    hl.includes('название');
  const hasQty =
    hl.includes('фактическ') ||
    hl.includes('остаток') ||
    hl.includes('количество') ||
    /\bкол[\s\-–]?во\b/i.test(hl);
  return hasName && hasQty;
}

function firstCellDelimited(rawLine: string, delimiter: SessionDelimiter): string {
  const cell = splitDelimitedQuotedRow(rawLine, delimiter)[0] ?? '';
  return cell.replace(/^"|"$/g, '').trim();
}

/** Технический CSV: строка данных начинается с product id (cuid). Разделитель — `,`, `;` или таб. */
function detectLegacyIdLayout(lines: string[]): { delimiter: SessionDelimiter } | null {
  if (lines.length < 2) return null;
  const headerLower = lines[0].toLowerCase();
  const headerHintsProductId = /\bproductid\b/i.test(headerLower);

  const delimiterForRow = (row: string): SessionDelimiter | null => {
    if (CUID_FIRST_CELL_RE.test(firstCellDelimited(row, ','))) return ',';
    if (CUID_FIRST_CELL_RE.test(firstCellDelimited(row, ';'))) return ';';
    if (CUID_FIRST_CELL_RE.test(firstCellDelimited(row, '\t'))) return '\t';
    return null;
  };

  const d0 = delimiterForRow(lines[1]);
  if (d0) return { delimiter: d0 };
  if (headerHintsProductId) {
    for (let i = 2; i < lines.length && i < 200; i++) {
      const d = delimiterForRow(lines[i]);
      if (d) return { delimiter: d };
    }
  }
  return null;
}

export function parseSessionImportText(text: string): ParsedSessionFile {
  const stripped = normalizeRawText(text);
  const lines = stripped.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length < 2) return { kind: 'unknown' };

  if (looksLikeAppExportHeader(lines[0])) {
    const delimiter = guessSessionDelimiter(lines[0], lines[1]);
    return { kind: 'app_export', bodyLines: lines.slice(1), delimiter };
  }

  const legacy = detectLegacyIdLayout(lines);
  if (legacy) {
    return { kind: 'legacy_id', bodyLines: lines.slice(1), delimiter: legacy.delimiter };
  }

  const semi = parseBlankDelimitedLines(stripped, ';');
  const comma = parseBlankDelimitedLines(stripped, ',');
  const tab = parseBlankDelimitedLines(stripped, '\t');

  let blank = semi.length >= comma.length ? semi : comma;
  if (tab.length > blank.length) blank = tab;

  if (blank.length >= 1) {
    return { kind: 'accountant_blank', rows: blank };
  }

  return { kind: 'unknown' };
}
