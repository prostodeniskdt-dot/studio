import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Ensures the Firebase Admin app is initialized, but only once.
 * This is the standard pattern for Next.js server-side environments.
 */
export function initializeAdminApp() {
  // Check if the default app is already initialized to prevent re-initialization.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return {
      app: admin.apps[0],
      db: admin.firestore(),
      auth: admin.auth(),
    };
  }

  // In a managed environment like App Hosting, initializeApp() with applicationDefault
  // automatically discovers credentials.
  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });

  return {
    app,
    db: admin.firestore(),
    auth: admin.auth(),
  };
}
