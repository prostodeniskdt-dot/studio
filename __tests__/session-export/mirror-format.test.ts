import {
  DEFAULT_EXPORT_PREF,
  preferenceFromImport,
  buildSessionExportAoa,
} from '@/lib/session-export/mirror-format';
import type { ParsedSessionFile } from '@/lib/inventory-import/session-file-import';

describe('preferenceFromImport', () => {
  it('detects xlsx + two_col from app_export filename', () => {
    const f = new File([''], 'Отчет.xlsx');
    const p: ParsedSessionFile = {
      kind: 'app_export',
      bodyLines: [],
      delimiter: '\t',
    };
    const pref = preferenceFromImport(f, p);
    expect(pref?.ext).toBe('xlsx');
    expect(pref?.layout).toBe('two_col');
    expect(pref?.delimiter).toBe('\t');
  });

  it('detects wide_blank when rows have codes', () => {
    const f = new File([''], 'Бланк.csv');
    const p: ParsedSessionFile = {
      kind: 'accountant_blank',
      rows: [{ group: '', code: '1', barcode: '', name: 'A', unitRaw: 'шт', quantityFact: 1 }],
    };
    const pref = preferenceFromImport(f, p);
    expect(pref?.layout).toBe('wide_blank');
  });
});

describe('buildSessionExportAoa', () => {
  it('defaults two_col matches DEFAULT_EXPORT_PREF', () => {
    const lines = [
      {
        id: 'l1',
        inventorySessionId: 's1',
        productId: 'p1',
        stockMode: 'volume_ml' as const,
        startStock: 0,
        purchases: 0,
        sales: 0,
        endStock: 100,
        theoreticalEndStock: 0,
        differenceVolume: 0,
        differenceMoney: 0,
        differencePercent: 0,
        createdAt: '',
        updatedAt: '',
      },
    ];
    const products = new Map([
      ['p1', { id: 'p1', name: 'Водка', category: 'Vodka', bottleVolumeMl: 500, isActive: true, createdAt: '', updatedAt: '' } as any],
    ]);
    const aoa = buildSessionExportAoa(DEFAULT_EXPORT_PREF, lines, products, {});
    expect(aoa[0]).toEqual(['Наименование продукта', 'Фактический остаток (мл)']);
    expect(aoa[1][0]).toContain('Водка');
  });
});
