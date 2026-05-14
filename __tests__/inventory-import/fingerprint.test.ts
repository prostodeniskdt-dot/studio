import { listImportFingerprint } from '@/lib/inventory-import/fingerprint';
import type { BlankParsedRow } from '@/lib/inventory-import/types';

describe('listImportFingerprint', () => {
  it('same rows different order => same hash', () => {
    const a: BlankParsedRow[] = [
      {
        group: '',
        code: '1',
        barcode: '',
        name: 'A',
        unitRaw: '',
        quantityFact: 1,
      },
      {
        group: '',
        code: '2',
        barcode: '',
        name: 'B',
        unitRaw: '',
        quantityFact: 2,
      },
    ];
    const b = [a[1], a[0]];
    expect(listImportFingerprint(a)).toBe(listImportFingerprint(b));
  });
});
