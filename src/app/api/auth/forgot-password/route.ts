import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { jsonResponse, readJson } from '@/lib/http';
import { getAppUrl, sendMail } from '@/lib/mailer';

type Body = { email: string };

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const email = body.email.trim().toLowerCase();

    // Always return ok to prevent account enumeration
    const okResponse = jsonResponse({ ok: true });

    if (!email) return okResponse;

    const user = await prisma.authUser.findUnique({ where: { email } });
    if (!user) return okResponse;

    const appUrl = getAppUrl();
    if (!appUrl) {
      // If no APP_URL configured, still don't leak; treat as ok
      return okResponse;
    }

    const token = randomToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: email,
      subject: 'Восстановление пароля BAR BOSS ONLINE',
      text: `Вы запросили восстановление пароля.\n\nСсылка для сброса пароля (действует 1 час):\n${link}\n\nЕсли это были не вы — просто игнорируйте письмо.`,
      html: `<p>Вы запросили восстановление пароля.</p>
<p><a href="${link}">Сбросить пароль</a> (действует 1 час)</p>
<p>Если это были не вы — просто игнорируйте письмо.</p>`,
    });

    return okResponse;
  } catch {
    // Still return ok to prevent enumeration
    return jsonResponse({ ok: true });
  }
}

