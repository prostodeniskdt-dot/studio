import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { getOwnedBarIdOrThrow } from '@/lib/bar-access';

type PostBody = {
  email: string;
  role?: 'staff' | 'viewer';
};

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const barId = await getOwnedBarIdOrThrow(uid);
    const members = await prisma.barMember.findMany({
      where: { barId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true } },
      },
    });
    return jsonResponse({
      ok: true,
      barId,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
        user: m.user,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const barId = await getOwnedBarIdOrThrow(uid);
    const body = await readJson<PostBody>(req);
    const email = body.email.trim().toLowerCase();
    if (!email) {
      return jsonResponse({ ok: false, error: 'Укажите email' }, { status: 400 });
    }
    const role = body.role === 'viewer' ? 'viewer' : 'staff';

    const targetAuth = await prisma.authUser.findUnique({ where: { email } });
    if (!targetAuth) {
      return jsonResponse(
        {
          ok: false,
          error: 'Пользователь с таким email не найден. Сначала зарегистрируйте аккаунт.',
        },
        { status: 404 }
      );
    }
    if (targetAuth.id === uid) {
      return jsonResponse({ ok: false, error: 'Нельзя добавить себя в команду' }, { status: 400 });
    }

    const existing = await prisma.barMember.findUnique({
      where: { barId_userId: { barId, userId: targetAuth.id } },
    });
    if (existing) {
      return jsonResponse({ ok: false, error: 'Этот пользователь уже в команде' }, { status: 400 });
    }

    const created = await prisma.barMember.create({
      data: { barId, userId: targetAuth.id, role },
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true } },
      },
    });

    return jsonResponse({
      ok: true,
      member: {
        id: created.id,
        userId: created.userId,
        role: created.role,
        createdAt: created.createdAt.toISOString(),
        user: created.user,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
