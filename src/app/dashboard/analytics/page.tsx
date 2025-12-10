'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { InventorySession, InventoryLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AnalyticsView } from '@/components/analytics/analytics-view';

export type SessionWithLines = InventorySession & { lines: InventoryLine[] };

export default function AnalyticsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  const [data, setData] = React.useState<SessionWithLines[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !barId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const sessionsQuery = query(
          collection(firestore, 'bars', barId, 'inventorySessions'),
          where('status', '==', 'completed')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData = sessionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as InventorySession[];
        
        const sessionsWithLines: SessionWithLines[] = [];

        for (const session of sessionsData) {
          const linesQuery = collection(firestore, 'bars', barId, 'inventorySessions', session.id, 'lines');
          const linesSnapshot = await getDocs(linesQuery);
          const linesData = linesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as InventoryLine[];
          sessionsWithLines.push({ ...session, lines: linesData });
        }
        
        // Sort by closed date, oldest first
        sessionsWithLines.sort((a, b) => (a.closedAt?.toMillis() ?? 0) - (b.closedAt?.toMillis() ?? 0));

        setData(sessionsWithLines);
      } catch (error) {
        console.error("Error fetching analytics data: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, barId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AnalyticsView data={data} />
  );
}
