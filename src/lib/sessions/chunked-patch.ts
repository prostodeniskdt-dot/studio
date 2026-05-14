import type { InventoryLine, InventorySession } from '@/lib/types';

/** Размер пачки для PATCH /api/sessions/[id] (остатки строк в одном JSON). */
export const SESSION_PATCH_LINES_CHUNK_SIZE = 75;

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type SessionPatchAddLine = {
  productId: string;
  stockMode?: 'volume_ml' | 'pieces';
  endStock?: number;
};

export type SessionPatchUpsertLine = {
  id: string;
  productId: string;
  stockMode?: 'volume_ml' | 'pieces';
  startStock: number;
  purchases: number;
  sales: number;
  endStock: number;
  theoreticalEndStock: number;
  differenceVolume: number;
  differenceMoney: number;
  differencePercent: number;
};

/**
 * Несколько последовательных PATCH: сначала все чанки addProductLines, затем все чанки upsertLines
 * (как одна логическая операция на сервере, но без гигантского тела запроса).
 */
export async function patchInventorySessionInLineChunks(
  sessionId: string,
  payload: {
    addProductLines?: SessionPatchAddLine[];
    upsertLines?: SessionPatchUpsertLine[];
  }
): Promise<{ session: InventorySession | null; lines: InventoryLine[] }> {
  const addParts = payload.addProductLines ?? [];
  const upsertParts = payload.upsertLines ?? [];

  let lastSession: InventorySession | null = null;
  let lastLines: InventoryLine[] = [];

  async function runPatch(body: Record<string, unknown>) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const jb = await res.json();
    if (!res.ok || jb?.ok === false) {
      throw new Error(jb?.error || 'Ошибка сохранения строк инвентаризации');
    }
    if (jb.session !== undefined) lastSession = jb.session ?? null;
    if (Array.isArray(jb.lines)) lastLines = jb.lines as InventoryLine[];
  }

  for (const chunk of chunkArray(addParts, SESSION_PATCH_LINES_CHUNK_SIZE)) {
    await runPatch({ addProductLines: chunk });
  }

  for (const chunk of chunkArray(upsertParts, SESSION_PATCH_LINES_CHUNK_SIZE)) {
    await runPatch({ upsertLines: chunk });
  }

  return { session: lastSession, lines: lastLines };
}
