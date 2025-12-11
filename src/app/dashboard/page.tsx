'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BarChart3, Package, Sparkles, Loader2, LineChart, Users } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { createInventorySession } from '@/lib/actions';
import { useServerAction } from '@/hooks/use-server-action';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const barId = user ? `bar_${user.uid}` : null; 

  const sessionsQuery = useMemoFirebase(() => 
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), where('status', 'in', ['in_progress', 'draft'])) : null,
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
            });
        }
        router.push(`/dashboard/sessions/${data.sessionId}`);
    },
  });
  
  const activeSessions = React.useMemo(() => {
    if (!sessions) return [];
    // Sort on the client side
    return sessions
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [sessions]);


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
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Добро пожаловать в BarBoss!</CardTitle>
          <CardDescription>
            Это ваша панель управления для инвентаризации. Отслеживайте остатки, анализируйте расхождения и оптимизируйте работу вашего бара.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 text-sm">
                <Link href="/dashboard/products" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                    <Package className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
                    <div className="hidden sm:block">
                        <h3 className="font-semibold">Продукты</h3>
                        <p className="text-muted-foreground text-xs">Каталог напитков</p>
                    </div>
                </Link>
                <Link href="/dashboard/sessions" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                    <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
                    <div className="hidden sm:block">
                        <h3 className="font-semibold">Инвентаризации</h3>
                        <p className="text-muted-foreground text-xs">Подсчет остатков</p>
                    </div>
                </Link>
                <Link href="/dashboard/analytics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                    <LineChart className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
                    <div className="hidden sm:block">
                        <h3 className="font-semibold">Аналитика</h3>
                        <p className="text-muted-foreground text-xs">Отчеты и данные</p>
                    </div>
                </Link>
                 <Link href="/dashboard/staff" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer">
                    <Users className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
                    <div className="hidden sm:block">
                        <h3 className="font-semibold">Персонал</h3>
                        <p className="text-muted-foreground text-xs">Команда бара</p>
                    </div>
                </Link>
            </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Текущие инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={!barId || isLoading || isCreating || !!hasDataLoadingError}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
            <p className="text-xs">{sessionsError?.message || 'Возможно, у вас нет прав на просмотр или данные еще не созданы.'}</p>
         </div>
      ) : (
        <SessionsList sessions={activeSessions} barId={barId!} />
      )}
    </>
  );
}
