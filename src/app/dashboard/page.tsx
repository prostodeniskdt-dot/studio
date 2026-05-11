'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, BarChart3, Package, Loader2, Truck, ShoppingCart, FlaskConical, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpIcon } from '@/components/ui/help-icon';
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthSession } from '@/contexts/auth-context';
import { useSessions } from '@/contexts/sessions-context';
import { metricsTracker } from '@/lib/metrics';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthSession();

  const barId = user ? `bar_${user.id}` : null; 
  const { sessions, isLoading: isLoadingSessions, error: sessionsError, addSession } = useSessions();
  const [isCreating, setIsCreating] = React.useState(false);

  const activeSessions = React.useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter(s => s.status === 'in_progress' || s.status === 'draft')
      .sort((a, b) => {
        const aVal = (a as any).createdAt as any;
        const bVal = (b as any).createdAt as any;
        const aMs = aVal instanceof Date ? aVal.getTime() : typeof aVal === 'string' ? new Date(aVal).getTime() : 0;
        const bMs = bVal instanceof Date ? bVal.getTime() : typeof bVal === 'string' ? new Date(bVal).getTime() : 0;
        return bMs - aMs;
      });
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

        const name = `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`;
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ session: { name, status: 'in_progress' } }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
        const created = json.session as InventorySession | undefined;
        const sessionId = created?.id;
        if (!sessionId || !created) throw new Error('Session not created');
        addSession(created);

        // Track metric
        metricsTracker.track('session_created', { sessionId, barId });
        
        // Сохранить данные в sessionStorage для немедленного доступа (исправление race condition)
        if (typeof window !== 'undefined') {
            const sessionDataForCache = {
                ...json.session,
                createdAt: new Date().toISOString(), // Заменить serverTimestamp на дату для кэша
                isNew: true // Флаг новой сессии
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
      <div className="mb-4 flex items-center gap-2">
        <HelpIcon 
          description="Создайте новую инвентаризацию, затем используйте калькулятор для расчета остатков бутылок и отправки их в инвентаризацию."
        />
        <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
      </div>

      <Card className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl gradient-text">Добро пожаловать в BAR BOSS ONLINE!</CardTitle>
          <CardDescription className="text-base">
            Это ваша панель управления для инвентаризации. Отслеживайте остатки, анализируйте расхождения и оптимизируйте работу вашего бара.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                <Link href="/dashboard/products" className="group relative flex flex-col items-center gap-4 p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 min-h-[120px] md:min-h-[140px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
                        <Package className="relative h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-base mb-1">Продукты</h3>
                        <p className="text-muted-foreground text-xs">Каталог напитков</p>
                    </div>
                    <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/dashboard/premixes" className="group relative flex flex-col items-center gap-4 p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 min-h-[120px] md:min-h-[140px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
                        <FlaskConical className="relative h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-base mb-1">Премиксы</h3>
                        <p className="text-muted-foreground text-xs">Заготовки и коктейли</p>
                    </div>
                    <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/dashboard/sessions" className="group relative flex flex-col items-center gap-4 p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 min-h-[120px] md:min-h-[140px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
                        <BarChart3 className="relative h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-base mb-1">Инвентаризации</h3>
                        <p className="text-muted-foreground text-xs">Подсчет остатков</p>
                    </div>
                    <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                 <Link href="/dashboard/suppliers" className="group relative flex flex-col items-center gap-4 p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 min-h-[120px] md:min-h-[140px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
                        <Truck className="relative h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-base mb-1">Поставщики</h3>
                        <p className="text-muted-foreground text-xs">Контакты поставщиков</p>
                    </div>
                    <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
            </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Текущие инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={!barId || isLoading || isCreating || !!hasDataLoadingError}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Начать инвентаризацию
        </Button>
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
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
         </div>
      ) : hasDataLoadingError ? (
         <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
            <p>Не удалось загрузить данные.</p>
            <p className="text-xs">{sessionsError?.message || 'Возможно, у вас нет прав на просмотр или данные еще не созданы.'}</p>
         </div>
      ) : activeSessions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Нет активных инвентаризаций"
          description="Начните новую инвентаризацию, чтобы отслеживать остатки продуктов в вашем баре."
          action={{
            label: "Начать инвентаризацию",
            onClick: handleCreateSession
          }}
        />
      ) : (
        <SessionsList sessions={activeSessions} barId={barId!} />
      )}
    </>
  );
}
