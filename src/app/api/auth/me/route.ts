import { jsonResponse } from '@/lib/http';
import { getUserFromSession } from '@/lib/auth-server';
import { resolveWorkingBarContext } from '@/lib/bar-access';

export async function GET(req: Request) {
  const user = await getUserFromSession(req);
  if (!user) return jsonResponse({ ok: false, error: 'Not authenticated' }, { status: 401 });

  let workingBarId: string | null = null;
  let barAccess: 'owner' | 'staff' | 'viewer' | null = null;
  try {
    const ctx = await resolveWorkingBarContext(user.id);
    workingBarId = ctx.barId;
    barAccess = ctx.access;
  } catch {
    workingBarId = null;
    barAccess = null;
  }

  return jsonResponse({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile,
      workingBarId,
      barAccess,
    },
  });
}

