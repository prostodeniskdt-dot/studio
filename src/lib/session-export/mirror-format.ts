import type { ParsedSessionFile } from '@/lib/inventory-import/session-file-import';
import type { SessionDelimiter } from '@/lib/inventory-import/split-quoted-row';
import type { InventoryLine, Product } from '@/lib/types';
import { buildProductDisplayName, translateCategory } from '@/lib/utils';
import type { CellHookData } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/** Noto Sans с кириллицей; векторный PDF. URL привязан к ветке main репозитория googlefonts/noto-fonts. */
const NOTO_SANS_REGULAR_TTF =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_SANS_BOLD_TTF =
  'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function isCategorySeparatorRow(firstCell: unknown): boolean {
  if (firstCell == null) return false;
  const s = String(firstCell).trim();
  return s.startsWith('—') && s.endsWith('—');
}

async function addNotoSansToDoc(
  doc: InstanceType<(typeof import('jspdf'))['jsPDF']>
): Promise<void> {
  const pairs: readonly [fileName: string, url: string][] = [
    ['NotoSans-Regular.ttf', NOTO_SANS_REGULAR_TTF],
    ['NotoSans-Bold.ttf', NOTO_SANS_BOLD_TTF],
  ];
  for (const [fileName, url] of pairs) {
    const fontRes = await fetch(url);
    if (!fontRes.ok) {
      throw new Error(
        'Не удалось загрузить шрифт для PDF. Проверьте доступ в интернет или экспортируйте в Excel.'
      );
    }
    const fontB64 = arrayBufferToBase64(await fontRes.arrayBuffer());
    doc.addFileToVFS(fileName, fontB64);
  }
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'normal', 'Identity-H');
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'normal', 'Identity-H');
}

async function downloadSessionPdfVector(
  aoa: (string | number)[][],
  pref: SessionExportPreference,
  documentTitle: string,
  fileBase: string
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const maxCols = Math.max(1, ...aoa.map((r) => r.length));
  const wideLayout = pref.layout === 'wide_blank' || maxCols >= 6;
  const orientation = wideLayout ? 'landscape' : 'portrait';
  const fontSize = wideLayout ? 7 : 8.5;
  const body = aoa.map((row) => {
    const out: string[] = [];
    for (let i = 0; i < maxCols; i++) {
      const v = row[i];
      out.push(v === undefined || v === null ? '' : String(v));
    }
    return out;
  });

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  await addNotoSansToDoc(doc);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(17, 24, 39);

  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(documentTitle, wideLayout ? 277 : 190);
  doc.text(titleLines, 14, 16);
  const startY = 16 + titleLines.length * 6 + 2;

  autoTable(doc, {
    startY,
    body,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontStyle: 'normal',
      fontSize,
      cellPadding: wideLayout ? 1.2 : 1.5,
      textColor: [17, 24, 39],
      lineColor: [55, 65, 81],
      lineWidth: 0.05,
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: fontSize * 0.45,
    },
    headStyles: {
      font: 'NotoSans',
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'normal',
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    tableWidth: 'auto',
    horizontalPageBreak: wideLayout && maxCols > 6,
    didParseCell: (data: CellHookData) => {
      const row = data.row.raw as string[];
      const first = row[0];

      if (pref.layout === 'wide_blank' && data.section === 'body' && data.row.index < 8) {
        data.cell.styles.font = 'NotoSans';
        data.cell.styles.fontStyle = 'bold';
        if (data.row.index >= 6) {
          data.cell.styles.fillColor = [243, 244, 246];
        }
        return;
      }

      if (pref.layout !== 'wide_blank' && data.section === 'body' && data.row.index === 0) {
        data.cell.styles.font = 'NotoSans';
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
        return;
      }

      if (data.section === 'body' && isCategorySeparatorRow(first)) {
        data.cell.styles.font = 'NotoSans';
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [229, 231, 235];
      }
    },
  });

  await doc.save(`${fileBase}.pdf`, { returnPromise: true });
}

export const SESSION_EXPORT_PREF_KEY = (sessionId: string) => `barboss_export_pref_${sessionId}`;

export type ExportLayout = 'two_col' | 'legacy_full' | 'wide_blank' | 'compact_blank';

export type SessionExportPreference = {
  ext: 'csv' | 'xlsx' | 'pdf';
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

function sortLinesByCategoryThenName(
  lines: InventoryLine[],
  productById: Map<string, Product>
): InventoryLine[] {
  return [...lines].sort((a, b) => {
    const pa = productById.get(a.productId);
    const pb = productById.get(b.productId);
    const ca = pa ? translateCategory(pa.category) : 'Прочее';
    const cb = pb ? translateCategory(pb.category) : 'Прочее';
    const cmp = ca.localeCompare(cb, 'ru');
    if (cmp !== 0) return cmp;
    const na = pa ? buildProductDisplayName(pa.name, pa.bottleVolumeMl) : '';
    const nb = pb ? buildProductDisplayName(pb.name, pb.bottleVolumeMl) : '';
    return na.localeCompare(nb, 'ru');
  });
}

function applySheetColWidths(ws: XLSX.WorkSheet, aoa: (string | number)[][]) {
  if (!aoa.length) return;
  const colCount = Math.max(...aoa.map((r) => r.length), 1);
  const wch: number[] = Array(colCount).fill(12);
  for (const row of aoa) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      wch[i] = Math.max(wch[i] ?? 0, Math.min(len + 2, 72));
    });
  }
  ws['!cols'] = wch.map((w) => ({ wch: w }));
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
    const sorted = sortLinesByCategoryThenName(lines, productById);
    const rows: (string | number)[][] = [['Наименование продукта', qtyHeader]];
    let lastCat = '';
    for (const line of sorted) {
      const p = productById.get(line.productId);
      const cat = p ? translateCategory(p.category) : 'Прочее';
      if (cat !== lastCat) {
        lastCat = cat;
        rows.push([`— ${cat} —`, '']);
      }
      const name = p ? buildProductDisplayName(p.name, p.bottleVolumeMl) : '';
      rows.push([name, line.endStock]);
    }
    return rows;
  }

  if (pref.layout === 'legacy_full') {
    const sorted = sortLinesByCategoryThenName(lines, productById);
    return [
      ['productId', 'name', 'startStock', 'purchases', 'sales', 'endStock'],
      ...sorted.map((line) => {
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
    const sorted = sortLinesByCategoryThenName(lines, productById);
    const rows: (string | number)[][] = [['Код', 'Наименование', 'Ед. изм.', 'Остаток фактический']];
    let lastCat = '';
    for (const line of sorted) {
      const p = productById.get(line.productId);
      const cat = p ? translateCategory(p.category) : 'Прочее';
      if (cat !== lastCat) {
        lastCat = cat;
        rows.push([`— ${cat} —`, '', '', '']);
      }
      const unit = unitLabel(line);
      const code = p?.externalCode?.trim() || '';
      const name = p ? buildProductDisplayName(p.name, p.bottleVolumeMl) : '';
      rows.push([code, name, unit, line.endStock]);
    }
    return rows;
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

  const sortedWide = sortLinesByCategoryThenName(lines, productById);
  const dataRows: (string | number)[][] = sortedWide.map((line) => {
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

export async function downloadSessionExport(
  aoa: (string | number)[][],
  pref: SessionExportPreference,
  sessionId: string,
  documentTitle: string
): Promise<void> {
  const safeBase = (pref.sourceBaseName || `session_${sessionId}`).replace(/[<>:"/\\|?*]+/g, '_');
  const fileBase = `${safeBase}_выгрузка`;

  if (pref.ext === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    applySheetColWidths(ws, aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Инвентаризация');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
    return;
  }

  if (pref.ext === 'pdf') {
    await downloadSessionPdfVector(aoa, pref, documentTitle, fileBase);
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
    if (o.ext !== 'csv' && o.ext !== 'xlsx' && o.ext !== 'pdf') return null;
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
