'use client';
import { ProductsTable } from "@/components/products/products-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function ProductsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const barId = user ? `bar_${user.uid}` : null;

    const productsQuery = useMemoFirebase(() => 
        firestore && barId ? query(collection(firestore, 'bars', barId, 'products')) : null,
        [firestore, barId]
    );

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    if (isLoading || !products) {
        return (
            <div className="flex justify-center items-center h-full pt-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container mx-auto">
            <ProductsTable products={products || []} barId={barId} />
        </div>
    );
}
