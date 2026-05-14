import type { InventorySession } from '@/lib/types';

function toMs(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

/** Самая «свежая» инвентаризация в работе — для калькулятора при нескольких активных сессиях. */
export function pickLatestInProgressSession(
  sessions: InventorySession[] | null | undefined
): InventorySession | undefined {
  const active = (sessions ?? []).filter((s) => s.status === 'in_progress');
  if (active.length === 0) return undefined;
  return [...active].sort((a, b) => {
    const aMs = Math.max(toMs((a as { updatedAt?: unknown }).updatedAt), toMs(a.createdAt));
    const bMs = Math.max(toMs((b as { updatedAt?: unknown }).updatedAt), toMs(b.createdAt));
    return bMs - aMs;
  })[0];
}
