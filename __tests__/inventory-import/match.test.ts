import { findBestProductMatch } from '@/lib/inventory-import/match';
import type { BlankParsedRow } from '@/lib/inventory-import/types';

const candidates = [
  { id: '1', name: 'ВИ Джемисон Нейчерал Страт', barcode: null, externalCode: '00666', isPremix: false },
  { id: '2', name: 'ВИ Мартини Бистро', barcode: null, externalCode: '00999', isPremix: false },
];

function row(partial: Partial<BlankParsedRow> & Pick<BlankParsedRow, 'name'>): BlankParsedRow {
  return {
    group: '',
    code: '',
    barcode: '',
    unitRaw: 'л',
    quantityFact: null,
    ...partial,
  };
}

describe('findBestProductMatch', () => {
  it('matches barcode', () => {
    const r = row({ barcode: '4800028001234', name: 'Х' });
    const pool = [
      { id: 'a', name: 'Джемисон', barcode: '4800028001234', externalCode: null, isPremix: false },
    ];
    const m = findBestProductMatch(r, pool, false);
    expect(m?.productId).toBe('a');
  });

  it('matches external code', () => {
    const m = findBestProductMatch(row({ code: '00666', name: 'Другое имя' }), candidates, false);
    expect(m?.productId).toBe('1');
  });

  it('fuzzy name', () => {
    const r = row({ name: 'Мартини Росо' });
    const pool = [
      { id: 'x', name: 'Мартини Россо', barcode: null, externalCode: null, isPremix: false },
    ];
    const m = findBestProductMatch(r, pool, false);
    expect(m?.productId).toBe('x');
  });
});
