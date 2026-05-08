import crypto from 'crypto';
import { prisma } from '@/lib/db';

const SESSION_COOKIE = 'bb_session';
const SESSION_TTL_DAYS = 30;

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionCookieHeader(token: string, opts?: { expires?: Date; clear?: boolean }) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE}=${opts?.clear ? '' : token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : null,
    opts?.clear ? 'Max-Age=0' : null,
    opts?.expires ? `Expires=${opts.expires.toUTCString()}` : null,
  ].filter(Boolean);
  return parts.join('; ');
}

export async function createSessionForUser(userId: string) {
  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

function parseCookieHeader(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export async function requireUserId(req: Request) {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) throw new Error('Not authenticated');

  const tokenHash = sha256Hex(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });
  if (!session) throw new Error('Not authenticated');
  if (session.expiresAt.getTime() <= Date.now()) throw new Error('Session expired');
  return session.userId;
}

export async function getUserFromSession(req: Request) {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

export async function clearSession(req: Request) {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = sha256Hex(token);
  await prisma.authSession.deleteMany({ where: { tokenHash } });
}

