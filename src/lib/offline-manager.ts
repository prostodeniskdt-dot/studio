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
  private isSyncing: boolean = false;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private syncListeners: Array<(isSyncing: boolean) => void> = [];

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
   * Process queued operations
   * Attempts to sync all queued operations when coming back online
   */
  private async processQueue() {
    if (!this.isOnline || this.queue.length === 0 || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners(true);

    try {
      logger.log(`Syncing ${this.queue.length} queued operations...`);
      
      // Process operations one by one to avoid overwhelming the connection
      const operationsToProcess = [...this.queue];
      const successfulOps: string[] = [];
      const failedOps: QueuedOperation[] = [];

      for (const op of operationsToProcess) {
        try {
          // Note: Actual Firestore operations would be implemented here
          // For now, we simulate processing
          await this.processOperation(op);
          successfulOps.push(op.id);
        } catch (error) {
          logger.error(`Failed to process operation ${op.id}:`, error);
          failedOps.push(op);
        }
      }

      // Remove successful operations
      successfulOps.forEach(id => this.removeOperation(id));

      // Keep failed operations for retry
      if (failedOps.length > 0) {
        logger.warn(`${failedOps.length} operations failed and will be retried later`);
      }

      logger.log(`Sync completed: ${successfulOps.length} successful, ${failedOps.length} failed`);
    } catch (error) {
      logger.error('Error during queue processing:', error);
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners(false);
    }
  }

  /**
   * Process a single operation
   * This is a placeholder - actual Firestore operations should be implemented
   */
  private async processOperation(op: QueuedOperation): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, you would:
    // 1. Parse the operation path and data
    // 2. Execute the Firestore operation (create/update/delete)
    // 3. Handle errors appropriately
    
    logger.log(`Processed operation: ${op.type} ${op.path}`);
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (isSyncing: boolean) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  /**
   * Get current sync status
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  private notifySyncListeners(isSyncing: boolean) {
    this.syncListeners.forEach(listener => listener(isSyncing));
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

