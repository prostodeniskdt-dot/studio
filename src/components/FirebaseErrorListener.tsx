'use client';

import { useState, useEffect, useCallback } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { logger } from '@/lib/logger';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Instead of crashing the app, it logs errors and allows components to handle them gracefully.
 */
export function FirebaseErrorListener() {
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // The callback logs the error but doesn't crash the app
    const handleError = (error: FirestorePermissionError) => {
      logger.error('Firestore Permission Error:', {
        path: error.request.path,
        operation: error.request.method,
        auth: error.request.auth,
      });
      
      // Increment error count to trigger re-render (for potential UI updates)
      // But don't throw - let components handle errors through their error states
      setErrorCount(prev => prev + 1);
    };

    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // This component renders nothing and doesn't throw errors
  // Components should handle errors through their own error states
  return null;
}
