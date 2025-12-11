'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, notFound, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import type { InventorySession, Product, InventoryLine, PurchaseOrder } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, query, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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

  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);


  const handleCreatePurchaseOrder = async () => {
    if (!user || !lines || !products || !barId || !firestore) return;

    setIsCreatingOrder(true);
    try {
        const productsToOrder = lines.map(line => {
            const product = products.find(p => p.id === line.productId);
            if (!product || !product.reorderPointMl || !product.reorderQuantity) return null;
            if (line.endStock < product.reorderPointMl) {
                return { product, quantity: product.reorderQuantity };
            }
            return null;
        }).filter((p): p is NonNullable<typeof p> => p !== null);

        if (productsToOrder.length === 0) {
            toast({ title: 'Заказ не требуется', description: 'Остатки всех продуктов выше минимального уровня.' });
            return;
        }

        const ordersBySupplier: Record<string, { product: Product, quantity: number }[]> = {};
        productsToOrder.forEach(item => {
            const supplierId = item.product.defaultSupplierId || 'unknown';
            if (!ordersBySupplier[supplierId]) {
                ordersBySupplier[supplierId] = [];
            }
            ordersBySupplier[supplierId].push(item);
        });

        const batch = writeBatch(firestore);
        const orderIds: string[] = [];

        for (const supplierId in ordersBySupplier) {
            const orderRef = doc(collection(firestore, 'bars', barId, 'purchaseOrders'));
            orderIds.push(orderRef.id);

            const orderData = {
                id: orderRef.id,
                barId,
                supplierId,
                status: 'draft' as const,
                orderDate: serverTimestamp(),
                createdAt: serverTimestamp(),
                createdByUserId: user.uid,
            };
            batch.set(orderRef, orderData);

            ordersBySupplier[supplierId].forEach(item => {
                const lineRef = doc(collection(orderRef, 'lines'));
                const lineData = {
                    id: lineRef.id,
                    purchaseOrderId: orderRef.id,
                    productId: item.product.id,
                    quantity: item.quantity,
                    costPerItem: item.product.costPerBottle,
                    receivedQuantity: 0,
                };
                batch.set(lineRef, lineData);
            });
        }
        await batch.commit();
        toast({
            title: 'Заказы успешно созданы',
            description: `Создано ${orderIds.length} черновиков заказов.`,
        });
        router.push(`/dashboard/purchase-orders/${orderIds[0]}`);

    } catch (serverError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/purchaseOrders`, operation: 'create' }));
    } finally {
        setIsCreatingOrder(false);
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
