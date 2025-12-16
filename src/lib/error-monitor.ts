/**
 * Error monitoring utility with Sentry integration.
 */

import { logger } from './logger';

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

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        const Sentry = (window as any).Sentry;
        Sentry.captureException(error, {
          contexts: {
            custom: errorContext,
          },
          tags: {
            path: errorContext.path,
            userId: errorContext.userId,
          },
        });
      } catch (sentryError) {
        // Fallback to console if Sentry fails
        logger.error('ErrorMonitor: Failed to send to Sentry', sentryError);
        logger.error('ErrorMonitor:', error, errorContext);
      }
    } else {
      // Fallback to logger if Sentry is not available
      logger.error('ErrorMonitor:', error, errorContext);
    }
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

