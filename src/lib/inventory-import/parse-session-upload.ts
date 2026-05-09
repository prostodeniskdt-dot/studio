import { decodeCsvBuffer, parseInventoryBlankCsv } from './parse-csv';
import {
  extractInventoryPdfText,
  parseBlankRowsFromPdfExtractedText,
} from './parse-pdf';
import type { ParsedSessionFile } from './session-file-import';
import { parseSessionImportText } from './session-file-import';
import { parseInventoryBlankXlsx, xlsxBufferToSemicolonText } from './parse-xlsx';

export type SessionImportFormat = 'csv' | 'xlsx' | 'pdf';

/** По имени файла и сигнатуре байтов (если расширение неясно). */
export function resolveSessionImportFormat(filename: string, buf: Buffer): SessionImportFormat | null {
  const low = filename.toLowerCase();
  if (low.endsWith('.csv') || low.endsWith('.txt')) return 'csv';
  if (low.endsWith('.xlsx') || low.endsWith('.xls')) return 'xlsx';
  if (low.endsWith('.pdf')) return 'pdf';
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'xlsx';
  return null;
}

/**
 * Единая разборка загрузки для страницы инвентаризации: UTF-8/Win-1251 для CSV,
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
        return { kind: 'accountant_blank', rows };
      }
    }
    return parsed;
  }

  if (fmt === 'xlsx') {
    const synthetic = xlsxBufferToSemicolonText(buf);
    let parsed = parseSessionImportText(synthetic);
    if (parsed.kind === 'unknown') {
      const rows = parseInventoryBlankXlsx(buf);
      if (rows.length >= 1) {
        return { kind: 'accountant_blank', rows };
      }
    }
    return parsed;
  }

  const text = await extractInventoryPdfText(buf);
  let parsed = parseSessionImportText(text);
  if (parsed.kind === 'unknown') {
    const rows = parseBlankRowsFromPdfExtractedText(text);
    if (rows.length >= 1) {
      return { kind: 'accountant_blank', rows };
    }
  }
  return parsed;
}
