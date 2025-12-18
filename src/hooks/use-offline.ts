'use client';

import { useState, useEffect } from 'react';
import { offlineManager } from '@/lib/offline-manager';

/**
 * Hook to track online/offline status and sync state
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(offlineManager.getIsOnline());
  const [queuedOperations, setQueuedOperations] = useState(offlineManager.getQueue());
  const [isSyncing, setIsSyncing] = useState(offlineManager.getIsSyncing());

  useEffect(() => {
    const unsubscribeStatus = offlineManager.onStatusChange((online) => {
      setIsOnline(online);
      setQueuedOperations(offlineManager.getQueue());
    });

    const unsubscribeSync = offlineManager.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
      // Update queue when sync status changes
      setQueuedOperations(offlineManager.getQueue());
    });

    // Poll queue updates periodically when syncing
    const interval = setInterval(() => {
      if (isSyncing) {
        setQueuedOperations(offlineManager.getQueue());
      }
    }, 500);

    return () => {
      unsubscribeStatus();
      unsubscribeSync();
      clearInterval(interval);
    };
  }, [isSyncing]);

  return {
    isOnline,
    isOffline: !isOnline,
    queuedOperations,
    isSyncing,
  };
}

