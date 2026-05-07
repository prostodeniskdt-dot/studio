import { prisma } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/firebase-admin';
import { jsonResponse } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

export async function POST(req: Request) {
  try {
    const decoded = await requireFirebaseUser(req);
    const uid = decoded.uid;
    const barId = barIdFromUid(uid);

    // Create/update user & bar shell records if missing
    const user = await prisma.userProfile.upsert({
      where: { id: uid },
      create: {
        id: uid,
        displayName: decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
        email: decoded.email ?? `${uid}@unknown.local`,
        role: 'manager',
      },
      update: {
        displayName: decoded.name ?? decoded.email?.split('@')[0] ?? undefined,
        email: decoded.email ?? undefined,
      },
    });

    await prisma.bar.upsert({
      where: { id: barId },
      create: {
        id: barId,
        name: `Бар ${user.displayName || uid.slice(0, 5)}`,
        location: 'Не указано',
        ownerUserId: uid,
      },
      update: {},
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
  }
}

