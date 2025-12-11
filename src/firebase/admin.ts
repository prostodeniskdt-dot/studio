import * as admin from 'firebase-admin';

/**
 * Ensures the Firebase Admin app is initialized, but only once.
 * Subsequent calls will return the existing initialized instances.
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

  // Initialize the app. In a managed environment like App Hosting,
  // initializeApp() automatically discovers credentials.
  const app = admin.initializeApp();

  return {
    app,
    db: admin.firestore(),
    auth: admin.auth(),
  };
}
