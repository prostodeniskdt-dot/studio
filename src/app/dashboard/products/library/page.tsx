'use client';

import * as React from 'react';
import { ProductsLibraryView } from '@/components/products/products-library-view';
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

export default function ProductsLibraryPage() {
    const { libraryProducts, isLoading, refresh: refreshProducts } = useProducts();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();
    const [productToAdd, setProductToAdd] = React.useState<Product | null>(null);
    const [isAdding, setIsAdding] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { user } = useUser();
    const barId = user ? `bar_${user.uid}` : null;
    const { toast } = useToast();

    const handleAddToMyProducts = (product: Product) => {
        setProductToAdd(product);
        handleConfirmAddToMyProducts(product);
    };

    const handleConfirmAddToMyProducts = async (product: Product) => {
        if (!product || !firestore || !barId || !user) return;

        setIsAdding(product.id);
        
        const collectionPath = collection(firestore, 'products');
        // Создаем новый документ с уникальным ID
        const productRef = doc(collectionPath);
        const pathPrefix = 'products';

        try {
            // Копируем все поля продукта, но устанавливаем barId и isInLibrary
            const { id: _, ...productDataWithoutId } = product;
            const newProductData: any = {
                ...productDataWithoutId,
                barId: barId,
                isInLibrary: false,
                createdByUserId: user.uid,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            };
            
            await setDoc(productRef, newProductData);
            
            if (typeof window !== 'undefined' && barId) {
                try {
                    localStorage.removeItem(`barboss_products_cache_${barId}`);
                } catch (e) {
                    // Игнорировать ошибки очистки кэша
                }
            }
            
            refreshProducts();
            
            toast({ 
                title: "Продукт добавлен", 
                description: `Продукт "${buildProductDisplayName(product.name, product.bottleVolumeMl)}" добавлен в ваши продукты.` 
            });
            setProductToAdd(null);
        } catch (serverError) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `${pathPrefix}/${productRef.id}`,
                operation: 'create',
            }));
            toast({
                variant: 'destructive',
                title: 'Ошибка добавления',
                description: 'Не удалось добавить продукт. Попробуйте еще раз.',
            });
        } finally {
            setIsAdding(null);
        }
    };

    if (isLoading || !libraryProducts) {
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
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к моим продуктам
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <HelpIcon 
                            description="Библиотека продуктов содержит продукты, которые пользователи добавили в общую библиотеку. Вы можете добавить любой продукт из библиотеки в свои продукты."
                        />
                        <span className="text-sm text-muted-foreground">Библиотека продуктов</span>
                    </div>
                </div>
            </div>

            <ProductsLibraryView
                products={libraryProducts || []}
                onAddToMyProducts={handleAddToMyProducts}
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

