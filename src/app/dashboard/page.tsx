'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BarChart3, Package, Sparkles, Loader2, LineChart } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, addDoc, where, getDocs } from 'firebase/firestore';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const barId = user ? `bar_${user.uid}` : null; 

  // Query for in-progress or draft sessions for the list
  const sessionsQuery = useMemoFirebase(() => 
    firestore && barId ? query(
        collection(firestore, 'bars', barId, 'inventorySessions'), 
        where('status', 'in', ['in_progress', 'draft']),
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useCollection<InventorySession>(sessionsQuery);


  const handleCreateSession = async () => {
    if (!user || !barId || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные для создания сессии.",
      });
      return;
    }
    
    // Check for existing in-progress session
    const inProgressQuery = query(
        collection(firestore, 'bars', barId, 'inventorySessions'), 
        where('status', '==', 'in_progress'),
        orderBy('createdAt', 'desc')
    );
    const inProgressSnapshot = await getDocs(inProgressQuery);
    if (!inProgressSnapshot.empty) {
        const existingSessionId = inProgressSnapshot.docs[0].id;
        toast({
            title: "Активная сессия уже существует",
            description: "Вы будете перенаправлены на существующую сессию.",
            action: <Button onClick={() => router.push(`/dashboard/sessions/${existingSessionId}`)}>Перейти</Button>
        });
        router.push(`/dashboard/sessions/${existingSessionId}`);
        return;
    }


    const newSessionData = {
        barId: barId,
        name: `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,
        status: 'in_progress' as const,
        createdByUserId: user.uid,
        createdAt: serverTimestamp(),
        closedAt: null,
    };
    
    try {
      const sessionDocRef = await addDoc(collection(firestore, 'bars', barId, 'inventorySessions'), newSessionData);
      
      toast({
          title: "Сессия создана",
          description: `Новая сессия "${newSessionData.name}" была успешно создана.`,
      });
      router.push(`/dashboard/sessions/${sessionDocRef.id}`);
    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Ошибка создания сессии",
          description: "Не удалось создать новую сессию. Попробуйте снова.",
      });
    }
  };

  const isLoading = isLoadingSessions;
  const hasDataLoadingError = sessionsError;

  return (
    <div className="container mx-auto">
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Добро пожаловать в BarBoss!</CardTitle>
          <CardDescription>
            Это ваша панель управления для инвентаризации. Отслеживайте остатки, анализируйте расхождения и оптимизируйте работу вашего бара.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-sm">
                <Link href="/dashboard/products">
                    <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                        <Package className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                        <div className="hidden md:block">
                            <h3 className="font-semibold">Управление продуктами</h3>
                            <p className="text-muted-foreground">Ведите каталог ваших напитков.</p>
                        </div>
                    </div>
                </Link>
                <Link href="/dashboard/sessions">
                    <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                        <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                        <div className="hidden md:block">
                            <h3 className="font-semibold">Проведение инвентаризаций</h3>
                            <p className="text-muted-foreground">Создавайте сессии для подсчета.</p>
                        </div>
                    </div>
                </Link>
                <Link href="/dashboard/analytics">
                    <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                        <LineChart className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                        <div className="hidden md:block">
                            <h3 className="font-semibold">Аналитика</h3>
                            <p className="text-muted-foreground">Анализируйте данные и отчеты.</p>
                        </div>
                    </div>
                </Link>
                 <div className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                    <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                    <div className="hidden md:block">
                        <h3 className="font-semibold">AI-анализ отклонений</h3>
                        <p className="text-muted-foreground">Используйте ИИ для поиска причин недостач.</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Активные сессии</h1>
        <Button onClick={handleCreateSession} disabled={isLoading || hasDataLoadingError || !barId}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Начать
        </Button>
      </div>
      {isLoading ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : hasDataLoadingError ? (
         <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
            <p>Не удалось загрузить данные.</p>
            <p className="text-xs">Возможно, у вас нет прав на просмотр или данные еще не созданы.</p>
         </div>
      ) : (
        <SessionsList sessions={sessions || []} barId={barId} />
      )}
    </div>
  );
}
