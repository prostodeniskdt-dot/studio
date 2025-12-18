/**
 * Firebase configuration
 * Reads from environment variables with fallback to default values for development
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && typeof defaultValue === 'undefined') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

export const firebaseConfig = {
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'studio-7924133843-7f552'),
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', '1:1074195698844:web:8053af5dbb73c80d13c959'),
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyBlCZ6QnauA_WA6ec5kjJMRpqW9DO_MUgs'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'studio-7924133843-7f552.firebaseapp.com'),
  measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', ''), // Provide a default empty string
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1074195698844'),
};

// Validate required fields in production
if (process.env.NODE_ENV === 'production') {
  const requiredFields = ['projectId', 'appId', 'apiKey', 'authDomain', 'messagingSenderId'] as const;
  for (const field of requiredFields) {
    if (!firebaseConfig[field]) {
      throw new Error(`Firebase config error: ${field} is required in production`);
    }
  }
}
