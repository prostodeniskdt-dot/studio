/**
 * Utility functions for handling edge cases
 */

/**
 * Safely parse a number, returning 0 if invalid
 */
export function safeParseNumber(value: unknown): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Safely get a property from an object, with fallback
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return fallback;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : fallback;
}

/**
 * Check if an array is empty or null/undefined
 */
export function isEmptyArray<T>(arr: T[] | null | undefined): boolean {
  return !arr || arr.length === 0;
}

/**
 * Safely format a date, handling Firestore Timestamps
 */
export function safeFormatDate(date: unknown, locale: string = 'ru-RU'): string {
  if (!date) return '';
  
  if (date instanceof Date) {
    return date.toLocaleDateString(locale);
  }
  
  // Handle Firestore Timestamp
  if (typeof date === 'object' && date !== null) {
    if ('toDate' in date && typeof (date as any).toDate === 'function') {
      return (date as any).toDate().toLocaleDateString(locale);
    }
    if ('seconds' in date) {
      return new Date((date as any).seconds * 1000).toLocaleDateString(locale);
    }
  }
  
  if (typeof date === 'string') {
    try {
      return new Date(date).toLocaleDateString(locale);
    } catch {
      return '';
    }
  }
  
  return '';
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Validate that required fields are present
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: (keyof T)[] } {
  const missing: (keyof T)[] = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

