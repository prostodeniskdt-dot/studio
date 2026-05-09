import iconv from 'iconv-lite';
import { parseBlankDelimitedLines } from './parse-delimited-text';
import type { BlankParsedRow } from './types';

function detectDelimiter(firstLine: string): ';' | ',' {
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi >= comma ? ';' : ',';
}

export function decodeCsvBuffer(buf: Buffer): string {
  const asUtf8 = buf.toString('utf8');
  const replacementCount = (asUtf8.match(/\uFFFD/g) ?? []).length;
  if (replacementCount > 2) {
    return iconv.decode(buf, 'win1251');
  }
  const mojibake =
    /Ð|Ñ|Ã|Â|ï¿½/.test(asUtf8) && /[ÐÑ]/.test(asUtf8.slice(0, 500));
  if (mojibake) {
    return iconv.decode(buf, 'win1251');
  }
  return asUtf8;
}

export function parseInventoryBlankCsv(buf: Buffer): BlankParsedRow[] {
  const text = decodeCsvBuffer(buf);
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const delimiter = detectDelimiter(firstLine);
  return parseBlankDelimitedLines(text, delimiter);
}
