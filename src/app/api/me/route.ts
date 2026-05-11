import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { resolveWorkingBarContext } from '@/lib/bar-access';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const profile = await prisma.userProfile.findUnique({ where: { id: uid } });
    let workingBarId: string | null = null;
    let barAccess: 'owner' | 'staff' | 'viewer' | null = null;
    try {
      const ctx = await resolveWorkingBarContext(uid);
      workingBarId = ctx.barId;
      barAccess = ctx.access;
    } catch {
      workingBarId = null;
      barAccess = null;
    }
    return jsonResponse({ ok: true, profile, workingBarId, barAccess });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

type PatchBody = {
  displayName?: string;
  city?: string | null;
  establishment?: string | null;
  phone?: string | null;
  socialLink?: string | null;
};

export async function PATCH(req: Request) {
  try {
    const uid = await requireUserId(req);
    const body = await readJson<PatchBody>(req);
    const updated = await prisma.userProfile.update({
      where: { id: uid },
      data: {
        ...(typeof body.displayName === 'string' ? { displayName: body.displayName } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.establishment !== undefined ? { establishment: body.establishment } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.socialLink !== undefined ? { socialLink: body.socialLink } : {}),
      },
    });
    return jsonResponse({ ok: true, profile: updated });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

