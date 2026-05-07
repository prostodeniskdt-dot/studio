import { prisma } from '@/lib/db';
import { requireFirebaseUserId } from '@/lib/firebase-admin';
import { jsonResponse } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

export async function GET(req: Request) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const suppliers = await prisma.supplier.findMany({
      where: { barId },
      orderBy: { updatedAt: 'desc' },
    });
    return jsonResponse({ ok: true, suppliers });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
  }
}

