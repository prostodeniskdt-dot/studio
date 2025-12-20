'use client';
import { ProductsTable } from "@/components/products/products-table";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
            <Alert variant="default">
                <AlertTitle>Как пользоваться</AlertTitle>
                <AlertDescription>
                    Добавьте продукты с указанием веса полной и пустой бутылки. Это необходимо для корректной работы калькулятора.
                </AlertDescription>
            </Alert>
            <ProductsTable products={globalProducts || []} />
        </div>
    );
}
