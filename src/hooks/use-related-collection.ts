'use client';

import { useState, useEffect, useRef } from 'react';
import { Firestore, collection, query, getDocs, QueryConstraint } from 'firebase/firestore';
import { logger } from '@/lib/logger';

/**
 * Hook for loading related subcollections efficiently.
 * Handles race conditions and cleanup properly.
 * 
 * @template T The type of items in the subcollection
 * @param firestore Firestore instance
 * @param parentIds Array of parent document IDs
 * @param buildPath Function to build the collection path for a parent ID
 * @param queryConstraints Optional query constraints (where, orderBy, etc.)
 * @returns Object with data map, loading state, and error
 */
export function useRelatedCollection<T extends { id: string }>(
  firestore: Firestore | null,
  parentIds: string[],
  buildPath: (parentId: string) => string,
  queryConstraints?: QueryConstraint[]
): {
  data: Record<string, T[]>;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<Record<string, T[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!firestore || parentIds.length === 0) {
      setData({});
      setIsLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const promises = parentIds.map(async (parentId) => {
          const path = buildPath(parentId);
          const colRef = collection(firestore, path);
          const q = queryConstraints 
            ? query(colRef, ...queryConstraints)
            : colRef;
          
          const snapshot = await getDocs(q);
          return {
            parentId,
            items: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T))
          };
        });

        const results = await Promise.all(promises);
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        const dataMap = results.reduce((acc, result) => {
          acc[result.parentId] = result.items;
          return acc;
        }, {} as Record<string, T[]>);

        setData(dataMap);
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error('Error fetching related collection:', error);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchAll();

    return () => {
      abortController.abort();
    };
  }, [firestore, parentIds.join(','), JSON.stringify(queryConstraints)]);

  return { data, isLoading, error };
}

