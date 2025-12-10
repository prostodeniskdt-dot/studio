'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, Supplier } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PurchaseOrdersTable } from '@/components/purchase-orders/purchase-orders-table';

export default function PurchaseOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const [ordersWithSupplier, setOrdersWithSupplier] = React.useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const ordersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'purchaseOrders') : null,
    [firestore, barId]
  );
  
  const { data: orders, isLoading: isLoadingOrders } = useCollection<PurchaseOrder>(ordersQuery);

  const suppliersQuery = useMemoFirebase(() =>
    firestore && barId ? collection(firestore, 'bars', barId, 'suppliers') : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  React.useEffect(() => {
    if (isLoadingOrders || isLoadingSuppliers) {
      setIsLoading(true);
      return;
    }
    if (!orders || !suppliers) {
      setIsLoading(false);
      setOrdersWithSupplier([]);
      return;
    };
    
    const ordersWithData = orders.map(order => {
        const supplier = suppliers.find(s => s.id === order.supplierId);
        return { ...order, supplier: supplier };
    });
    setOrdersWithSupplier(ordersWithData);
    setIsLoading(false);

  }, [orders, suppliers, isLoadingOrders, isLoadingSuppliers]);
  

  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PurchaseOrdersTable orders={ordersWithSupplier} barId={barId} suppliers={suppliers || []} />
    </div>
  );
}
