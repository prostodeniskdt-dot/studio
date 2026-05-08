import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const barId = barIdFromUid(uid);
    const sessions = await prisma.inventorySession.findMany({
      where: { barId },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse({ ok: true, sessions });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
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
    const barId = barIdFromUid(uid);
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
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

