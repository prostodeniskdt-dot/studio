'use client';

import * as React from 'react';
import { PremixesLibraryView } from '@/components/premixes/premixes-library-view';
import { useProducts } from '@/contexts/products-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HelpIcon } from '@/components/ui/help-icon';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
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

    const firestore = useFirestore();
    const { user } = useUser();
    const barId = user ? `bar_${user.uid}` : null;
    const { toast } = useToast();

    const handleAddToMyPremixes = async (premix: Product) => {
        if (!premix || !firestore || !barId || !user) return;

        setIsAdding(premix.id);
        
        const collectionPath = collection(firestore, 'products');
        // Создаем новый документ с уникальным ID
        const premixRef = doc(collectionPath);
        const pathPrefix = 'products';

        try {
            // Копируем все поля премикса, но устанавливаем barId и isInLibrary
            const { id: _, ...premixDataWithoutId } = premix;
            const newPremixData: any = {
                ...premixDataWithoutId,
                barId: barId,
                isInLibrary: false,
                createdByUserId: user.uid,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            };
            
            await setDoc(premixRef, newPremixData);
            
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `${pathPrefix}/${premixRef.id}`,
                operation: 'create',
            }));
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

