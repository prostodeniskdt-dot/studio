'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Hook for optimistic updates with rollback capability.
 * Useful for UI updates that should appear immediately while the server processes the request.
 * 
 * @template T The type of the data being updated
 * @param initialData The initial data state
 * @param updateFn The async function that performs the actual update
 * @returns Object with data, update function, and rollback function
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
): {
  data: T;
  update: (newData: T) => Promise<void>;
  rollback: () => void;
  isUpdating: boolean;
} {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousDataRef = useRef<T>(initialData);

  const update = useCallback(async (newData: T) => {
    // Save current state for potential rollback
    previousDataRef.current = data;
    
    // Optimistically update UI
    setData(newData);
    setIsUpdating(true);

    try {
      // Perform actual update
      const result = await updateFn(newData);
      setData(result);
    } catch (error) {
      // Rollback on error
      setData(previousDataRef.current);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [data, updateFn]);

  const rollback = useCallback(() => {
    setData(previousDataRef.current);
    setIsUpdating(false);
  }, []);

  return { data, update, rollback, isUpdating };
}

