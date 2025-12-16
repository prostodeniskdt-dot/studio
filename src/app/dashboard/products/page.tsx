'use client';
import { ProductsTable } from "@/components/products/products-table";
import { useProducts } from "@/contexts/products-context";
import { Loader2 } from "lucide-react";

export default function ProductsPage() {
    const { products, isLoading } = useProducts();

    if (isLoading || !products) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="w-full">
            <ProductsTable products={products || []} />
        </div>
    );
}
