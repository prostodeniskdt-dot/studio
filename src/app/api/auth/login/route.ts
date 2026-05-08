import { prisma } from '@/lib/db';
import { jsonResponse, readJson } from '@/lib/http';
import { createSessionForUser, sessionCookieHeader } from '@/lib/auth-server';
import bcrypt from 'bcryptjs';

type Body = { email: string; password: string };

function barIdFromUserId(userId: string) {
  return `bar_${userId}`;
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const user = await prisma.authUser.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user) return jsonResponse({ ok: false, error: 'Invalid credentials' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return jsonResponse({ ok: false, error: 'Invalid credentials' }, { status: 401 });

    if (user.profile?.isBanned) {
      return jsonResponse({ ok: false, error: 'User is banned' }, { status: 403 });
    }

    // Ensure bar exists (in case of legacy data)
    const barId = barIdFromUserId(user.id);
    await prisma.bar.upsert({
      where: { id: barId },
      create: { id: barId, name: `Бар ${user.profile?.displayName ?? user.email}`, ownerUserId: user.id },
      update: {},
    });

    const { token, expiresAt } = await createSessionForUser(user.id);
    return jsonResponse(
      { ok: true, user: { id: user.id, email: user.email, profile: user.profile } },
      { headers: { 'set-cookie': sessionCookieHeader(token, { expires: expiresAt }) } }
    );
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

