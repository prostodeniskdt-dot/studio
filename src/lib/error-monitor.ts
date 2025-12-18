/**
 * Error monitoring utility with Sentry integration.
 * 
 * To enable Sentry:
 * 1. Install @sentry/nextjs: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 * 3. Initialize Sentry in your app (see Sentry docs for Next.js)
 */

import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  path?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  extra?: Record<string, unknown>;
}

class ErrorMonitor {
  private errors: Array<{ error: Error; context: ErrorContext }> = [];
  private maxErrors = 100;
  private isProduction = process.env.NODE_ENV === 'production';
  private sentryEnabled = false;

  constructor() {
    // Check if Sentry is available
    if (typeof window !== 'undefined') {
      this.sentryEnabled = !!(window as any).Sentry;
    }
    
    // In production, log warning if Sentry DSN is set but Sentry is not initialized
    if (this.isProduction && process.env.NEXT_PUBLIC_SENTRY_DSN && !this.sentryEnabled) {
      console.warn(
        'ErrorMonitor: NEXT_PUBLIC_SENTRY_DSN is set but Sentry is not initialized. ' +
        'Please initialize Sentry in your app (see @sentry/nextjs documentation).'
      );
    }
  }

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
    if (this.sentryEnabled && typeof window !== 'undefined') {
      try {
        const Sentry = (window as any).Sentry;
        Sentry.captureException(error, {
          contexts: {
            custom: errorContext,
          },
          tags: {
            path: errorContext.path,
            userId: errorContext.userId,
            environment: process.env.NODE_ENV || 'development',
          },
          extra: errorContext.extra || {},
          level: 'error',
        });
      } catch (sentryError) {
        // Fallback to logger if Sentry fails
        logger.error('ErrorMonitor: Failed to send to Sentry', sentryError);
        this.logError(error, errorContext);
      }
    } else {
      // Fallback to logger if Sentry is not available
      this.logError(error, errorContext);
    }
  }

  /**
   * Internal method to log errors with appropriate level based on environment
   */
  private logError(error: Error, context: ErrorContext) {
    if (this.isProduction) {
      // In production, only log essential information
      logger.error('ErrorMonitor:', {
        message: error.message,
        name: error.name,
        path: context.path,
        userId: context.userId,
        timestamp: new Date(context.timestamp).toISOString(),
      });
    } else {
      // In development, log full details
      logger.error('ErrorMonitor:', error, context);
      if (error.stack) {
        logger.error('ErrorMonitor: Stack trace:', error.stack);
      }
    }
  }

  /**
   * Set user context for Sentry
   */
  setUser(userId: string, email?: string, username?: string) {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      try {
        const Sentry = (window as any).Sentry;
        Sentry.setUser({
          id: userId,
          email,
          username,
        });
      } catch (error) {
        logger.error('ErrorMonitor: Failed to set user context', error);
      }
    }
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      try {
        const Sentry = (window as any).Sentry;
        Sentry.setUser(null);
      } catch (error) {
        logger.error('ErrorMonitor: Failed to clear user context', error);
      }
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

