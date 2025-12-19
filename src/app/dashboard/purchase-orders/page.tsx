'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderLine, Supplier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PurchaseOrdersTable } from '@/components/purchase-orders/purchase-orders-table';
import { useRelatedCollection } from '@/hooks/use-related-collection';
import { useSuppliers } from '@/contexts/suppliers-context';

export type OrderWithSupplierAndTotal = PurchaseOrder & {
  supplier?: Supplier;
  totalAmount: number;
};

export default function PurchaseOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const ordersQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'purchaseOrders'), orderBy('orderDate', 'desc')) : null,
    [firestore, barId]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<PurchaseOrder>(ordersQuery);

  // Использовать контекст поставщиков вместо прямой загрузки
  const { suppliers, isLoading: isLoadingSuppliers } = useSuppliers();
  
  // Use optimized hook for loading related collections
  const orderIds = React.useMemo(() => orders?.map(o => o.id) || [], [orders]);
  const { data: allOrderLines, isLoading: isLoadingLines } = useRelatedCollection<PurchaseOrderLine>(
    firestore,
    orderIds,
    (orderId) => `bars/${barId}/purchaseOrders/${orderId}/lines`
  );


  // Create suppliers map for O(1) lookup
  const suppliersMap = React.useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers?.forEach((s: Supplier) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  const ordersWithDetails = React.useMemo<OrderWithSupplierAndTotal[]>(() => {
    if (!orders || !suppliers) return [];

    return orders.map(order => {
      const orderLines = allOrderLines[order.id] || [];
      const totalAmount = orderLines.reduce((sum, line) => sum + (line.quantity * line.costPerItem), 0);
      return {
        ...order,
        supplier: suppliersMap.get(order.supplierId),
        totalAmount: totalAmount,
      };
    });
  }, [orders, suppliersMap, allOrderLines]);

  const isLoading = isLoadingOrders || isLoadingSuppliers || isLoadingLines;
  
  if (isLoading || !barId) {
    return (
      <div className="w-full space-y-4">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
        <PurchaseOrdersTable orders={ordersWithDetails} barId={barId} suppliers={suppliers || []} />
    </div>
  );
}
