import { parseBlankDelimitedLines } from './parse-delimited-text';
import type { BlankParsedRow } from './types';

/**
 * PDF: извлекаем текст и пытаемся применить тот же разбор, что и для CSV.
 * Раскладка таблицы в PDF может отличаться — при пустом результате вызывающий код должен сообщить пользователю.
 */
export async function parseInventoryBlankPdf(buf: Buffer): Promise<BlankParsedRow[]> {
  const mod: any = await import('pdf-parse');
  const pdfParse = (typeof mod === 'function' ? mod : mod.default ?? mod) as (
    b: Buffer
  ) => Promise<{ text?: string }>;
  const data = await pdfParse(buf);
  const text = data.text ?? '';
  const lines = text.split(/\r?\n/).filter((l) => l.includes(';'));
  if (lines.length > 2) {
    return parseBlankDelimitedLines(lines.join('\n'), ';');
  }
  return parseBlankDelimitedLines(text, ';');
}
