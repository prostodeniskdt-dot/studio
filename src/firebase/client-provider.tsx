'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [initError, setInitError] = useState<Error | null>(null);
  const [firebaseServices, setFirebaseServices] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    try {
      // Initialize Firebase on the client side, once per component mount.
      const services = initializeFirebase();
      setFirebaseServices(services);
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      setInitError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Show error if initialization failed
  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Ошибка инициализации</h1>
          <p className="text-muted-foreground">
            Не удалось инициализировать Firebase: {initError.message}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Перезагрузить страницу
          </Button>
        </div>
      </div>
    );
  }

  // Check if services were successfully initialized
  if (!firebaseServices?.firebaseApp || !firebaseServices?.auth || !firebaseServices?.firestore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Загрузка Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}