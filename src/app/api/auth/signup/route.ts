import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { jsonResponse, readJson } from '@/lib/http';
import { createSessionForUser, sessionCookieHeader } from '@/lib/auth-server';
import { isAdminEmail } from '@/lib/admin';
import bcrypt from 'bcryptjs';

type Body = {
  email: string;
  password: string;
  displayName: string;
  city?: string;
  establishment?: string;
  phone?: string;
  socialLink?: string;
};

function barIdFromUserId(userId: string) {
  return `bar_${userId}`;
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const displayName = body.displayName.trim();

    if (!email || !password || password.length < 6 || !displayName) {
      return jsonResponse({ ok: false, error: 'Invalid signup data' }, { status: 400 });
    }

    const exists = await prisma.authUser.findUnique({ where: { email } });
    if (exists) return jsonResponse({ ok: false, error: 'Email already in use' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    /// UserProfile must be inserted before AuthUser: AuthUser.id references UserProfile.id.
    const userId = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.create({
        data: {
          id: userId,
          displayName,
          email,
          role: isAdminEmail(email) ? 'admin' : 'manager',
          city: body.city,
          establishment: body.establishment,
          phone: body.phone,
          socialLink: body.socialLink,
        },
      });

      const authUser = await tx.authUser.create({
        data: { id: userId, email, passwordHash },
      });

      // Ensure a default bar exists for the user (keep legacy barId format)
      const barId = barIdFromUserId(userId);
      await tx.bar.upsert({
        where: { id: barId },
        create: {
          id: barId,
          name: `Бар ${displayName}`,
          ownerUserId: userId,
        },
        update: {},
      });

      return { ...authUser, profile };
    });

    const { token, expiresAt } = await createSessionForUser(created.id);

    return jsonResponse(
      { ok: true, user: { id: created.id, email: created.email, profile: created.profile } },
      { headers: { 'set-cookie': sessionCookieHeader(token, { expires: expiresAt }) } }
    );
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

