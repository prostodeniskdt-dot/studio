'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BarChart3, Package, Sparkles } from "lucide-react";
import { SessionsList } from "@/components/dashboard/sessions-list";
import { mockInventorySessions, mockProducts } from "@/lib/data";
import { useRouter } from 'next/navigation';
import type { InventorySession, InventoryLine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  // In a real app, this data would be fetched from Firestore
  const [sessions, setSessions] = React.useState(mockInventorySessions);

  const handleCreateSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const activeProducts = mockProducts.filter(p => p.isActive);
    
    const newLines: InventoryLine[] = activeProducts.map(p => ({
        id: `line-${p.id}-${newSessionId}`,
        productId: p.id,
        startStock: 0, // In a real app, this might carry over from the previous session
        purchases: 0,
        sales: 0,
        endStock: 0,
    }));

    const newSession: InventorySession = {
        id: newSessionId,
        name: `Инвентаризация от ${new Date().toLocaleDateString('ru-RU')}`,
        status: 'in_progress',
        createdByUserId: 'user-1',
        createdAt: new Date(),
        lines: newLines,
    };

    // This is a mock implementation. We add it to the global mock array.
    mockInventorySessions.unshift(newSession);
    setSessions(mockInventorySessions);


    toast({
        title: "Сессия создана",
        description: `Новая сессия "${newSession.name}" была успешно создана.`,
    });

    router.push(`/dashboard/sessions/${newSessionId}`);
  };


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
        <Button onClick={handleCreateSession}>
          <PlusCircle />
          Начать инвентаризацию
        </Button>
      </div>
      <SessionsList sessions={sessions} />
    </div>
  );
}
