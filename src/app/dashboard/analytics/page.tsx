'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { InventorySession, InventoryLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AnalyticsView } from '@/components/analytics/analytics-view';

export type SessionWithLines = InventorySession & { lines: InventoryLine[] };

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const sessionsQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), where('status', '==', 'completed')) : null,
    [firestore, barId]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<InventorySession>(sessionsQuery);

  const [sessionsWithLines, setSessionsWithLines] = React.useState<SessionWithLines[]>([]);
  const [isLoadingLines, setIsLoadingLines] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !barId || !sessions) {
      if(!isLoadingSessions) setIsLoadingLines(false);
      return;
    }

    if (sessions.length === 0) {
      setSessionsWithLines([]);
      setIsLoadingLines(false);
      return;
    }

    setIsLoadingLines(true);
    const fetchLinesForSessions = async () => {
      try {
        const linesPromises = sessions.map(session => {
            const linesQuery = collection(firestore, 'bars', barId, 'inventorySessions', session.id, 'lines');
            return getDocs(linesQuery).then(snapshot => ({
                sessionId: session.id,
                lines: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as InventoryLine)
            }));
        });

        const results = await Promise.all(linesPromises);
        const linesBySession = results.reduce((acc, result) => {
            acc[result.sessionId] = result.lines;
            return acc;
        }, {} as Record<string, InventoryLine[]>);

        const populatedSessions = sessions.map(session => ({
          ...session,
          lines: linesBySession[session.id] || []
        })).sort((a, b) => (a.closedAt?.toMillis() ?? 0) - (b.closedAt?.toMillis() ?? 0));
        
        setSessionsWithLines(populatedSessions);

      } catch (error) {
        console.error("Error fetching lines for sessions:", error);
      } finally {
        setIsLoadingLines(false);
      }
    };

    fetchLinesForSessions();
    
  }, [firestore, barId, sessions, isLoadingSessions]);

  const isLoading = isLoadingSessions || isLoadingLines;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AnalyticsView data={sessionsWithLines} />
  );
}
