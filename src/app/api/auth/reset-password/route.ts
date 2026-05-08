import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { jsonResponse, readJson } from '@/lib/http';

type Body = { token: string; newPassword: string };

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const token = body.token;
    const newPassword = body.newPassword;
    if (!token || !newPassword || newPassword.length < 6) {
      return jsonResponse({ ok: false, error: 'Invalid data' }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);
    const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!rec) return jsonResponse({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
    if (rec.usedAt) return jsonResponse({ ok: false, error: 'Token already used' }, { status: 400 });
    if (rec.expiresAt.getTime() <= Date.now()) {
      return jsonResponse({ ok: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.authUser.update({
        where: { id: rec.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });
      await tx.authSession.deleteMany({ where: { userId: rec.userId } });
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

