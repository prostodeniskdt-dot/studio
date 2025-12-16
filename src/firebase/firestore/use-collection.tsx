'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

// Define a type for Firestore queries/references that might have our memoization flag.
type Memoizable<T> = T & { __memo?: boolean };

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT: The query or reference passed to this hook MUST be memoized,
 * preferably using the `useMemoFirebase` hook, to prevent infinite re-renders.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The memoized Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: Memoizable<CollectionReference<DocumentData> | Query<DocumentData>> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const { user, isUserLoading } = useUser();
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start as loading
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query isn't ready or user is not authenticated, set state accordingly.
    // This prevents queries with `auth: null`.
    if (!memoizedTargetRefOrQuery || !user) {
      // Don't set loading to true if the user is just loading, wait for user object
      if (!isUserLoading) {
        setIsLoading(false);
      }
      setData(null);
      setError(null);
      return;
    }
    
    // Developer check: Ensure the passed query is memoized to prevent bugs.
    if (!memoizedTargetRefOrQuery.__memo) {
      console.error(
        'useCollection Error: The query/reference was not created with useMemoFirebase. This can lead to infinite loops. Please wrap the query creation in useMemoFirebase.',
        memoizedTargetRefOrQuery
      );
    }


    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // This logic extracts the path from either a ref or a query
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();

        // Only emit permission errors for actual permission-denied errors
        // Other errors (network, etc.) should be handled differently
        if (error.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });

          setError(contextualError);
          setData(null);
          setIsLoading(false);

          // trigger global error propagation (but don't crash the app)
          // The error is set in state, so components can handle it gracefully
          errorEmitter.emit('permission-error', contextualError);
        } else {
          // For other errors, just set the error state without emitting
          setError(error);
          setData(null);
          setIsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, user, isUserLoading]); // Re-run if the target query/reference or user state changes.

  return { data, isLoading, error };
}
