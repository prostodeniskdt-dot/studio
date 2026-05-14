import type { BlankParsedRow } from './types';
import { parseInventoryBlankCsv } from './parse-csv';
import { parseInventoryBlankXlsx } from './parse-xlsx';
import { parseInventoryBlankPdf } from './parse-pdf';

export function isPremixBlankFilename(filename: string): boolean {
  const n = filename.toLowerCase();
  return n.includes('заготов') || n.includes('zagotov');
}

export async function parseInventoryBlankFile(
  buf: Buffer,
  filename: string
): Promise<BlankParsedRow[]> {
  const low = filename.toLowerCase();
  if (low.endsWith('.csv')) return parseInventoryBlankCsv(buf);
  if (low.endsWith('.xlsx') || low.endsWith('.xls')) return parseInventoryBlankXlsx(buf);
  if (low.endsWith('.pdf')) return parseInventoryBlankPdf(buf);
  throw new Error('UNSUPPORTED_FORMAT');
}
