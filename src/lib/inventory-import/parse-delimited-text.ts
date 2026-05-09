import type { BlankParsedRow } from './types';
import { normalizeForMatch } from './normalize';
import { splitDelimitedQuotedRow, type SessionDelimiter } from './split-quoted-row';

/** Разделители столбцов бланков (CSV из Excel может быть через табуляцию). */
export type BlankDelimiter = ';' | ',' | '\t';

/** Разбирает строковое содержимое (CSV/фрагмент из PDF в одну колонку) в позиции бланка. */
export function parseBlankDelimitedLines(content: string, delimiter: BlankDelimiter): BlankParsedRow[] {
  const lines = content.split(/\r?\n/);
  return parseBlankLines(lines, delimiter);
}

/** Строка похожа на заголовок узкого бухгалтерского бланка. */
export function lineLooksLikeCompactAccountantHeader(line: string): boolean {
  return (
    isCompactAccountantHeaderLine(line, ';') ||
    isCompactAccountantHeaderLine(line, ',') ||
    isCompactAccountantHeaderLine(line, '\t')
  );
}

function headerCellMeansCode(c: string): boolean {
  const t = c.trim().toLowerCase();
  return (
    t === 'код' ||
    /^код\.?$/.test(t) ||
    t.startsWith('код ') ||
    t.includes('артикул') ||
    t.includes('номенклатур') ||
    t === 'н/н' ||
    t === 'п/н'
  );
}

function headerCellMeansName(c: string): boolean {
  const t = c.trim().toLowerCase();
  return t.includes('наименование') || t.includes('название') || t === 'наим' || t.includes('ном. тов');
}

function headerCellMeansUnit(c: string): boolean {
  const t = c.trim().toLowerCase().replace(/\s+/g, ' ');
  return (
    /ед\.?\s*изм|ед\.изм/i.test(t) ||
    /^ед\b.*\bизм/i.test(t) ||
    /единица.*измерения/i.test(t) ||
    (t.includes('ед') && t.includes('изм'))
  );
}

/** Узкий бухгалтерский бланк (Код / Наименование / Ед. изм. + числа справа). */
function isCompactAccountantHeaderLine(line: string, delimiter: string): boolean {
  const parts = line.split(delimiter).map((s) => s.trim());
  if (parts.length < 3) return false;
  const lc = parts.map((s) => s.toLowerCase());
  const codeHit = lc.some(headerCellMeansCode);
  const nameHit = lc.some(headerCellMeansName);
  const unitHit = lc.some(headerCellMeansUnit);
  return codeHit && nameHit && unitHit;
}

/** Берём последнюю колонку с числом начиная с индекса 3 (после кода, названия, ед. изм.). */
function pickQtyFromCompactParts(parts: string[]): string {
  for (let i = parts.length - 1; i >= 3; i--) {
    const raw = parts[i]?.trim() ?? '';
    if (!raw || /^[-–]+$/.test(raw)) continue;
    const n = Number(String(raw).replace(/\s+/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return raw;
  }
  return '';
}

export function parseBlankLines(lines: string[], delimiter: string): BlankParsedRow[] {
  let blankMode: 'none' | 'wide' | 'compact' = 'none';
  let lastGroup = '';
  const rows: BlankParsedRow[] = [];
  const delimQuoted: SessionDelimiter =
    delimiter === ';' || delimiter === ',' || delimiter === '\t' ? delimiter : ',';

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (/бланк\s+инвентари/i.test(line) || /^организация/i.test(line)) continue;
    if (/^на\s+дату\s*:/i.test(line)) continue;
    if (/^склад\s*(;|\t|$)/i.test(line)) continue;
    if (/^\d+\s*из\s*\d+$/i.test(line.trim())) continue;

    if (blankMode === 'none') {
      if (line.includes('Группа') && line.includes('Наименование')) {
        blankMode = 'wide';
        continue;
      }
      const partsProbe = line.split(delimiter).map((s) => s.trim());
      if (partsProbe[0]?.includes?.('Группа') && partsProbe.some((x) => x.includes('Наименование'))) {
        blankMode = 'wide';
        continue;
      }
      if (isCompactAccountantHeaderLine(line, delimiter)) {
        blankMode = 'compact';
        continue;
      }
      continue;
    }

    if (blankMode === 'compact') {
      if (isCompactAccountantHeaderLine(line, delimiter)) continue;
      const parts =
        delimiter === ';' || delimiter === ',' || delimiter === '\t'
          ? splitDelimitedQuotedRow(line, delimQuoted)
          : line.split(delimiter).map((s) => s.trim());
      if (parts.length < 3) continue;
      const code = (parts[0] ?? '').trim();
      const name = (parts[1] ?? '').trim();
      const unitRaw = (parts[2] ?? '').trim();
      if (!name || name === 'Наименование') continue;
      const qtyRaw = pickQtyFromCompactParts(parts);
      let quantityFact: number | null = null;
      if (qtyRaw && qtyRaw.length > 0 && !/^[-–]+$/.test(qtyRaw)) {
        const n = Number(String(qtyRaw).replace(/\s+/g, '').replace(',', '.'));
        quantityFact = Number.isFinite(n) ? n : null;
      }
      rows.push({
        group: '',
        code,
        barcode: '',
        name,
        unitRaw,
        quantityFact,
      });
      continue;
    }

    // wide
    const parts = line.split(delimiter).map((s) => s.trim());
    if (parts.every((p) => !p)) continue;

    const fixedWideLayout = delimiter === ';' || delimiter === '\t';
    const nameSemi = fixedWideLayout ? (parts[4] ?? '').trim() : pickCommaName(parts);
    const nameCol = nameSemi;
    const name = nameCol;
    const codeCol = fixedWideLayout ? (parts[2] ?? '').trim() : pickCommaCode(parts);

    const barcodeCol = fixedWideLayout ? (parts[3] ?? '').trim() : '';
    const code = codeCol;
    let barcode = barcodeCol;

    if (fixedWideLayout && name) {
      if (/^\d{8,}$/.test(code) && !barcode) {
        barcode = code;
      }
      if (/^\d{8,}$/.test(barcode)) {
      } else if (barcode && !/^\d+$/.test(barcode)) {
        barcode = '';
      }
    }

    const unitRaw = fixedWideLayout ? (parts[5] ?? '').trim() : pickCommaUnit(parts);
    const qtyRaw = fixedWideLayout ? (parts[6] ?? '').trim() : pickCommaQty(parts);

    if (!name || name === 'Наименование') continue;

    const groupCandidate = parts[0]?.trim() ?? '';
    if (
      groupCandidate &&
      /^[А-ЯA-Z\s\-\.\/]+$/.test(normalizeGroupHeader(groupCandidate)) &&
      !codeCol &&
      !parts[4]
    ) {
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
    const k = normalizeForMatch(`${r.barcode}|${r.code}|${r.name}`).replace(/\s/g, '');
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
