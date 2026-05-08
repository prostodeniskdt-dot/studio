import { jsonResponse } from '@/lib/http';
import { clearSession, sessionCookieHeader } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    await clearSession(req);
  } catch {
    // ignore
  }
  return jsonResponse(
    { ok: true },
    { headers: { 'set-cookie': sessionCookieHeader('', { clear: true }) } }
  );
}

