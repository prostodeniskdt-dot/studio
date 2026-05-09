import { parseBlankDelimitedLines } from './parse-delimited-text';
import type { BlankParsedRow } from './types';

export async function extractInventoryPdfText(buf: Buffer): Promise<string> {
  const mod: unknown = await import('pdf-parse');
  const pdfParse = (typeof mod === 'function'
    ? mod
    : (mod as { default?: unknown }).default ?? mod) as (
    b: Buffer
  ) => Promise<{ text?: string }>;
  const data = await pdfParse(buf);
  return data.text ?? '';
}

export function parseBlankRowsFromPdfExtractedText(text: string): BlankParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.includes(';'));
  if (lines.length > 2) {
    return parseBlankDelimitedLines(lines.join('\n'), ';');
  }
  return parseBlankDelimitedLines(text, ';');
}

/**
 * PDF: извлекаем текст и пытаемся разобрать так же, как CSV.
 * Раскладка таблицы в PDF может отличаться — при пустом результате вызывающий код должен сообщить пользователю.
 */
export async function parseInventoryBlankPdf(buf: Buffer): Promise<BlankParsedRow[]> {
  const text = await extractInventoryPdfText(buf);
  return parseBlankRowsFromPdfExtractedText(text);
}
