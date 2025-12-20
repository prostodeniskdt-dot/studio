'use client';
import { ProductsTable } from "@/components/products/products-table";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpIcon } from '@/components/ui/help-icon';

export default function ProductsPage() {
    const { globalProducts, isLoading } = useProducts();

    if (isLoading || !globalProducts) {
        return (
            <div className="w-full space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
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
        )
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center gap-2">
                <HelpIcon 
                    description="Добавьте продукты с указанием веса полной и пустой бутылки. Это необходимо для корректной работы калькулятора."
                />
                <span className="text-sm text-muted-foreground">Подсказка: наведите на иконку лампочки</span>
            </div>
            <ProductsTable products={globalProducts || []} />
        </div>
    );
}
