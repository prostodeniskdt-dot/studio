'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Firestore, collection, query, onSnapshot, QueryConstraint, Unsubscribe } from 'firebase/firestore';
import { logger } from '@/lib/logger';

/**
 * Optimized hook for loading related subcollections with real-time updates.
 * Uses onSnapshot instead of getDocs for better performance and real-time sync.
 * 
 * @template T The type of items in the subcollection
 * @param firestore Firestore instance
 * @param parentIds Array of parent document IDs
 * @param buildPath Function to build the collection path for a parent ID
 * @param queryConstraints Optional query constraints (where, orderBy, etc.)
 * @returns Object with data map, loading state, and error
 */
export function useRelatedCollectionRealtime<T extends { id: string }>(
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
  const unsubscribeRefs = useRef<Map<string, Unsubscribe>>(new Map());

  // Memoize parentIds to prevent unnecessary re-subscriptions
  const parentIdsKey = useMemo(() => parentIds.join(','), [parentIds.join(',')]);
  
  // Memoize query constraints string to prevent unnecessary re-subscriptions
  const queryConstraintsKey = useMemo(() => 
    queryConstraints ? JSON.stringify(queryConstraints) : '', 
    [queryConstraints ? JSON.stringify(queryConstraints) : '']
  );

  useEffect(() => {
    if (!firestore || parentIds.length === 0) {
      setData({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Unsubscribe from previous subscriptions
    unsubscribeRefs.current.forEach((unsubscribe) => {
      unsubscribe();
    });
    unsubscribeRefs.current.clear();

    const newData: Record<string, T[]> = {};
    let loadedCount = 0;
    const totalCount = parentIds.length;

    // Subscribe to each subcollection
    parentIds.forEach((parentId) => {
      try {
        const path = buildPath(parentId);
        const colRef = collection(firestore, path);
        const q = queryConstraints 
          ? query(colRef, ...queryConstraints)
          : colRef;
        
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            newData[parentId] = snapshot.docs.map(doc => ({ 
              ...doc.data(), 
              id: doc.id 
            } as T));
            
            loadedCount++;
            
            // Update state when all collections are loaded
            if (loadedCount === totalCount) {
              setData({ ...newData });
              setIsLoading(false);
            } else {
              // Partial update for better UX
              setData(prev => ({ ...prev, ...newData }));
            }
          },
          (err) => {
            logger.error(`Error in real-time subscription for ${parentId}:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
            loadedCount++;
            
            if (loadedCount === totalCount) {
              setIsLoading(false);
            }
          }
        );

        unsubscribeRefs.current.set(parentId, unsubscribe);
      } catch (err) {
        logger.error(`Error setting up subscription for ${parentId}:`, err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        loadedCount++;
        
        if (loadedCount === totalCount) {
          setIsLoading(false);
        }
      }
    });

    // Cleanup function
    return () => {
      unsubscribeRefs.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      unsubscribeRefs.current.clear();
    };
  }, [firestore, parentIdsKey, buildPath, queryConstraintsKey]);

  return { data, isLoading, error };
}

