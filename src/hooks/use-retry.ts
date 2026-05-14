'use client';

import { useState, useCallback } from 'react';

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delay: 1000,
  exponentialBackoff: true,
};

/**
 * Hook for retrying async operations with exponential backoff.
 * 
 * @template T The return type of the async function
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns Object with execute function, loading state, and error
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): {
  execute: () => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const config = { ...DEFAULT_OPTIONS, ...options };

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;
    let delay = config.delay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await fn();
        setIsLoading(false);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < config.maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (config.exponentialBackoff) {
            delay *= 2;
          }
        }
      }
    }

    setIsLoading(false);
    setError(lastError);
    return null;
  }, [fn, config]);

  return { execute, isLoading, error };
}

