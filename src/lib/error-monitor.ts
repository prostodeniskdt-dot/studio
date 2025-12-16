/**
 * Simple error monitoring utility.
 * In production, this should be replaced with a service like Sentry.
 */

interface ErrorContext {
  userId?: string;
  path?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

class ErrorMonitor {
  private errors: Array<{ error: Error; context: ErrorContext }> = [];
  private maxErrors = 100;

  /**
   * Log an error with context
   */
  captureException(error: Error, context?: Partial<ErrorContext>) {
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context,
    };

    this.errors.push({ error, context: errorContext });

    // Keep only the last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // In development, log to console
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorMonitor:', error, errorContext);
    }

    // In production, you would send to an error tracking service here
    // Example: Sentry.captureException(error, { contexts: { custom: errorContext } });
  }

  /**
   * Get recent errors (for debugging)
   */
  getRecentErrors(count: number = 10) {
    return this.errors.slice(-count);
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}

export const errorMonitor = new ErrorMonitor();

