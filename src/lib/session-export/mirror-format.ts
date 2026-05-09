import type { ParsedSessionFile } from '@/lib/inventory-import/session-file-import';
import type { SessionDelimiter } from '@/lib/inventory-import/split-quoted-row';
import type { InventoryLine, Product } from '@/lib/types';
import { buildProductDisplayName, translateCategory } from '@/lib/utils';
import * as XLSX from 'xlsx';

export const SESSION_EXPORT_PREF_KEY = (sessionId: string) => `barboss_export_pref_${sessionId}`;

export type ExportLayout = 'two_col' | 'legacy_full' | 'wide_blank' | 'compact_blank';

export type SessionExportPreference = {
  ext: 'csv' | 'xlsx';
  delimiter: SessionDelimiter;
  layout: ExportLayout;
  sourceBaseName?: string;
};

export const DEFAULT_EXPORT_PREF: SessionExportPreference = {
  ext: 'csv',
  delimiter: ';',
  layout: 'two_col',
};

export function preferenceFromImport(
  file: File,
  parsed: ParsedSessionFile
): SessionExportPreference | null {
  if (parsed.kind === 'unknown') return null;
  const low = file.name.toLowerCase();
  const ext: 'csv' | 'xlsx' =
    low.endsWith('.xlsx') || low.endsWith('.xls') ? 'xlsx' : 'csv';

  const base = file.name.replace(/\.[^.\\/]+$/u, '').trim() || 'inventory';

  if (parsed.kind === 'app_export') {
    return {
      ext,
      delimiter: parsed.delimiter,
      layout: 'two_col',
      sourceBaseName: base,
    };
  }
  if (parsed.kind === 'legacy_id') {
    return {
      ext,
      delimiter: parsed.delimiter,
      layout: 'legacy_full',
      sourceBaseName: base,
    };
  }
  const rows = parsed.rows;
  const wide =
    rows.some((r) => (r.group?.trim().length ?? 0) > 0) ||
    rows.some(
      (r) => (r.code?.trim().length ?? 0) > 0 || (r.barcode?.trim().length ?? 0) > 0
    );
  return {
    ext,
    delimiter: ';',
    layout: wide ? 'wide_blank' : 'compact_blank',
    sourceBaseName: base,
  };
}

function escapeCell(value: string | number, delimiter: string): string {
  const s = String(value);
  const needsQuote =
    s.includes('"') ||
    s.includes('\n') ||
    s.includes('\r') ||
    s.includes(delimiter) ||
    (delimiter === '\t' && s.includes('\t'));
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function joinDelimitedRow(cells: (string | number)[], delimiter: string): string {
  return cells.map((c) => escapeCell(c, delimiter)).join(delimiter);
}

export function aoaToCsv(aoa: (string | number)[][], delimiter: string): string {
  return aoa.map((row) => joinDelimitedRow(row, delimiter)).join('\r\n');
}

function unitLabel(line: InventoryLine): string {
  return line.stockMode === 'pieces' ? 'шт' : 'мл';
}

/** 8 колонок как в типичном бланке с «;». */
function row8(parts: (string | number)[]): (string | number)[] {
  const a: (string | number)[] = [...parts];
  while (a.length < 8) a.push('');
  return a.slice(0, 8);
}

export function buildSessionExportAoa(
  pref: SessionExportPreference,
  lines: InventoryLine[],
  productById: Map<string, Product>,
  options: { sessionName?: string; barName?: string }
): (string | number)[][] {
  const dateStr = new Date().toLocaleDateString('ru-RU');
  const warehouse = options.sessionName || options.barName || 'Склад';

  if (pref.layout === 'two_col') {
    const qtyHeader =
      lines.length > 0 && lines.every((l) => l.stockMode === 'pieces')
        ? 'Фактический остаток (шт)'
        : 'Фактический остаток (мл)';
    return [
      ['Наименование продукта', qtyHeader],
      ...lines.map((line) => {
        const p = productById.get(line.productId);
        const name = p ? buildProductDisplayName(p.name, p.bottleVolumeMl) : '';
        return [name, line.endStock];
      }),
    ];
  }

  if (pref.layout === 'legacy_full') {
    return [
      ['productId', 'name', 'startStock', 'purchases', 'sales', 'endStock'],
      ...lines.map((line) => {
        const p = productById.get(line.productId);
        return [
          line.productId,
          p?.name ?? '',
          line.startStock,
          line.purchases,
          line.sales,
          line.endStock,
        ];
      }),
    ];
  }

  if (pref.layout === 'compact_blank') {
    return [
      ['Код', 'Наименование', 'Ед. изм.', 'Остаток фактический'],
      ...lines.map((line) => {
        const p = productById.get(line.productId);
        const unit = unitLabel(line);
        const code = p?.externalCode?.trim() || '';
        const name = p ? buildProductDisplayName(p.name, p.bottleVolumeMl) : '';
        return [code, name, unit, line.endStock];
      }),
    ];
  }

  const preamble: (string | number)[][] = [
    row8(['Организация:', '']),
    row8(['Бланк инвентаризации']),
    row8(['']),
    row8(['На дату:', dateStr]),
    row8(['Склад', warehouse]),
    row8(['']),
    row8(['Товар', '', '', '', '', 'Ед. изм.', 'Остаток фактический', 'Отметки']),
    row8(['Группа', '', 'Код', 'Штрихкод', 'Наименование']),
  ];

  const dataRows: (string | number)[][] = lines.map((line) => {
    const p = productById.get(line.productId);
    const groupCell = p ? translateCategory(p.category) : '';
    const code = p?.externalCode?.trim() ?? '';
    const barcode = p?.barcode?.trim() ?? '';
    const name = p ? buildProductDisplayName(p.name, p.bottleVolumeMl) : '';
    const unit = unitLabel(line);
    const qty = line.endStock;
    return row8([groupCell, '', code, barcode, name, unit, qty, '']);
  });

  return [...preamble, ...dataRows];
}

export function downloadSessionExport(
  aoa: (string | number)[][],
  pref: SessionExportPreference,
  sessionId: string
): void {
  const safeBase = (pref.sourceBaseName || `session_${sessionId}`).replace(/[<>:"/\\|?*]+/g, '_');
  const fileBase = `${safeBase}_выгрузка`;

  if (pref.ext === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Инвентаризация');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
    return;
  }

  const delimiter = pref.delimiter === '\t' ? '\t' : pref.delimiter;
  const csv = `\uFEFF${aoaToCsv(aoa, delimiter)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileBase}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadExportPreference(sessionId: string): SessionExportPreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_EXPORT_PREF_KEY(sessionId));
    if (!raw) return null;
    const o = JSON.parse(raw) as SessionExportPreference;
    if (!o || typeof o !== 'object') return null;
    if (o.ext !== 'csv' && o.ext !== 'xlsx') return null;
    if (!['two_col', 'legacy_full', 'wide_blank', 'compact_blank'].includes(o.layout)) return null;
    if (o.delimiter !== ';' && o.delimiter !== ',' && o.delimiter !== '\t') return null;
    return o;
  } catch {
    return null;
  }
}

export function saveExportPreference(sessionId: string, pref: SessionExportPreference): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_EXPORT_PREF_KEY(sessionId), JSON.stringify(pref));
  } catch {
    /* quota / private mode */
  }
}
