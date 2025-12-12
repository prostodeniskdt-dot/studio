'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
    firestore && barId ? query(collection(firestore, 'bars', barId, 'suppliers')) : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
  
  const [allOrderLines, setAllOrderLines] = React.useState<Record<string, PurchaseOrderLine[]>>({});
  const [isLoadingLines, setIsLoadingLines] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !barId || !orders) {
      if(!isLoadingOrders) setIsLoadingLines(false);
      return;
    };
    
    if (orders.length === 0) {
        setAllOrderLines({});
        setIsLoadingLines(false);
        return;
    }
    
    setIsLoadingLines(true);
    const fetchAllLines = async () => {
        const linesPromises = orders.map(order => 
            getDocs(query(collection(firestore, 'bars', barId, 'purchaseOrders', order.id, 'lines')))
        );
        
        try {
            const snapshotResults = await Promise.all(linesPromises);
            
            const linesByOrder = snapshotResults.reduce((acc, snapshot, index) => {
                const orderId = orders[index].id;
                acc[orderId] = snapshot.docs.map(doc => doc.data() as PurchaseOrderLine);
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
