'use client';
import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import type { PurchaseOrder, PurchaseOrderLine, Product, Supplier } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { translateStatus } from '@/lib/utils';
import { PurchaseOrderLinesTable } from '@/components/purchase-orders/purchase-order-lines-table';
import { useProducts } from '@/contexts/products-context';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PurchaseOrderPage() {
    const params = useParams();
    const id = params.id as string;
    const { user } = useAuthSession();

    const barId = getWorkingBarId(user);
    const [order, setOrder] = React.useState<any | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = React.useState(false);

    // Использовать контекст продуктов вместо прямой загрузки
    const { products: allProducts, isLoading: isLoadingProducts } = useProducts();

    React.useEffect(() => {
      let cancelled = false;
      async function load() {
        if (!user) return;
        setOrder(null);
        setIsLoadingOrder(true);
        try {
          const res = await fetch(`/api/purchase-orders/${id}`, {
            cache: 'no-store',
          });
          const json = await res.json();
          if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
          if (!cancelled) setOrder(json.order ?? null);
        } finally {
          if (!cancelled) setIsLoadingOrder(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [user, id]);

    const isLoading = isLoadingOrder || isLoadingProducts;

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

    const supplier = order.supplier as Supplier | undefined;
    const lines = (order.lines ?? []) as PurchaseOrderLine[];

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
                                Дата заказа: {new Date(order.orderDate).toLocaleDateString('ru-RU')}
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
