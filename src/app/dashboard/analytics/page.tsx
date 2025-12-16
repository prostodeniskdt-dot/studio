'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import type { InventorySession, InventoryLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRelatedCollection } from '@/hooks/use-related-collection';
import { logger } from '@/lib/logger';

const AnalyticsView = dynamic(() => import('@/components/analytics/analytics-view').then(mod => mod.AnalyticsView), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-full pt-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
});

export type SessionWithLines = InventorySession & { lines: InventoryLine[] };

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  // Primary query with orderBy (requires composite index)
  const sessionsQueryWithOrder = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), where('status', '==', 'completed'), orderBy('closedAt', 'desc')) : null,
    [firestore, barId]
  );
  
  // Fallback query without orderBy (for when index is missing)
  const sessionsQueryFallback = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), where('status', '==', 'completed')) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useCollection<InventorySession>(sessionsQueryWithOrder);
  const [fallbackSessions, setFallbackSessions] = React.useState<InventorySession[] | null>(null);
  const [isLoadingFallback, setIsLoadingFallback] = React.useState(false);
  const [queryError, setQueryError] = React.useState<Error | null>(null);

  // Try fallback query if primary query fails (likely due to missing index)
  React.useEffect(() => {
    if (sessionsError && sessionsQueryFallback && !isLoadingFallback && !fallbackSessions) {
      const errorCode = (sessionsError as any)?.code;
      // Check if error is related to missing index (failed-precondition or invalid-argument)
      if (errorCode === 'failed-precondition' || errorCode === 'invalid-argument' || errorCode === 'unavailable') {
        logger.warn('Analytics: Primary query failed, trying fallback query without orderBy', sessionsError);
        setIsLoadingFallback(true);
        setQueryError(null);
        
        // Try fallback query
        getDocs(sessionsQueryFallback)
          .then((snapshot) => {
            const fallbackData = snapshot.docs.map(doc => ({ ...(doc.data() as InventorySession), id: doc.id }));
            // Sort on client side by closedAt
            const sorted = fallbackData.sort((a, b) => {
              const aTime = a.closedAt?.toMillis?.() ?? a.closedAt?.toDate?.()?.getTime() ?? 0;
              const bTime = b.closedAt?.toMillis?.() ?? b.closedAt?.toDate?.()?.getTime() ?? 0;
              return bTime - aTime; // Descending order
            });
            setFallbackSessions(sorted);
            logger.info(`Analytics: Fallback query successful, found ${sorted.length} completed sessions`);
          })
          .catch((err) => {
            logger.error('Analytics: Fallback query also failed', err);
            setQueryError(err instanceof Error ? err : new Error(String(err)));
          })
          .finally(() => {
            setIsLoadingFallback(false);
          });
      } else {
        // Other error, just set it
        setQueryError(sessionsError);
      }
    }
  }, [sessionsError, sessionsQueryFallback, isLoadingFallback, fallbackSessions]);

  // Use primary sessions if available, otherwise use fallback
  const effectiveSessions = React.useMemo(() => {
    if (sessions && sessions.length > 0) {
      logger.info(`Analytics: Using primary query results, found ${sessions.length} completed sessions`);
      return sessions;
    }
    if (fallbackSessions && fallbackSessions.length > 0) {
      logger.info(`Analytics: Using fallback query results, found ${fallbackSessions.length} completed sessions`);
      return fallbackSessions;
    }
    return sessions || fallbackSessions || [];
  }, [sessions, fallbackSessions]);

  // Use optimized hook for loading related collections
  const sessionIds = React.useMemo(() => effectiveSessions?.map(s => s.id) || [], [effectiveSessions]);
  const { data: linesBySession, isLoading: isLoadingLines } = useRelatedCollection<InventoryLine>(
    firestore,
    sessionIds,
    (sessionId) => `bars/${barId}/inventorySessions/${sessionId}/lines`
  );

  const sessionsWithLines = React.useMemo<SessionWithLines[]>(() => {
    if (!effectiveSessions) return [];
    
    // Filter out sessions without closedAt (shouldn't happen, but safety check)
    const validSessions = effectiveSessions.filter(session => {
      const hasClosedAt = session.closedAt !== undefined && session.closedAt !== null;
      if (!hasClosedAt) {
        logger.warn(`Analytics: Session ${session.id} is completed but missing closedAt field`);
      }
      return hasClosedAt;
    });
    
    return validSessions.map(session => ({
      ...session,
      lines: linesBySession[session.id] || []
    }));
  }, [effectiveSessions, linesBySession]);

  const isLoading = (isLoadingSessions || isLoadingFallback) || isLoadingLines;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error if both queries failed
  if (queryError && !effectiveSessions.length) {
    return (
      <div className="w-full p-4">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">Ошибка загрузки данных</h2>
          <p className="text-sm text-muted-foreground">
            Не удалось загрузить данные аналитики. Возможно, требуется создать составной индекс в Firestore.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Детали: {queryError.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
        <AnalyticsView data={sessionsWithLines} />
    </div>
  );
}
