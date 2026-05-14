import * as XLSX from 'xlsx';
import { parseBlankLines } from './parse-delimited-text';
import type { BlankParsedRow } from './types';

/** Первая страница книги как текст с разделителем «;» (как виртуальный CSV для parseSessionImportText). */
export function xlsxBufferToSemicolonText(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const lines = rows.map((row) =>
    row
      .map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim()))
      .join(';')
  );
  return lines.join('\n');
}

export function parseInventoryBlankXlsx(buf: Buffer): BlankParsedRow[] {
  const text = xlsxBufferToSemicolonText(buf);
  return parseBlankLines(text.split(/\r?\n/), ';');
}
