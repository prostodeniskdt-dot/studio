'use client';

import { useState, useEffect } from 'react';
import { offlineManager } from '@/lib/offline-manager';

/**
 * Hook to track online/offline status
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(offlineManager.getIsOnline());
  const [queuedOperations, setQueuedOperations] = useState(offlineManager.getQueue());

  useEffect(() => {
    const unsubscribe = offlineManager.onStatusChange((online) => {
      setIsOnline(online);
      setQueuedOperations(offlineManager.getQueue());
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    queuedOperations,
  };
}

