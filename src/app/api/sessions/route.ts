import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { assertCanWriteBar, resolveWorkingBarContext } from '@/lib/bar-access';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    const sessions = await prisma.inventorySession.findMany({
      where: { barId },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse({ ok: true, sessions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

type CreateBody = {
  session: {
    id?: string;
    name: string;
    status?: 'draft' | 'in_progress' | 'completed';
  };
};

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    await assertCanWriteBar(uid, barId);
    const body = await readJson<CreateBody>(req);
    const created = await prisma.inventorySession.create({
      data: {
        id: body.session.id ?? undefined,
        barId,
        name: body.session.name,
        status: (body.session.status ?? 'draft') as any,
        createdByUserId: uid,
      },
    });
    return jsonResponse({ ok: true, session: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

