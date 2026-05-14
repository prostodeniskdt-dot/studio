import { createHash } from 'crypto';
import type { BlankParsedRow } from './types';
import { rowFingerprintKey } from './normalize';

export function listImportFingerprint(rows: BlankParsedRow[]): string {
  const keys = rows.map((r) => rowFingerprintKey(r)).sort();
  return createHash('sha256').update(keys.join('\n')).digest('hex');
}
