'use client';
import { PremixesTable } from "@/components/premixes/premixes-table";
import { useProducts } from "@/contexts/products-context";
import { Loader2 } from "lucide-react";

export default function PremixesPage() {
    const { premixes, isLoading } = useProducts();

    if (isLoading || !premixes) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="w-full">
            <PremixesTable premixes={premixes || []} />
        </div>
    );
}

