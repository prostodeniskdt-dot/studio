'use client';
import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderLine, Product, Supplier } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { translateStatus } from '@/lib/utils';
import { PurchaseOrderLinesTable } from '@/components/purchase-orders/purchase-order-lines-table';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PurchaseOrderPage() {
    const params = useParams();
    const id = params.id as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const barId = user ? `bar_${user.uid}` : null;

    const orderRef = useMemoFirebase(() =>
        firestore && barId ? doc(firestore, 'bars', barId, 'purchaseOrders', id) : null,
        [firestore, barId, id]
    );
    const { data: order, isLoading: isLoadingOrder } = useDoc<PurchaseOrder>(orderRef);

    const supplierRef = useMemoFirebase(() =>
        firestore && barId && order ? doc(firestore, 'bars', barId, 'suppliers', order.supplierId) : null,
        [firestore, barId, order]
    );
    const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierRef);
    
    const linesRef = useMemoFirebase(() =>
        firestore && barId ? collection(firestore, 'bars', barId, 'purchaseOrders', id, 'lines') : null,
        [firestore, barId, id]
    );
    const { data: lines, isLoading: isLoadingLines } = useCollection<PurchaseOrderLine>(linesRef);

    const productsRef = useMemoFirebase(() =>
        firestore ? collection(firestore, 'products') : null,
        [firestore]
    );
    const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);


    const isLoading = isLoadingOrder || isLoadingSupplier || isLoadingLines || isLoadingProducts;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full pt-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!order) {
        if (!isLoadingOrder) {
            notFound();
        }
        return null;
    }

    return (
        <>
             <div className="mb-4">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/purchase-orders">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Назад к закупкам
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Заказ №{order.id.substring(0, 6)}</CardTitle>
                            <CardDescription>
                                Поставщик: <span className="font-semibold">{supplier?.name || 'Загрузка...'}</span> | 
                                Дата заказа: {order.orderDate.toDate().toLocaleDateString('ru-RU')}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-base">
                            {translateStatus(order.status)}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <PurchaseOrderLinesTable
                        lines={lines || []}
                        products={allProducts || []}
                        barId={barId!}
                        orderId={order.id}
                        isEditable={order.status === 'draft' || order.status === 'ordered' || order.status === 'partially_received'}
                    />
                </CardContent>
            </Card>
        </>
    )
}
