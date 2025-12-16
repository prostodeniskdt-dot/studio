'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { PurchaseOrder, Supplier, PurchaseOrderLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PurchaseOrdersTable } from '@/components/purchase-orders/purchase-orders-table';
import { useRelatedCollection } from '@/hooks/use-related-collection';

export type OrderWithSupplierAndTotal = PurchaseOrder & {
  supplier?: Supplier;
  totalAmount: number;
};

export default function PurchaseOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const ordersQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'purchaseOrders')) : null,
    [firestore, barId]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<PurchaseOrder>(ordersQuery);

  const suppliersQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'suppliers')) : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  
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
    suppliers?.forEach(s => map.set(s.id, s));
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
    }).sort((a, b) => (b.orderDate?.toMillis() ?? 0) - (a.orderDate?.toMillis() ?? 0));
  }, [orders, suppliersMap, allOrderLines]);

  const isLoading = isLoadingOrders || isLoadingSuppliers || isLoadingLines;
  
  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
        <PurchaseOrdersTable orders={ordersWithDetails} barId={barId} suppliers={suppliers || []} />
    </div>
  );
}
