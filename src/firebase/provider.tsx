'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { logger } from '@/lib/logger';
import { errorMonitor } from '@/lib/error-monitor';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Augment the User type to include the firestore instance
export type UserWithFirestore = User & {
    firestore: Firestore;
};

// Internal state for user authentication
interface UserAuthState {
  user: UserWithFirestore | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: UserWithFirestore | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: UserWithFirestore | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: UserWithFirestore | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            // Augment user object with firestore instance
            const userWithFirestore: UserWithFirestore = Object.assign(firebaseUser, { firestore });
            setUserAuthState({ user: userWithFirestore, isUserLoading: false, userError: null });
            // Set user context in error monitor for Sentry
            errorMonitor.setUser(firebaseUser.uid, firebaseUser.email || undefined, firebaseUser.displayName || undefined);
        } else {
            setUserAuthState({ user: null, isUserLoading: false, userError: null });
            // Clear user context when user logs out
            errorMonitor.clearUser();
        }
      },
      (error) => { // Auth listener error
        logger.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
        // Capture auth errors in error monitor
        errorMonitor.captureException(error instanceof Error ? error : new Error(String(error)), {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore]); // Depends on the auth and firestore instances

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoizedFirebaseObject<T> = T & { __memo?: boolean };

/**
 * Memoizes a Firestore query or document reference. This is critical for preventing
 * infinite loops in hooks like `useCollection` and `useDoc` that have object
 * dependencies.
 *
 * It attaches a `__memo` flag to the created object to allow hooks to verify
 * that the reference/query has been properly memoized.
 *
 * @param factory A function that creates the Firestore query or reference.
 * @param deps The dependency array for the `useMemo` hook.
 * @returns The memoized query/reference, or null if the factory returns null.
 */
export function useMemoFirebase<T extends object | null>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(() => {
    try {
      const value = factory();
      if (value) {
        // Add a non-enumerable property to mark the object as memoized.
        Object.defineProperty(value, '__memo', {
          value: true,
          writable: false,
          enumerable: false,
        });
      }
      return value;
    } catch (err) {
        logger.error("[useMemoFirebase] Factory function failed during execution:", err);
        return null as T;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return memoized as T;
}


/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { 
  const { user, isUserLoading, userError } = useFirebase(); 
  return { user, isUserLoading, userError };
};
