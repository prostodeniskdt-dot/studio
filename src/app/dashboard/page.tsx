'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BarChart3, Package, Sparkles, Loader2 } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { useRouter } from 'next/navigation';
import type { InventorySession, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, where, orderBy, addDoc, writeBatch, doc } from 'firebase/firestore';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  // barId is now guaranteed to be available here because of the layout protection
  const barId = user ? `bar_${user.uid}` : null; 

  const sessionsQuery = useMemoFirebase(() => 
    firestore && barId ? query(
        collection(firestore, 'bars', barId, 'inventorySessions'), 
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions, error: sessionsError } = useCollection<InventorySession>(sessionsQuery);
  
  const productsQuery = useMemoFirebase(() => 
    firestore && barId ? query(
      collection(firestore, 'bars', barId, 'products'), 
      where('isActive', '==', true)
    ) : null,
    [firestore, barId]
  );
  const { data: activeProducts, isLoading: isLoadingProducts, error: productsError } = useCollection<Product>(productsQuery);


  const handleCreateSession = async () => {
    if (!user || !barId || !activeProducts || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные для создания сессии. Убедитесь, что ваш бар настроен и продукты добавлены.",
      });
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
      const sessionId = sessionDocRef.id;

      const batch = writeBatch(firestore);
      const linesCollection = collection(firestore, 'bars', barId, 'inventorySessions', sessionId, 'lines');
      
      activeProducts.forEach(product => {
        const lineDocRef = doc(linesCollection); 
        const newLine = {
          id: lineDocRef.id,
          productId: product.id,
          inventorySessionId: sessionId,
          startStock: 0,
          purchases: 0,
          sales: 0,
          endStock: 0,
          theoreticalEndStock: 0,
          differenceVolume: 0,
          differenceMoney: 0,
          differencePercent: 0,
        };
        batch.set(lineDocRef, newLine);
      });
      
      await batch.commit();
      
      toast({
          title: "Сессия создана",
          description: `Новая сессия "${newSessionData.name}" была успешно создана.`,
      });
      router.push(`/dashboard/sessions/${sessionId}`);
    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Ошибка создания сессии",
          description: "Не удалось создать новую сессию. Попробуйте снова.",
      });
    }
  };

  const isLoading = isLoadingSessions || isLoadingProducts;
  const hasDataLoadingError = sessionsError || productsError;

  return (
    <div className="container mx-auto">
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle>Добро пожаловать в BarBoss!</CardTitle>
          <CardDescription>
            Это ваша панель управления для инвентаризации. Отслеживайте остатки, анализируйте расхождения и оптимизируйте работу вашего бара.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-primary" />
                    <div>
                        <h3 className="font-semibold">Управление продуктами</h3>
                        <p className="text-muted-foreground">Ведите каталог ваших напитков и ингредиентов.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                        <h3 className="font-semibold">Проведение инвентаризаций</h3>
                        <p className="text-muted-foreground">Создавайте сессии для подсчета остатков.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <div>
                        <h3 className="font-semibold">AI-анализ отклонений</h3>
                        <p className="text-muted-foreground">Используйте ИИ для поиска причин недостач.</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Сессии инвентаризации</h1>
        <Button onClick={handleCreateSession} disabled={isLoading || hasDataLoadingError || !barId}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
            <p className="text-xs">Возможно, у вас нет прав на просмотр или данные еще не созданы.</p>
         </div>
      ) : (
        <SessionsList sessions={sessions || []} />
      )}
    </div>
  );
}
