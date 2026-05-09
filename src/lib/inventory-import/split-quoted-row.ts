export type SessionDelimiter = ';' | ',' | '\t';

/** Ячейки с учётом кавычек и экранирования "" */
export function splitDelimitedQuotedRow(line: string, delimiter: SessionDelimiter): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      cur += c;
    } else {
      if (c === '"') {
        inQuotes = true;
        continue;
      }
      if (c === delimiter) {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
  }
  parts.push(cur.trim());
  return parts;
}
