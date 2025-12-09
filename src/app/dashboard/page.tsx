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

  // Assuming one bar per user for now. In a real app, you'd select a bar.
  const barId = user ? `bar_${user.uid}` : null; 

  const sessionsQuery = useMemoFirebase(() => 
    barId ? query(
        collection(firestore, 'bars', barId, 'inventorySessions'), 
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore, barId]
  );
  
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<InventorySession>(sessionsQuery);
  
  const productsQuery = useMemoFirebase(() => 
    barId ? query(
      collection(firestore, 'bars', barId, 'products'), 
      where('isActive', '==', true)
    ) : null,
    [firestore, barId]
  );
  const { data: activeProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);


  const handleCreateSession = async () => {
    if (!user || !barId || !activeProducts) {
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

      // Add lines for all active products using a batch write
      const batch = writeBatch(firestore);
      const linesCollection = collection(firestore, 'bars', barId, 'inventorySessions', sessionId, 'lines');
      
      activeProducts.forEach(product => {
        const newLine = {
          productId: product.id,
          inventorySessionId: sessionId,
          startStock: 0,
          purchases: 0,
          sales: 0,
          endStock: 0,
        };
        const lineDocRef = doc(linesCollection); // Automatically generate ID
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

  const isLoading = isLoadingSessions || isLoadingProducts || !barId;


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
        <Button onClick={handleCreateSession} disabled={isLoadingProducts}>
          {isLoadingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle />}
          Начать инвентаризацию
        </Button>
      </div>
      {isLoading ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : (
        <SessionsList sessions={sessions || []} />
      )}
    </div>
  );
}
