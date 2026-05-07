import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set (required to verify Firebase ID tokens).');
  }

  initializeApp({ credential: cert(JSON.parse(keyJson)) });
}

export async function requireFirebaseUserId(req: Request): Promise<string> {
  const decoded = await requireFirebaseUser(req);
  return decoded.uid;
}

export async function requireFirebaseUser(req: Request) {
  initFirebaseAdmin();

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Missing Authorization: Bearer <token>');

  const token = match[1];
  return await getAuth().verifyIdToken(token);
}

