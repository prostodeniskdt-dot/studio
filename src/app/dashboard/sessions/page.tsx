'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';


export default function SessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isCreating, setIsCreating] = React.useState(false);

  const barId = user ? `bar_${user.uid}` : null; 

  const sessionsQuery = useMemoFirebase(() => 
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions')) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useCollection<InventorySession>(sessionsQuery);

  const sortedSessions = React.useMemo(() => {
    if (!sessions) return [];
    // Sort on the client side
    return sessions
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [sessions]);


  const handleCreateSession = async () => {
    if (!user || !barId || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные для создания инвентаризации.",
      });
      return;
    }
    
    setIsCreating(true);

    try {
        const inventoriesCollection = collection(firestore, 'bars', barId, 'inventorySessions');
        const inProgressQuery = query(inventoriesCollection, where('status', '==', 'in_progress'), where('barId', '==', barId), where('createdByUserId', '==', user.uid));
        const querySnapshot = await getDocs(inProgressQuery);

        let sessionId;
        let isNew = false;

        if (!querySnapshot.empty) {
            sessionId = querySnapshot.docs[0].id;
            toast({
                title: "Активная инвентаризация уже существует",
                description: "Вы будете перенаправлены на существующую инвентаризацию.",
            });
        } else {
            const newSessionRef = doc(inventoriesCollection);
            const newSessionData = {
                id: newSessionRef.id,
                barId: barId,
                name: `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,
                status: 'in_progress' as const,
                createdByUserId: user.uid,
                createdAt: serverTimestamp(),
                closedAt: null,
            };
            
            await setDoc(newSessionRef, newSessionData);

            sessionId = newSessionRef.id;
            isNew = true;
            toast({
                title: "Инвентаризация создана",
                description: "Новая инвентаризация была успешно создана.",
            });
        }
        
        router.push(`/dashboard/sessions/${sessionId}`);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({ path: `bars/${barId}/inventorySessions`, operation: 'create' });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsCreating(false);
    }
  };

  const isLoading = isLoadingSessions;
  const hasDataLoadingError = sessionsError;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={isLoading || isCreating || !!hasDataLoadingError || !barId}>
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
        <SessionsList sessions={sortedSessions || []} barId={barId!} />
      )}
    </>
  );
}
