import { parseSessionImportText } from '@/lib/inventory-import/session-file-import';
import { parseBlankDelimitedLines } from '@/lib/inventory-import/parse-delimited-text';

const SAMPLE_CUID = 'cl123456789012345678901';

describe('parseSessionImportText', () => {
  it('parses app export (semicolon header from «Экспорт в CSV»)', () => {
    const raw =
      `\uFEFF` +
      '"Наименование продукта";"Фактический остаток (мл)"\r\n' +
      '"Водка Беленькая 0.5 л";750';
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('app_export');
    if (p.kind === 'app_export') {
      expect(p.bodyLines.length).toBe(1);
      expect(p.delimiter).toBe(';');
    }
  });

  it('detects app export saved as tab-separated (Excel)', () => {
    const raw =
      `"Наименование продукта"\t"Фактический остаток (мл)"\n` + `"Джин"\t250`;
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('app_export');
    if (p.kind === 'app_export') {
      expect(p.delimiter).toBe('\t');
    }
  });

  it('detects legacy_id with comma delimiter', () => {
    const raw = `productId,name,start,purch,sales,end\n${SAMPLE_CUID},x,1,2,3,4\n`;
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('legacy_id');
    if (p.kind === 'legacy_id') {
      expect(p.delimiter).toBe(',');
      expect(p.bodyLines[0]).toContain(SAMPLE_CUID);
    }
  });

  it('detects legacy_id with semicolon delimiter', () => {
    const raw = `productId;name;start;purch;sales;end\n${SAMPLE_CUID};x;1;2;3;4\n`;
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('legacy_id');
    if (p.kind === 'legacy_id') {
      expect(p.delimiter).toBe(';');
    }
  });

  it('detects legacy_id with tab delimiter', () => {
    const raw = `ProductID\tName\tStart\tPurch\tSales\tEnd\t\n${SAMPLE_CUID}\tx\t1\t2\t3\t4\n`;
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('legacy_id');
    if (p.kind === 'legacy_id') {
      expect(p.delimiter).toBe('\t');
    }
  });

  it('detects legacy_id when header hints productId but first data row is later', () => {
    const raw = `ProductID,Start,Purchases,Sales,End\nmeta,0,0,0,0\n${SAMPLE_CUID},10,0,0,500\n`;
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('legacy_id');
    if (p.kind === 'legacy_id') {
      expect(p.delimiter).toBe(',');
    }
  });

  it('does not treat accountant header + «Факт» column as app export', () => {
    const raw = 'Код;Наименование;Ед. изм.;Фактический остаток\n001;Водка;л;1.5\n';
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('accountant_blank');
  });

  it('parses compact accountant blank (Код;Наименование;Ед. изм.)', () => {
    const raw = 'Код;Наименование;Ед. изм.;Факт\n001;Водка;л;1.5\n';
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('accountant_blank');
    if (p.kind === 'accountant_blank') {
      expect(p.rows.length).toBe(1);
      expect(p.rows[0].code).toBe('001');
      expect(p.rows[0].name).toBe('Водка');
      expect(p.rows[0].unitRaw).toBe('л');
      expect(p.rows[0].quantityFact).toBe(1.5);
    }
  });

  it('returns unknown for single line', () => {
    expect(parseSessionImportText('only one line').kind).toBe('unknown');
  });
});

describe('parseBlankDelimitedLines compact', () => {
  it('parses comma-separated compact header', () => {
    const raw = 'Код,Наименование,Ед. изм.,Кол-во\n99,Ром,мл,100\n';
    const rows = parseBlankDelimitedLines(raw, ',');
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Ром');
    expect(rows[0].quantityFact).toBe(100);
  });

  it('parses TAB compact with synonyms (Артикул / Название / Единица измерения)', () => {
    const raw = 'Артикул\tНазвание\tЕдиница измерения\tКол-во\n777\tБурбон\tмл\t50\n';
    const rows = parseBlankDelimitedLines(raw, '\t');
    expect(rows.length).toBe(1);
    expect(rows[0].code).toBe('777');
    expect(rows[0].name).toBe('Бурбон');
    expect(rows[0].quantityFact).toBe(50);
  });

  it('parses accountant_blank from TSV via parseSessionImportText', () => {
    const raw = 'Код\tНаименование\tЕд. изм.\tФакт\t\n8\tЛикёр\tшт\t12\n';
    const p = parseSessionImportText(raw);
    expect(p.kind).toBe('accountant_blank');
    if (p.kind === 'accountant_blank') expect(p.rows[0].name).toBe('Ликёр');
  });
});
