import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse } from '@/lib/http';

async function requireAdmin(uid: string) {
  const profile = await prisma.userProfile.findUnique({ where: { id: uid } });
  if (!profile) throw new Error('No profile');
  if (profile.role !== 'admin') throw new Error('Forbidden');
  return profile;
}

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    await requireAdmin(uid);

    const users = await prisma.userProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse({ ok: true, users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: msg === 'Forbidden' ? 403 : 401 });
  }
}

