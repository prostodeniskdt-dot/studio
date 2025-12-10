'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { ReportView } from "@/components/reports/report-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import type { InventorySession, Product, InventoryLine, PurchaseOrder } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, writeBatch, Timestamp, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


export default function SessionReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);

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

  const handleCreatePurchaseOrder = async () => {
    if (!firestore || !barId || !user || !lines || !products) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить все необходимые данные.' });
        return;
    }

    setIsCreatingOrder(true);

    // 1. Find products that need reordering
    const productsToReorder = lines.map(line => {
        const product = products.find(p => p.id === line.productId);
        if (!product || !product.reorderPointMl || !product.defaultSupplierId) return null;
        if (line.endStock < product.reorderPointMl) {
            return product;
        }
        return null;
    }).filter((p): p is Product => p !== null);

    if (productsToReorder.length === 0) {
        toast({ title: 'Заказ не требуется', description: 'Остатки всех продуктов выше минимального уровня.' });
        setIsCreatingOrder(false);
        return;
    }

    // 2. Group products by supplier
    const ordersBySupplier: Record<string, Product[]> = productsToReorder.reduce((acc, product) => {
        const supplierId = product.defaultSupplierId!;
        if (!acc[supplierId]) {
            acc[supplierId] = [];
        }
        acc[supplierId].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    try {
        const orderIds: string[] = [];
        const batch = writeBatch(firestore);

        for (const supplierId in ordersBySupplier) {
            const productsForOrder = ordersBySupplier[supplierId];
            
            // Create Purchase Order
            const orderRef = doc(collection(firestore, 'bars', barId, 'purchaseOrders'));
            const newOrder: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
                barId: barId,
                supplierId: supplierId,
                status: 'draft',
                orderDate: Timestamp.now(),
                createdByUserId: user.uid,
            };
            batch.set(orderRef, { ...newOrder, id: orderRef.id, createdAt: Timestamp.now() });

            // Create Purchase Order Lines
            productsForOrder.forEach(product => {
                const lineRef = doc(collection(orderRef, 'lines'));
                const newLine = {
                    purchaseOrderId: orderRef.id,
                    productId: product.id,
                    quantity: product.reorderQuantity || 1,
                    costPerItem: product.costPerBottle,
                    receivedQuantity: 0
                };
                batch.set(lineRef, newLine);
            });
            orderIds.push(orderRef.id);
        }

        await batch.commit();

        toast({
            title: 'Заказы успешно созданы',
            description: `Создано ${orderIds.length} черновиков заказов.`,
        });

        // Navigate to the first created order
        if (orderIds.length > 0) {
            router.push(`/dashboard/purchase-orders/${orderIds[0]}`);
        }

    } catch (error) {
        console.error("Failed to create purchase orders:", error);
        toast({ variant: 'destructive', title: 'Ошибка создания заказов', description: 'Произошла ошибка при создании черновиков.' });
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
        <div className="container mx-auto flex items-center justify-center h-full pt-20">
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
    <div className="container mx-auto">
      <ReportView 
        session={{...session, lines: lines}} 
        products={products}
        onCreatePurchaseOrder={handleCreatePurchaseOrder}
        isCreatingOrder={isCreatingOrder}
      />
    </div>
  );
}

    