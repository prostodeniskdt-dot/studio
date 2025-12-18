'use client';

import * as React from 'react';
import { useOffline } from '@/hooks/use-offline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, CloudOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Component that displays offline/online status and sync status
 */
export function OfflineIndicator() {
  const { isOnline, isOffline, queuedOperations, isSyncing } = useOffline();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Show indicator when offline, when there are queued operations, or when syncing
    setIsVisible(isOffline || queuedOperations.length > 0 || isSyncing);
  }, [isOffline, queuedOperations.length, isSyncing]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert
        variant={isOffline ? 'destructive' : 'default'}
        className={cn(
          'shadow-lg border-2',
          isOffline && 'bg-destructive/10 border-destructive',
          !isOffline && (queuedOperations.length > 0 || isSyncing) && 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500',
          !isOffline && queuedOperations.length === 0 && !isSyncing && 'bg-green-50 dark:bg-green-900/20 border-green-500'
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Офлайн режим</AlertTitle>
            <AlertDescription>
              Нет подключения к интернету. Изменения будут сохранены локально и синхронизированы при восстановлении соединения.
              {queuedOperations.length > 0 && (
                <span className="block mt-1 text-xs">
                  В очереди: {queuedOperations.length} операций
                </span>
              )}
            </AlertDescription>
          </>
        ) : (queuedOperations.length > 0 || isSyncing) ? (
          <>
            <CloudOff className="h-4 w-4" />
            <AlertTitle>Синхронизация</AlertTitle>
            <AlertDescription>
              Синхронизация {queuedOperations.length} операций...
              <span className="block mt-1 text-xs text-muted-foreground">
                Пожалуйста, подождите
              </span>
            </AlertDescription>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Онлайн</AlertTitle>
            <AlertDescription>
              Подключение восстановлено. Все данные синхронизированы.
            </AlertDescription>
          </>
        )}
      </Alert>
    </div>
  );
}

