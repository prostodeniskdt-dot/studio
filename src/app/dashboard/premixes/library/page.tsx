'use client';

import * as React from 'react';
import { PremixesLibraryView } from '@/components/premixes/premixes-library-view';
import { useProducts } from '@/contexts/products-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HelpIcon } from '@/components/ui/help-icon';
import { useAuthSession } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory } from '@/lib/types';
import { buildProductDisplayName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PremixesLibraryPage() {
    const { libraryPremixes, isLoading, refresh: refreshProducts } = useProducts();
    const [isAdding, setIsAdding] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();

    const { user } = useAuthSession();
    const barId = user ? `bar_${user.id}` : null;
    const { toast } = useToast();

    const handleAddToMyPremixes = async (premix: Product) => {
        if (!premix || !barId || !user) return;

        setIsAdding(premix.id);

        try {
            const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = premix as any;
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    product: {
                        ...rest,
                        isInLibrary: false,
                        isActive: premix.isActive ?? true,
                    },
                }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
            
            if (typeof window !== 'undefined' && barId) {
                try {
                    localStorage.removeItem(`barboss_products_cache_${barId}`);
                } catch (e) {
                    // Игнорировать ошибки очистки кэша
                }
            }
            
            refreshProducts();
            
            toast({ 
                title: "Премикс добавлен", 
                description: `Премикс "${buildProductDisplayName(premix.name, premix.bottleVolumeMl)}" добавлен в ваши премиксы.` 
            });
        } catch (serverError) {
            toast({
                variant: 'destructive',
                title: 'Ошибка добавления',
                description: 'Не удалось добавить премикс. Попробуйте еще раз.',
            });
        } finally {
            setIsAdding(null);
        }
    };

    if (isLoading || !libraryPremixes) {
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/premixes">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к моим премиксам
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <HelpIcon 
                            description="Библиотека премиксов содержит премиксы, которые пользователи добавили в общую библиотеку. Вы можете добавить любой премикс из библиотеки в свои премиксы."
                        />
                        <span className="text-sm text-muted-foreground">Библиотека премиксов</span>
                    </div>
                </div>
            </div>

            <PremixesLibraryView
                premixes={libraryPremixes || []}
                onAddToMyPremixes={handleAddToMyPremixes}
                isAdding={isAdding}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSubCategoryChange={setSelectedSubCategory}
            />
        </div>
    );
}

