import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Ensures the Firebase Admin app is initialized, but only once.
 * Subsequent calls will return the existing initialized instances.
 * This is the standard pattern for Next.js server-side environments.
 */
export function initializeAdminApp() {
  // Check if the default app is already initialized
  if (admin.apps.length > 0 && admin.apps[0]) {
    return {
      app: admin.apps[0],
      db: admin.firestore(),
      auth: admin.auth(),
    };
  }

  // Initialize the app with explicit credentials and project ID for reliability
  const app = admin.initializeApp({
    // CRITICAL FIX: Use the full config for server-side initialization
    // instead of relying on applicationDefault which may not be configured.
    credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: firebaseConfig.projectId,
  });

  return {
    app,
    db: admin.firestore(),
    auth: admin.auth(),
  };
}
