'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { createInventorySession } from '@/lib/actions';
import { useServerAction } from '@/hooks/use-server-action';


export default function SessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const barId = user ? `bar_${user.uid}` : null; 

  const sessionsQuery = useMemoFirebase(() => 
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions')) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useCollection<InventorySession>(sessionsQuery);

  const { execute: runCreateSession, isLoading: isCreating } = useServerAction(createInventorySession, {
    onSuccess: (data) => {
      if (!data) return;
      if (data.isNew) {
        toast({
          title: "Инвентаризация создана",
          description: "Новая инвентаризация была успешно создана.",
        });
      } else {
        toast({
          title: "Активная инвентаризация уже существует",
          description: "Вы будете перенаправлены на существующую инвентаризацию.",
           action: <Button onClick={() => router.push(`/dashboard/sessions/${data.sessionId}`)}>Перейти</Button>
        });
      }
      router.push(`/dashboard/sessions/${data.sessionId}`);
    },
  });

  const sortedSessions = React.useMemo(() => {
    if (!sessions || !user) return [];
    // Filter and sort on the client side
    return sessions
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [sessions, user]);


  const handleCreateSession = async () => {
    if (!user || !barId) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные для создания инвентаризации.",
      });
      return;
    }
    await runCreateSession({ barId, userId: user.uid });
  };

  const isLoading = isLoadingSessions;
  const hasDataLoadingError = sessionsError;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={isLoading || isCreating || hasDataLoadingError || !barId}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Начать инвентаризацию
        </Button>
      </div>
      {isLoading ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : hasDataLoadingError ? (
         <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
            <p>Не удалось загрузить данные.</p>
            <p className="text-xs">{sessionsError?.message || 'Возможно, у вас нет прав на просмотр или данные еще не созданы.'}</p>
         </div>
      ) : (
        <SessionsList sessions={sortedSessions || []} barId={barId} />
      )}
    </>
  );
}
