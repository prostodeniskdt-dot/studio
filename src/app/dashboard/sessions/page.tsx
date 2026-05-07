'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { HelpIcon } from '@/components/ui/help-icon';
import { useRouter } from 'next/navigation';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useSessions } from '@/contexts/sessions-context';


export default function SessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const [isCreating, setIsCreating] = React.useState(false);

  const barId = user ? `bar_${user.uid}` : null; 

  // Использовать контекст сессий вместо прямой загрузки
  const { sessions, isLoading: isLoadingSessions, error: sessionsError } = useSessions();


  const handleCreateSession = async () => {
    if (!user || !barId) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные для создания инвентаризации.",
      });
      return;
    }
    
    setIsCreating(true);

    try {
      const active = (sessions ?? []).find((s) => s.status === 'in_progress');
      if (active) {
        toast({
          title: "Активная инвентаризация уже существует",
          description: "Вы будете перенаправлены на существующую инвентаризацию.",
        });
        router.push(`/dashboard/sessions/${active.id}`);
        return;
      }

      const token = await user.getIdToken();
      const name = `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session: { name, status: 'in_progress' } }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');

      const sessionId = json.session?.id as string | undefined;
      if (!sessionId) throw new Error('Session not created');

      if (typeof window !== 'undefined') {
        const sessionDataForCache = {
          ...json.session,
          createdAt: new Date().toISOString(),
          isNew: true,
        };
        sessionStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionDataForCache));
      }

      toast({
        title: "Инвентаризация создана",
        description: "Новая инвентаризация была успешно создана.",
      });

      router.push(`/dashboard/sessions/${sessionId}`);
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось создать инвентаризацию';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
    } finally {
        setIsCreating(false);
    }
  };

  const isLoading = isLoadingSessions;
  const hasDataLoadingError = sessionsError;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={isLoading || isCreating || !!hasDataLoadingError || !barId}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Начать инвентаризацию
        </Button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <HelpIcon 
          description="Создавайте и управляйте инвентаризациями. Начните новую инвентаризацию, чтобы отслеживать остатки продуктов. Завершенные инвентаризации сохраняются для истории."
        />
        <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
      </div>
      {isLoading ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <div className="flex-grow" />
                <CardContent>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
         </div>
      ) : hasDataLoadingError ? (
         <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
            <p>Не удалось загрузить данные.</p>
            <p className="text-xs">{sessionsError?.message || 'Возможно, у вас нет прав на просмотр или данные еще не созданы.'}</p>
         </div>
      ) : (
        <SessionsList sessions={sessions || []} barId={barId!} />
      )}
    </>
  );
}
