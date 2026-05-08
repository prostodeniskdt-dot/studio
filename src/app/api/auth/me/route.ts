import { jsonResponse } from '@/lib/http';
import { getUserFromSession } from '@/lib/auth-server';

export async function GET(req: Request) {
  const user = await getUserFromSession(req);
  if (!user) return jsonResponse({ ok: false, error: 'Not authenticated' }, { status: 401 });

  return jsonResponse({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile,
    },
  });
}

