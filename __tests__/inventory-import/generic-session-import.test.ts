import { decodeCsvBuffer } from '@/lib/inventory-import/parse-csv';
import { tryGenericInventoryRowsFromText } from '@/lib/inventory-import/generic-session-import';
import { parseSessionUploadBuffer } from '@/lib/inventory-import/parse-session-upload';

describe('tryGenericInventoryRowsFromText', () => {
  it('reads extra columns (name in col 0, number on the right)', () => {
    const rows = tryGenericInventoryRowsFromText('Продукт\tЦена\tОстаток\nВодка\t100\t750\n');
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(1);
    expect(rows![0].name).toBe('Водка');
    expect(rows![0].quantityFact).toBe(750);
  });

  it('skips header line when detected', () => {
    const rows = tryGenericInventoryRowsFromText(
      'Товар;Поле;Кол-во\n' + 'Rum;ignored;2,5\n'
    );
    expect(rows!.length).toBe(1);
    expect(rows![0].quantityFact).toBe(2.5);
  });
});

describe('decodeCsvBuffer UTF-16', () => {
  it('decodes UTF-16 LE with BOM', () => {
    const payload = 'Наименование;Остаток\nВодка;50\n';
    const body = Buffer.from(payload, 'utf16le');
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), body]);
    const text = decodeCsvBuffer(buf);
    expect(text).toContain('Наименование');
    expect(text).toContain('Водка');
  });
});

describe('parseSessionUploadBuffer generic fallback', () => {
  it('accepts CSV without strict inventory headers', async () => {
    const csv = 'Товар,Склад,Шт\nJameson,склад А,3\n';
    const parsed = await parseSessionUploadBuffer(Buffer.from(csv, 'utf8'), 'stock.csv');
    expect(parsed.kind).toBe('accountant_blank');
    if (parsed.kind === 'accountant_blank') {
      expect(parsed.rows.some((r) => r.name.includes('Jameson'))).toBe(true);
    }
  });
});
