import type { BlankParsedRow } from './types';
import { normalizeForMatch } from './normalize';

/** Разбирает строковое содержимое (CSV/фрагмент из PDF в одну колонку) в позиции бланка. */
export function parseBlankDelimitedLines(content: string, delimiter: ';' | ','): BlankParsedRow[] {
  const lines = content.split(/\r?\n/);
  return parseBlankLines(lines, delimiter);
}

export function parseBlankLines(lines: string[], delimiter: string): BlankParsedRow[] {
  let inTable = false;
  let lastGroup = '';

  const rows: BlankParsedRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (/бланк\s+инвентари/i.test(line) || /^организация/i.test(line)) continue;
    if (/^на\s+дату\s*:/i.test(line)) continue;
    if (/^склад\s*;/i.test(line)) continue;
    if (/^\d+\s*из\s*\d+$/i.test(line.trim())) continue;

    if (line.includes('Группа') && line.includes('Наименование')) {
      inTable = true;
      continue;
    }

    const parts = line.split(delimiter).map((s) => s.trim());
    if (parts.every((p) => !p)) continue;

    if (parts[0]?.includes?.('Группа') && parts.some((x) => x.includes('Наименование'))) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    const nameSemi = delimiter === ';' ? (parts[4] ?? '').trim() : pickCommaName(parts);
    const nameCol = nameSemi;
    const name = nameCol;
    const codeCol = delimiter === ';' ? (parts[2] ?? '').trim() : pickCommaCode(parts);

    const barcodeCol = delimiter === ';' ? (parts[3] ?? '').trim() : '';
    const code = codeCol;
    let barcode = barcodeCol;

    if (delimiter === ';' && name) {
      if (/^\d{8,}$/.test(code) && !barcode) {
        barcode = code;
      }
      if (/^\d{8,}$/.test(barcode)) {
      } else if (barcode && !/^\d+$/.test(barcode)) {
        barcode = '';
      }
    }

    const unitRaw = delimiter === ';' ? (parts[5] ?? '').trim() : pickCommaUnit(parts);
    const qtyRaw = delimiter === ';' ? (parts[6] ?? '').trim() : pickCommaQty(parts);

    if (!name || name === 'Наименование') continue;

    const groupCandidate = parts[0]?.trim() ?? '';
    if (groupCandidate && /^[А-ЯA-Z\s\-\.\/]+$/.test(normalizeGroupHeader(groupCandidate)) && !codeCol && !parts[4]) {
      lastGroup = groupCandidate;
      continue;
    }

    if (parts[2] === 'Код' || parts.includes('Наименование')) continue;

    let group = '';
    if (groupCandidate && (codeCol || nameSemi)) {
      group = /^[А-ЯA-Z0-9\s\-\.\/«»]+$/.test(groupCandidate) ? groupCandidate : lastGroup;
    } else {
      group = lastGroup;
    }
    if (/товар|^ед\.\s*изм/i.test(normalizeForMatch(group))) group = '';

    let quantityFact: number | null = null;
    if (qtyRaw && qtyRaw.length > 0 && !/^[-–]+$/.test(qtyRaw)) {
      const n = Number(String(qtyRaw).replace(/\s+/g, '').replace(',', '.'));
      quantityFact = Number.isFinite(n) ? n : null;
    }

    rows.push({
      group: group || lastGroup,
      code,
      barcode,
      name,
      unitRaw,
      quantityFact,
    });

    lastGroup = group || lastGroup;
  }

  return dedupeParsedRows(rows);
}

function normalizeGroupHeader(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function pickCommaName(parts: string[]): string {
  if (parts.length < 3) return '';
  return parts[parts.length - 3]?.trim() ?? '';
}

function pickCommaCode(parts: string[]): string {
  if (!parts.length) return '';
  for (let i = 1; i < parts.length; i++) {
    const x = parts[i]?.trim();
    if (x && /^\d+[.,]?\d*$/.test(x) && Number(x.replace(',', '.')) < 1e12) return x;
  }
  return parts[2]?.trim() ?? '';
}

function pickCommaUnit(parts: string[]): string {
  const u = parts[parts.length - 2]?.trim() ?? '';
  return u;
}

function pickCommaQty(parts: string[]): string {
  const q = parts[parts.length - 1]?.trim() ?? '';
  return q;
}

function dedupeParsedRows(rows: BlankParsedRow[]): BlankParsedRow[] {
  const seen = new Set<string>();
  const out: BlankParsedRow[] = [];
  for (const r of rows) {
    const k = normalizeForMatch(
      `${r.barcode}|${r.code}|${r.name}`
    ).replace(/\s/g, '');
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
