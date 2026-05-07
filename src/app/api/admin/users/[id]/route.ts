import { prisma } from '@/lib/db';
import { requireFirebaseUserId } from '@/lib/firebase-admin';
import { jsonResponse, readJson } from '@/lib/http';

async function requireAdmin(uid: string) {
  const profile = await prisma.userProfile.findUnique({ where: { id: uid } });
  if (!profile) throw new Error('No profile');
  if (profile.role !== 'admin') throw new Error('Forbidden');
  return profile;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUid = await requireFirebaseUserId(req);
    await requireAdmin(adminUid);
    const { id } = await ctx.params;

    const user = await prisma.userProfile.findUnique({ where: { id } });
    if (!user) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    const suppliers = await prisma.supplier.findMany({ where: { barId: `bar_${id}` }, orderBy: { updatedAt: 'desc' } });
    return jsonResponse({ ok: true, user, suppliers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: msg === 'Forbidden' ? 403 : 401 });
  }
}

type PatchBody = { isBanned?: boolean };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUid = await requireFirebaseUserId(req);
    await requireAdmin(adminUid);
    const { id } = await ctx.params;
    const body = await readJson<PatchBody>(req);

    if (id === adminUid) return jsonResponse({ ok: false, error: 'Cannot ban self' }, { status: 400 });
    const updated = await prisma.userProfile.update({
      where: { id },
      data: { ...(body.isBanned !== undefined ? { isBanned: body.isBanned } : {}) },
    });
    return jsonResponse({ ok: true, user: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: msg === 'Forbidden' ? 403 : 400 });
  }
}

