'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, notFound, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, Loader2, ShoppingCart } from "lucide-react";
import type { InventorySession, Product, InventoryLine, PurchaseOrder } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useProducts } from '@/contexts/products-context';
import { useToast } from '@/hooks/use-toast';
import { useServerAction } from '@/hooks/use-server-action';
import { createPurchaseOrdersFromSession } from '@/lib/actions';


const ReportView = dynamic(() => import('@/components/reports/report-view').then(mod => ({ default: mod.ReportView })), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full pt-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
});


export default function SessionReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const barId = user ? `bar_${user.uid}` : null;
  
  const sessionRef = useMemoFirebase(() => 
    firestore && barId ? doc(firestore, 'bars', barId, 'inventorySessions', id) : null,
    [firestore, barId, id]
  );
  const { data: session, isLoading: isLoadingSession } = useDoc<InventorySession>(sessionRef);

  const linesRef = useMemoFirebase(() =>
    firestore && barId ? collection(firestore, 'bars', barId, 'inventorySessions', id, 'lines') : null,
    [firestore, barId, id]
  );
  const { data: lines, isLoading: isLoadingLines } = useCollection<InventoryLine>(linesRef);

  // Использовать контекст продуктов вместо прямой загрузки
  const { products, isLoading: isLoadingProducts } = useProducts();


  const { execute: createOrders, isLoading: isCreatingOrder } = useServerAction(createPurchaseOrdersFromSession, {
    onSuccess: (result) => {
        if (result.holidayBonus) {
            toast({
                title: `Приближается праздник: ${result.holidayName}!`,
                description: `Рекомендации по заказу были увеличены.`,
                duration: 5000,
            });
        }
        toast({
            title: 'Заказы успешно созданы',
            description: `Создано ${result.createdCount} черновиков заказов.`,
        });
        if (result.orderIds.length > 0) {
            router.push(`/dashboard/purchase-orders/${result.orderIds[0]}`);
        }
    },
    onError: (error) => {
        toast({
            variant: 'destructive',
            title: 'Ошибка при создании заказа',
            description: error,
        });
    }
  });


  const handleCreatePurchaseOrder = () => {
    if (!user || !lines || !products || !barId) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не все данные загружены. Пожалуйста, подождите.',
      });
      return;
    }
    
    try {
      createOrders({ lines, products, barId, userId: user.uid });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка при создании заказа',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };


  const isLoading = isLoadingSession || isLoadingLines || isLoadingProducts;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!session) {
     if (!isLoadingSession) {
      notFound();
    }
    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!lines || !products) {
     return (
        <div className="flex items-center justify-center h-full pt-20">
           <p>Загрузка данных для отчета...</p>
        </div>
    );
  }

  if (session.status !== 'completed') {
    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Alert className="max-w-md">
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Отчет недоступен</AlertTitle>
                <AlertDescription>
                    Эта инвентаризация еще не завершена. Пожалуйста, завершите ее для просмотра отчета.
                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                        <Link href={`/dashboard/sessions/${session.id}`}>Вернуться к инвентаризации</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
  }


  return (
    <ReportView 
      session={{...session, lines: lines}} 
      products={products}
      onCreatePurchaseOrder={handleCreatePurchaseOrder}
      isCreatingOrder={isCreatingOrder}
    />
  );
}
