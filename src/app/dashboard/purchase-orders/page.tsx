'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { PurchaseOrder, Supplier, PurchaseOrderLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PurchaseOrdersTable } from '@/components/purchase-orders/purchase-orders-table';

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
    firestore && barId ? collection(firestore, 'bars', barId, 'suppliers') : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  
  // This state will hold all lines for all orders.
  const [allOrderLines, setAllOrderLines] = React.useState<Record<string, PurchaseOrderLine[]>>({});
  const [isLoadingLines, setIsLoadingLines] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !barId || !orders) {
      if (!isLoadingOrders) setIsLoadingLines(false);
      return;
    };
    
    setIsLoadingLines(true);
    const fetchAllLines = async () => {
        const linesPromises = orders.map(order => {
            const linesQuery = query(collection(firestore, 'bars', barId, 'purchaseOrders', order.id, 'lines'));
            return getDocs(linesQuery).then(snapshot => ({
                orderId: order.id,
                lines: snapshot.docs.map(doc => doc.data() as PurchaseOrderLine)
            }));
        });
        
        try {
            const results = await Promise.all(linesPromises);
            const linesByOrder = results.reduce((acc, result) => {
                acc[result.orderId] = result.lines;
                return acc;
            }, {} as Record<string, PurchaseOrderLine[]>);
            setAllOrderLines(linesByOrder);
        } catch (error) {
            console.error("Error fetching all order lines:", error);
        } finally {
            setIsLoadingLines(false);
        }
    };

    fetchAllLines();

  }, [firestore, barId, orders, isLoadingOrders]);


  const ordersWithDetails = React.useMemo<OrderWithSupplierAndTotal[]>(() => {
    if (!orders || !suppliers) return [];

    return orders.map(order => {
      const orderLines = allOrderLines[order.id] || [];
      const totalAmount = orderLines.reduce((sum, line) => sum + (line.quantity * line.costPerItem), 0);
      return {
        ...order,
        supplier: suppliers.find(s => s.id === order.supplierId),
        totalAmount: totalAmount,
      };
    }).sort((a, b) => (b.orderDate?.toMillis() ?? 0) - (a.orderDate?.toMillis() ?? 0));
  }, [orders, suppliers, allOrderLines]);

  const isLoading = isLoadingOrders || isLoadingSuppliers || isLoadingLines;
  
  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PurchaseOrdersTable orders={ordersWithDetails} barId={barId} suppliers={suppliers || []} />
  );
}
