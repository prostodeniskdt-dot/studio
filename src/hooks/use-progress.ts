'use client';

import { useState, useCallback, useRef } from 'react';

export interface ProgressOptions {
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * Hook for tracking progress of long-running operations.
 * Useful for showing progress bars during batch operations.
 * 
 * @param total Total number of items to process
 * @param options Optional callbacks for progress updates
 * @returns Object with progress state and update function
 */
export function useProgress(
  total: number,
  options: ProgressOptions = {}
): {
  progress: number;
  percentage: number;
  increment: () => void;
  reset: () => void;
  setProgress: (value: number) => void;
} {
  const [progress, setProgressState] = useState(0);
  const progressRef = useRef(0);

  const setProgress = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(total, value));
    progressRef.current = clampedValue;
    setProgressState(clampedValue);
    
    const percentage = total > 0 ? Math.round((clampedValue / total) * 100) : 0;
    options.onProgress?.(percentage);
    
    if (clampedValue >= total) {
      options.onComplete?.();
    }
  }, [total, options]);

  const increment = useCallback(() => {
    setProgress(progressRef.current + 1);
  }, [setProgress]);

  const reset = useCallback(() => {
    progressRef.current = 0;
    setProgressState(0);
  }, []);

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return {
    progress,
    percentage,
    increment,
    reset,
    setProgress,
  };
}

