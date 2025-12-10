import * as admin from 'firebase-admin';

export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return {
      app: admin.app(),
      db: admin.firestore(),
      auth: admin.auth(),
    };
  }
  
  const app = admin.initializeApp();

  return {
    app,
    db: admin.firestore(),
    auth: admin.auth(),
  };
}
