import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, statusFromApiError } from '@/lib/http';
import { getOwnedBarIdOrThrow } from '@/lib/bar-access';

export async function DELETE(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const uid = await requireUserId(req);
    const barId = await getOwnedBarIdOrThrow(uid);
    const { userId: memberUserId } = await ctx.params;

    const deleted = await prisma.barMember.deleteMany({
      where: { barId, userId: memberUserId },
    });
    if (deleted.count === 0) {
      return jsonResponse({ ok: false, error: 'Участник не найден' }, { status: 404 });
    }
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
