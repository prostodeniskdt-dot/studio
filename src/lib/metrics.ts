/**
 * Metrics and analytics tracking utility
 * Tracks user actions and performance metrics
 */

import { logger } from './logger';

export type MetricEvent = 
  | 'session_created'
  | 'session_completed'
  | 'session_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'premix_created'
  | 'premix_updated'
  | 'purchase_order_created'
  | 'purchase_order_updated'
  | 'analytics_viewed'
  | 'ai_analysis_requested'
  | 'export_performed'
  | 'calculation_performed';

export interface MetricData {
  event: MetricEvent;
  userId?: string;
  timestamp: number;
  duration?: number; // in milliseconds
  metadata?: Record<string, unknown>;
}

class MetricsTracker {
  private metrics: MetricData[] = [];
  private maxMetrics = 1000;
  private isEnabled = true;

  /**
   * Track a user action or event
   */
  track(event: MetricEvent, metadata?: Record<string, unknown>, duration?: number) {
    if (!this.isEnabled) return;

    const metric: MetricData = {
      event,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('Metric tracked:', metric);
    }

    // Send to analytics service if available (e.g., Google Analytics, Mixpanel)
    this.sendToAnalytics(metric);
  }

  /**
   * Track performance metric
   */
  trackPerformance(operation: string, duration: number, metadata?: Record<string, unknown>) {
    this.track('calculation_performed' as MetricEvent, {
      operation,
      ...metadata,
    }, duration);
  }

  /**
   * Get metrics for a specific event type
   */
  getMetrics(event?: MetricEvent, limit: number = 100): MetricData[] {
    let filtered = this.metrics;
    
    if (event) {
      filtered = this.metrics.filter(m => m.event === event);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get aggregated statistics
   */
  getStats(event?: MetricEvent) {
    const metrics = event 
      ? this.metrics.filter(m => m.event === event)
      : this.metrics;

    const total = metrics.length;
    const withDuration = metrics.filter(m => m.duration !== undefined);
    const avgDuration = withDuration.length > 0
      ? withDuration.reduce((sum, m) => sum + (m.duration || 0), 0) / withDuration.length
      : 0;

    return {
      total,
      avgDuration: Math.round(avgDuration),
      eventsByType: this.getEventCounts(),
    };
  }

  /**
   * Get event counts by type
   */
  private getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.metrics.forEach(metric => {
      counts[metric.event] = (counts[metric.event] || 0) + 1;
    });
    return counts;
  }

  /**
   * Send metric to external analytics service
   */
  private sendToAnalytics(metric: MetricData) {
    // Google Analytics 4 integration (if available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', metric.event, {
          event_category: 'user_action',
          event_label: metric.metadata?.label || metric.event,
          value: metric.duration,
          ...metric.metadata,
        });
      } catch (error) {
        logger.error('Failed to send metric to Google Analytics', error);
      }
    }

    // Custom analytics endpoint (if configured)
    const analyticsEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
    if (analyticsEndpoint && typeof window !== 'undefined') {
      // Send asynchronously without blocking
      fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true, // Send even if page is unloading
      }).catch(error => {
        logger.error('Failed to send metric to analytics endpoint', error);
      });
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

export const metricsTracker = new MetricsTracker();

/**
 * Helper function to track async operations with timing
 */
export async function trackAsyncOperation<T>(
  event: MetricEvent,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    metricsTracker.track(event, { ...metadata, success: true }, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    metricsTracker.track(event, { ...metadata, success: false, error: String(error) }, duration);
    throw error;
  }
}

