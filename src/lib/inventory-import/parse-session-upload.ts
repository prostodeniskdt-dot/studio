import { decodeCsvBuffer, parseInventoryBlankCsv } from './parse-csv';
import { tryGenericInventoryRowsFromText } from './generic-session-import';
import {
  extractInventoryPdfText,
  parseBlankRowsFromPdfExtractedText,
} from './parse-pdf';
import type { ParsedSessionFile } from './session-file-import';
import { parseSessionImportText } from './session-file-import';
import { parseInventoryBlankXlsx, xlsxBufferToSemicolonText } from './parse-xlsx';

export type SessionImportFormat = 'csv' | 'xlsx' | 'pdf';

/** OLE compound file (старый .xls и др.). */
function isOleCompound(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

/** По имени файла и сигнатуре байтов (если расширение неясно). */
export function resolveSessionImportFormat(filename: string, buf: Buffer): SessionImportFormat | null {
  const low = filename.toLowerCase();
  if (low.endsWith('.csv') || low.endsWith('.txt')) return 'csv';
  if (low.endsWith('.xlsx') || low.endsWith('.xls')) return 'xlsx';
  if (low.endsWith('.pdf')) return 'pdf';
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'xlsx';
  if (isOleCompound(buf)) return 'xlsx';
  return null;
}

function withGenericFallback(text: string, prior: ParsedSessionFile): ParsedSessionFile {
  if (prior.kind !== 'unknown') return prior;
  const generic = tryGenericInventoryRowsFromText(text);
  if (generic && generic.length >= 1) {
    return { kind: 'accountant_blank', rows: generic };
  }
  return prior;
}

/**
 * Единая разборка загрузки для страницы инвентаризации: UTF-8 / UTF-16 / Win-1251 для CSV,
 * первая страница Excel как виртуальный CSV (в т.ч. экспорт «2 колонки»),
 * извлечение текста из PDF.
 */
export async function parseSessionUploadBuffer(
  buf: Buffer,
  filename: string
): Promise<ParsedSessionFile> {
  const fmt = resolveSessionImportFormat(filename, buf);
  if (!fmt) {
    throw new Error('UNSUPPORTED_FORMAT');
  }

  if (fmt === 'csv') {
    const text = decodeCsvBuffer(buf);
    let parsed = parseSessionImportText(text);
    if (parsed.kind === 'unknown') {
      const rows = parseInventoryBlankCsv(buf);
      if (rows.length >= 1) {
        parsed = { kind: 'accountant_blank', rows };
      }
    }
    return withGenericFallback(text, parsed);
  }

  if (fmt === 'xlsx') {
    const synthetic = xlsxBufferToSemicolonText(buf);
    let parsed = parseSessionImportText(synthetic);
    if (parsed.kind === 'unknown') {
      const rows = parseInventoryBlankXlsx(buf);
      if (rows.length >= 1) {
        parsed = { kind: 'accountant_blank', rows };
      }
    }
    return withGenericFallback(synthetic, parsed);
  }

  const text = await extractInventoryPdfText(buf);
  let parsed = parseSessionImportText(text);
  if (parsed.kind === 'unknown') {
    const rows = parseBlankRowsFromPdfExtractedText(text);
    if (rows.length >= 1) {
      parsed = { kind: 'accountant_blank', rows };
    }
  }
  return withGenericFallback(text, parsed);
}
