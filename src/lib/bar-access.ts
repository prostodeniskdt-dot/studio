import { prisma } from '@/lib/db';

/** Id бара-«кабинета» владельца (как при регистрации / логине). */
export function ownedBarId(userId: string): string {
  return `bar_${userId}`;
}

export type BarAccessLevel = 'owner' | 'staff' | 'viewer';

export async function getBarAccessForUser(userId: string, barId: string): Promise<BarAccessLevel | null> {
  const bar = await prisma.bar.findUnique({
    where: { id: barId },
    select: { ownerUserId: true },
  });
  if (!bar) return null;
  if (bar.ownerUserId === userId) return 'owner';

  const member = await prisma.barMember.findUnique({
    where: { barId_userId: { barId, userId } },
  });
  if (!member) return null;
  return member.role === 'viewer' ? 'viewer' : 'staff';
}

/**
 * Бар по умолчанию для дашборда: если пользователь приглашён в чужой бар — работаем там;
 * иначе в своём баре `bar_<userId>`.
 */
export async function resolveWorkingBarContext(userId: string): Promise<{
  barId: string;
  access: BarAccessLevel;
}> {
  const membership = await prisma.barMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (membership) {
    return {
      barId: membership.barId,
      access: membership.role === 'viewer' ? 'viewer' : 'staff',
    };
  }

  const id = ownedBarId(userId);
  const bar = await prisma.bar.findUnique({ where: { id }, select: { id: true } });
  if (!bar) {
    throw new Error('Bar not initialized');
  }
  return { barId: id, access: 'owner' };
}

export async function assertCanWriteBar(userId: string, barId: string): Promise<void> {
  const access = await getBarAccessForUser(userId, barId);
  if (!access || access === 'viewer') {
    throw new Error('Forbidden');
  }
}

export async function assertCanReadBar(userId: string, barId: string): Promise<void> {
  const access = await getBarAccessForUser(userId, barId);
  if (!access) {
    throw new Error('Forbidden');
  }
}

/** Бар, которым владеет пользователь (управление командой). */
export async function getOwnedBarIdOrThrow(userId: string): Promise<string> {
  const id = ownedBarId(userId);
  const bar = await prisma.bar.findUnique({
    where: { id },
    select: { id: true, ownerUserId: true },
  });
  if (!bar || bar.ownerUserId !== userId) {
    throw new Error('Forbidden');
  }
  return bar.id;
}
