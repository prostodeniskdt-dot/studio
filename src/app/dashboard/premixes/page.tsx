'use client';
import { PremixesCardView } from "@/components/premixes/premixes-card-view";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpIcon } from '@/components/ui/help-icon';
import { Button } from '@/components/ui/button';
import { Library } from 'lucide-react';
import Link from 'next/link';

export default function PremixesPage() {
    const { personalPremixes, isLoading } = useProducts();

    if (isLoading || !personalPremixes) {
        return (
            <div className="w-full space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full mb-4" />
                                <Skeleton className="h-16 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpIcon 
                  description="Управляйте премиксами - заготовками и коктейлями. Создавайте новые премиксы, редактируйте существующие. Премиксы используются для расчета себестоимости коктейлей."
                />
                <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
              </div>
              <Link href="/dashboard/premixes/library">
                <Button variant="outline" className="gap-2">
                  <Library className="h-4 w-4" />
                  Библиотека премиксов
                </Button>
              </Link>
            </div>
            <PremixesCardView premixes={personalPremixes || []} />
        </div>
    );
}

