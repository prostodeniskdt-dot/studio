'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, notFound, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import type { InventorySession, Product, InventoryLine, PurchaseOrder } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createPurchaseOrderFromReport } from '@/lib/actions';
import { useServerAction } from '@/hooks/use-server-action';

const ReportView = dynamic(() => import('@/components/reports/report-view').then(mod => mod.ReportView), {
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

  const productsRef = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'products')) : null,
    [firestore]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const { execute: runCreatePurchaseOrder, isLoading: isCreatingOrder } = useServerAction(createPurchaseOrderFromReport, {
    onSuccess: (data) => {
        if (!data) return;
        if (data.orderIds.length === 0) {
            toast({ title: 'Заказ не требуется', description: 'Остатки всех продуктов выше минимального уровня.' });
        } else {
             toast({
                title: 'Заказы успешно созданы',
                description: `Создано ${data.orderIds.length} черновиков заказов.`,
            });
            // Navigate to the first created order
            router.push(`/dashboard/purchase-orders/${data.orderIds[0]}`);
        }
    }
  });


  const handleCreatePurchaseOrder = async () => {
    if (!user || !lines || !products || !barId) return;
    await runCreatePurchaseOrder({
        barId,
        userId: user.uid,
        lines,
        products
    });
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
                    Эта сессия инвентаризации еще не завершена. Пожалуйста, завершите сессию для просмотра отчета.
                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                        <Link href={`/dashboard/sessions/${session.id}`}>Вернуться к сессии</Link>
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

    