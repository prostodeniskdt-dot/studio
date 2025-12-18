/**
 * Generic hook for working with cached Firestore collections
 * Reduces code duplication across context providers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import type { Query } from 'firebase/firestore';
import { logger } from '@/lib/logger';

export interface CachedCollectionOptions<T> {
  cacheKey: string;
  cacheExpiryMs: number;
  queryFactory: (firestore: any, barId: string | null) => Query | null;
  barId: string | null;
  firestore: any;
  transformData?: (data: T[]) => T[];
}

export interface CachedCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  cache: CachedData<T> | null;
}

interface CachedData<T> {
  data: T[];
  timestamp: number;
  barId: string;
}

/**
 * Generic hook for cached Firestore collections
 */
export function useCachedCollection<T>({
  cacheKey,
  cacheExpiryMs,
  queryFactory,
  barId,
  firestore,
  transformData,
}: CachedCollectionOptions<T>): CachedCollectionResult<T> {
  const [cache, setCache] = useState<CachedData<T> | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !barId) return;

    try {
      const cached = localStorage.getItem(`${cacheKey}_${barId}`);
      if (cached) {
        const parsed: CachedData<T> = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < cacheExpiryMs && parsed.barId === barId) {
          setCache(parsed);
        } else {
          localStorage.removeItem(`${cacheKey}_${barId}`);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, [barId, cacheKey, cacheExpiryMs]);

  // Create memoized query
  const collectionQuery = useMemoFirebase(
    () => queryFactory(firestore, barId),
    [firestore, barId, forceRefresh]
  );

  // Fetch data from Firestore
  const { data, isLoading, error } = useCollection<T>(collectionQuery);

  // Transform data if transform function provided
  const transformedData = useMemo(() => {
    if (!data) return data;
    return transformData ? transformData(data) : data;
  }, [data, transformData]);

  // Handle permission errors - use cache on error
  useEffect(() => {
    if (error && cache && cache.barId === barId) {
      logger.warn(`Permission error loading ${cacheKey}, using cache:`, error);
    }
  }, [error, cache, barId, cacheKey]);

  // Save to localStorage on data load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (transformedData && transformedData.length > 0 && barId) {
      const cached: CachedData<T> = {
        data: transformedData,
        timestamp: Date.now(),
        barId,
      };
      try {
        localStorage.setItem(`${cacheKey}_${barId}`, JSON.stringify(cached));
        setCache(cached);
      } catch (e) {
        // Ignore save errors
      }
    }
  }, [transformedData, barId, cacheKey]);

  // Refresh function
  const refresh = useCallback(() => {
    if (typeof window !== 'undefined' && barId) {
      localStorage.removeItem(`${cacheKey}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId, cacheKey]);

  // Use cache if data is still loading
  const effectiveData = useMemo(
    () => transformedData || (cache?.barId === barId ? cache.data : []) || [],
    [transformedData, cache?.barId, cache?.data, barId]
  );

  const effectiveIsLoading = useMemo(
    () => isLoading && !cache,
    [isLoading, cache]
  );

  return {
    data: effectiveData,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
    cache,
  };
}

