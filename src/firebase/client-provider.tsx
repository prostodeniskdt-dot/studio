'use client';

import React, { useState, useEffect, useRef, type ReactNode } from 'react';
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
  const [isClient, setIsClient] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setIsClient(true);
    isMountedRef.current = true;

    try {
      // Initialize Firebase on the client side, once per component mount.
      const services = initializeFirebase();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setFirebaseServices(services);
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : String(error);
        const firebaseError = error instanceof Error 
          ? error 
          : new Error(`Firebase initialization failed: ${errorMessage}`);
        setInitError(firebaseError);
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // During SSR or before hydration, show loading state
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

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
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
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