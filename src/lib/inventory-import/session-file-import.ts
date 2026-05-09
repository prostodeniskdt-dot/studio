import type { BlankParsedRow } from './types';
import { parseBlankDelimitedLines } from './parse-delimited-text';

export type ParsedSessionFile =
  | { kind: 'app_export'; bodyLines: string[] }
  | { kind: 'legacy_id'; bodyLines: string[] }
  | { kind: 'accountant_blank'; rows: BlankParsedRow[] }
  | { kind: 'unknown' };

function normalizeRawText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Ячейки с учётом кавычек и экранирования "" */
export function splitDelimitedQuotedRow(line: string, delimiter: ';' | ','): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      cur += c;
    } else {
      if (c === '"') {
        inQuotes = true;
        continue;
      }
      if (c === delimiter) {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
  }
  parts.push(cur.trim());
  return parts;
}

export function parseSessionImportText(text: string): ParsedSessionFile {
  const stripped = normalizeRawText(text);
  const lines = stripped.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length < 2) return { kind: 'unknown' };

  const headerLower = lines[0].toLowerCase();
  if (headerLower.includes('наименование') && (headerLower.includes('фактическ') || headerLower.includes('остаток'))) {
    return { kind: 'app_export', bodyLines: lines.slice(1) };
  }

  const firstDataRaw = lines[1];
  if (firstDataRaw) {
    const firstCellCsv = splitDelimitedQuotedRow(firstDataRaw, ',');
    const idCandidate = firstCellCsv[0]?.replace(/^"|"$/g, '').trim() ?? '';
    if (/^c[a-z0-9]{20,}$/i.test(idCandidate)) {
      return { kind: 'legacy_id', bodyLines: lines.slice(1) };
    }
  }

  const semi = parseBlankDelimitedLines(stripped, ';');
  const comma = parseBlankDelimitedLines(stripped, ',');
  const blank = semi.length >= comma.length ? semi : comma;
  if (blank.length >= 1) {
    return { kind: 'accountant_blank', rows: blank };
  }

  return { kind: 'unknown' };
}
