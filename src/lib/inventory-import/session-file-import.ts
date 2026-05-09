import type { BlankParsedRow } from './types';
import { lineLooksLikeCompactAccountantHeader, parseBlankDelimitedLines } from './parse-delimited-text';
import { splitDelimitedQuotedRow } from './split-quoted-row';

export type ParsedSessionFile =
  | { kind: 'app_export'; bodyLines: string[] }
  | { kind: 'legacy_id'; bodyLines: string[]; delimiter: ';' | ',' }
  | { kind: 'accountant_blank'; rows: BlankParsedRow[] }
  | { kind: 'unknown' };

export { splitDelimitedQuotedRow };

function normalizeRawText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

const CUID_FIRST_CELL_RE = /^c[a-z0-9]{20,}$/i;

function firstCellDelimited(rawLine: string, delimiter: ';' | ','): string {
  const cell = splitDelimitedQuotedRow(rawLine, delimiter)[0] ?? '';
  return cell.replace(/^"|"$/g, '').trim();
}

/** Технический CSV: строка данных начинается с product id (cuid). Разделитель — запятая или ; */
function detectLegacyIdLayout(lines: string[]): { delimiter: ';' | ',' } | null {
  if (lines.length < 2) return null;
  const headerLower = lines[0].toLowerCase();
  const headerHintsProductId = /\bproductid\b/i.test(headerLower);

  const delimiterForRow = (row: string): ';' | ',' | null => {
    const comma = firstCellDelimited(row, ',');
    const semi = firstCellDelimited(row, ';');
    if (CUID_FIRST_CELL_RE.test(comma)) return ',';
    if (CUID_FIRST_CELL_RE.test(semi)) return ';';
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

  const headerLower = lines[0].toLowerCase();
  if (
    headerLower.includes('наименование') &&
    (headerLower.includes('фактическ') || headerLower.includes('остаток')) &&
    !lineLooksLikeCompactAccountantHeader(lines[0])
  ) {
    return { kind: 'app_export', bodyLines: lines.slice(1) };
  }

  const legacy = detectLegacyIdLayout(lines);
  if (legacy) {
    return { kind: 'legacy_id', bodyLines: lines.slice(1), delimiter: legacy.delimiter };
  }

  const semi = parseBlankDelimitedLines(stripped, ';');
  const comma = parseBlankDelimitedLines(stripped, ',');
  const blank = semi.length >= comma.length ? semi : comma;
  if (blank.length >= 1) {
    return { kind: 'accountant_blank', rows: blank };
  }

  return { kind: 'unknown' };
}
