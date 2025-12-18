/**
 * Hook for Firestore pagination
 */

import { useState, useCallback, useMemo } from 'react';
import type { Firestore, Query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { query, limit, startAfter, getDocs, orderBy } from 'firebase/firestore';

export interface PaginationOptions {
  pageSize: number;
  orderByField: string;
  orderByDirection?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for paginated Firestore queries
 */
export function usePagination<T extends DocumentData>(
  firestore: Firestore | null,
  baseQuery: Query<DocumentData> | null,
  options: PaginationOptions
): PaginationResult<T> {
  const { pageSize, orderByField, orderByDirection = 'desc' } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const paginatedQuery = useMemo(() => {
    if (!baseQuery || !firestore) return null;
    
    let q: Query<DocumentData> = query(baseQuery, orderBy(orderByField, orderByDirection), limit(pageSize));
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    return q;
  }, [baseQuery, firestore, orderByField, orderByDirection, pageSize, lastDoc]);

  const loadData = useCallback(async (append = false) => {
    if (!paginatedQuery || !firestore || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await getDocs(paginatedQuery);
      const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
      
      if (append) {
        setData(prev => [...prev, ...newData]);
      } else {
        setData(newData);
      }

      if (snapshot.docs.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error loading paginated data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [paginatedQuery, firestore, pageSize, isLoading]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadData(true);
  }, [hasMore, isLoading, loadData]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    setData([]);
    await loadData(false);
  }, [loadData]);

  // Initial load
  useMemo(() => {
    if (paginatedQuery && !lastDoc && data.length === 0) {
      loadData(false);
    }
  }, [paginatedQuery, lastDoc, data.length, loadData]);

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

