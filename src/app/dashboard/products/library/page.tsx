'use client';

import * as React from 'react';
import { ProductsLibraryView } from '@/components/products/products-library-view';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProductsLibraryPage() {
    const { libraryProducts, isLoading, refresh: refreshProducts } = useProducts();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();
    const [productToAdd, setProductToAdd] = React.useState<Product | null>(null);
    const [isAdding, setIsAdding] = React.useState<string | null>(null);
    const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const { user } = useAuthSession();
    const barId = user ? `bar_${user.id}` : null;
    const { toast } = useToast();

    const handleAddToMyProducts = (product: Product) => {
        setProductToAdd(product);
        handleConfirmAddToMyProducts(product);
    };

    const handleConfirmAddToMyProducts = async (product: Product) => {
        if (!product || !barId || !user) return;

        setIsAdding(product.id);

        try {
            const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = product as any;
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    product: {
                        ...rest,
                        isInLibrary: false,
                        isActive: product.isActive ?? true,
                    },
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to add product');
            
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
            toast({
                variant: 'destructive',
                title: 'Ошибка добавления',
                description: 'Не удалось добавить продукт. Попробуйте еще раз.',
            });
        } finally {
            setIsAdding(null);
        }
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
    };

    const confirmDelete = async () => {
        if (!productToDelete || !user) return;

        setIsDeleting(true);

        try {
            const res = await fetch(`/api/products/${productToDelete.id}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to delete');
            
            if (typeof window !== 'undefined' && barId) {
                try {
                    localStorage.removeItem(`barboss_products_cache_${barId}`);
                } catch (e) {
                    // Игнорировать ошибки очистки кэша
                }
            }
            
            refreshProducts();
            
            toast({ 
                title: "Продукт удален", 
                description: `Продукт "${buildProductDisplayName(productToDelete.name, productToDelete.bottleVolumeMl)}" был безвозвратно удален.` 
            });
            setProductToDelete(null);
        } catch (serverError) {
            toast({
                variant: 'destructive',
                title: 'Ошибка удаления',
                description: 'Не удалось удалить продукт. Попробуйте еще раз.',
            });
        } finally {
            setIsDeleting(false);
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
                onDelete={handleDeleteProduct}
                isAdding={isAdding}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSubCategoryChange={setSelectedSubCategory}
            />

            {/* Диалог подтверждения удаления */}
            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить продукт?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить продукт "{productToDelete ? buildProductDisplayName(productToDelete.name, productToDelete.bottleVolumeMl) : ''}"? 
                            Это действие нельзя отменить.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductToDelete(null)}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Удаление...' : 'Удалить'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

