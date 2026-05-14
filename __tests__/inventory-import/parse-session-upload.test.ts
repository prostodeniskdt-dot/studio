import { parseSessionUploadBuffer, resolveSessionImportFormat } from '@/lib/inventory-import/parse-session-upload';
import * as XLSX from 'xlsx';

describe('parseSessionUploadBuffer', () => {
  it('parses UTF-8 CSV as app_export', async () => {
    const raw =
      '\uFEFF"Наименование продукта";"Фактический остаток (мл)"\r\n' +
      '"Водка";750\r\n';
    const parsed = await parseSessionUploadBuffer(Buffer.from(raw, 'utf8'), 'export.csv');
    expect(parsed.kind).toBe('app_export');
  });

  it('sniffs PDF without extension', async () => {
    const buf = Buffer.from('%PDF-1.4\n%%EOF');
    expect(resolveSessionImportFormat('unknown', buf)).toBe('pdf');
  });

  it('parses minimal xlsx as accountant_blank or app_export', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Код', 'Наименование', 'Ед. изм.', 'Кол-во'],
      ['1', 'Ром', 'мл', '200'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const parsed = await parseSessionUploadBuffer(buf, 'inv.xlsx');
    expect(parsed.kind).toBe('accountant_blank');
    if (parsed.kind === 'accountant_blank') {
      expect(parsed.rows.length).toBeGreaterThanOrEqual(1);
      expect(parsed.rows[0].name).toContain('Ром');
    }
  });
});
