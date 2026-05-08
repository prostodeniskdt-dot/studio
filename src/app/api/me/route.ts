import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson } from '@/lib/http';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const profile = await prisma.userProfile.findUnique({ where: { id: uid } });
    return jsonResponse({ ok: true, profile });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
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

