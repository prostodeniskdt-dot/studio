import type { User } from 'firebase/auth';

export async function getIdTokenOrThrow(user: User | null) {
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
}

