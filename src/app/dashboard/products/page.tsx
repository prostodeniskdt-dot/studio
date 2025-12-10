'use client';
import { ProductsTable } from "@/components/products/products-table";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function ProductsPage() {
    const firestore = useFirestore();

    const productsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'products')) : null,
        [firestore]
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
        <ProductsTable products={products || []} />
    );
}
