/**
 * Offline manager for handling offline state and queuing operations
 */

import { logger } from './logger';

interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  path: string;
  data?: unknown;
  timestamp: number;
}

class OfflineManager {
  private queue: QueuedOperation[] = [];
  private isOnline: boolean = true;
  private listeners: Array<(isOnline: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.loadQueue();
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.notifyListeners(true);
    // Process queued operations
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyListeners(false);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  /**
   * Subscribe to online/offline state changes
   */
  onStatusChange(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Queue an operation for later execution
   */
  queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
    };
    this.queue.push(queuedOp);
    this.saveQueue();
    return id;
  }

  /**
   * Remove an operation from queue
   */
  removeOperation(id: string) {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Process queued operations (to be implemented with actual Firestore operations)
   */
  private async processQueue() {
    // This would be implemented to retry queued operations
    // For now, just clear the queue when coming back online
    if (this.isOnline && this.queue.length > 0) {
      // In a real implementation, you would retry each operation
      logger.log(`Processing ${this.queue.length} queued operations...`);
      this.queue = [];
      this.saveQueue();
    }
  }

  private saveQueue() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('offline_queue', JSON.stringify(this.queue));
      } catch (e) {
        logger.error('Failed to save offline queue:', e);
      }
    }
  }

  private loadQueue() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('offline_queue');
        if (saved) {
          this.queue = JSON.parse(saved);
        }
      } catch (e) {
        logger.error('Failed to load offline queue:', e);
      }
    }
  }
}

export const offlineManager = new OfflineManager();

