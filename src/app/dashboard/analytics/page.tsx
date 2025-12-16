'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { InventorySession, InventoryLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRelatedCollection } from '@/hooks/use-related-collection';

const AnalyticsView = dynamic(() => import('@/components/analytics/analytics-view').then(mod => mod.AnalyticsView), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-full pt-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
});

export type SessionWithLines = InventorySession & { lines: InventoryLine[] };

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const sessionsQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), where('status', '==', 'completed'), orderBy('closedAt', 'desc')) : null,
    [firestore, barId]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<InventorySession>(sessionsQuery);

  // Use optimized hook for loading related collections
  const sessionIds = React.useMemo(() => sessions?.map(s => s.id) || [], [sessions]);
  const { data: linesBySession, isLoading: isLoadingLines } = useRelatedCollection<InventoryLine>(
    firestore,
    sessionIds,
    (sessionId) => `bars/${barId}/inventorySessions/${sessionId}/lines`
  );

  const sessionsWithLines = React.useMemo<SessionWithLines[]>(() => {
    if (!sessions) return [];
    
    return sessions.map(session => ({
      ...session,
      lines: linesBySession[session.id] || []
    }));
  }, [sessions, linesBySession]);

  const isLoading = isLoadingSessions || isLoadingLines;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
        <AnalyticsView data={sessionsWithLines} />
    </div>
  );
}
