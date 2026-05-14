import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, statusFromApiError } from '@/lib/http';
import { resolveWorkingBarContext } from '@/lib/bar-access';

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    const suppliers = await prisma.supplier.findMany({
      where: { barId },
      orderBy: { updatedAt: 'desc' },
    });
    return jsonResponse({ ok: true, suppliers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
