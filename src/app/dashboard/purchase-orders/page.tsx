'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, Supplier, PurchaseOrderLine } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PurchaseOrdersTable } from '@/components/purchase-orders/purchase-orders-table';

export type OrderWithSupplier = PurchaseOrder & { supplier?: Supplier; totalAmount: number };

export default function PurchaseOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const [ordersWithDetails, setOrdersWithDetails] = React.useState<OrderWithSupplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetching suppliers separately for the creation form
  const suppliersQuery = useMemoFirebase(() =>
    firestore && barId ? collection(firestore, 'bars', barId, 'suppliers') : null,
    [firestore, barId]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  React.useEffect(() => {
    if (!firestore || !barId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all suppliers first
        const suppliersSnapshot = await getDocs(query(collection(firestore, 'bars', barId, 'suppliers')));
        const suppliersMap = new Map(suppliersSnapshot.docs.map(doc => doc.data() as Supplier).map(s => [s.id, s]));

        // Fetch all orders
        const ordersQuery = collection(firestore, 'bars', barId, 'purchaseOrders');
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseOrder));

        // For each order, fetch its lines and calculate the total amount
        const detailedOrders = await Promise.all(
          ordersData.map(async (order) => {
            const linesQuery = collection(firestore, 'bars', barId, 'purchaseOrders', order.id, 'lines');
            const linesSnapshot = await getDocs(linesQuery);
            const lines = linesSnapshot.docs.map(doc => doc.data() as PurchaseOrderLine);
            
            const totalAmount = lines.reduce((sum, line) => sum + (line.quantity * line.costPerItem), 0);
            
            return {
              ...order,
              supplier: suppliersMap.get(order.supplierId),
              totalAmount,
            };
          })
        );
        
        // Sort by date, newest first
        detailedOrders.sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis());

        setOrdersWithDetails(detailedOrders);
      } catch (error) {
        console.error("Error fetching orders with details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // We can also set up a listener here if real-time updates are needed,
    // but a fetch-on-load is simpler for this use case.

  }, [firestore, barId]);
  

  if (isLoading || isLoadingSuppliers || !barId) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PurchaseOrdersTable orders={ordersWithDetails} barId={barId} suppliers={suppliers || []} />
    </div>
  );
}
