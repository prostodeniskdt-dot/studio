'use client';
import * as React from 'react';
import { ProductsCardView } from "@/components/products/products-card-view";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpIcon } from '@/components/ui/help-icon';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory } from '@/lib/types';
import { buildProductDisplayName } from '@/lib/utils';
import { ProductForm } from '@/components/products/product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

export default function ProductsPage() {
    const { globalProducts, isLoading, refresh: refreshProducts } = useProducts();
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
    const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
    const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showArchived, setShowArchived] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();

    const firestore = useFirestore();
    const { user } = useUser();
    const barId = user ? `bar_${user.uid}` : null;
    const { toast } = useToast();

    const handleOpenSheet = (product?: Product) => {
        setEditingProduct(product);
        setIsSheetOpen(true);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingProduct(undefined);
        setTimeout(() => {
            refreshProducts();
        }, 200);
    };

    const handleArchiveAction = (product: Product) => {
        if (!firestore || !barId) return;
        setIsArchiving(product.id);
        
        const collectionPath = collection(firestore, 'products');
        const productRef = doc(collectionPath, product.id);
        const currentIsActive = product.isActive ?? true;
        const updateData = { isActive: !currentIsActive };
        const pathPrefix = 'products';
        
        updateDoc(productRef, updateData)
            .then(() => {
                if (typeof window !== 'undefined' && barId) {
                    try {
                        localStorage.removeItem(`barboss_products_cache_${barId}`);
                    } catch (e) {
                        // Игнорировать ошибки очистки кэша
                    }
                }
                
                toast({ title: "Статус продукта изменен." });
                refreshProducts();
                setTimeout(() => {
                    refreshProducts();
                }, 100);
            })
            .catch((serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${pathPrefix}/${product.id}`, operation: 'update', requestResourceData: updateData }));
            })
            .finally(() => {
                setIsArchiving(null);
            });
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
    };

    const confirmDelete = async () => {
        if (!productToDelete || !firestore || !barId) return;

        setIsDeleting(true);
        
        const collectionPath = collection(firestore, 'products');
        const productRef = doc(collectionPath, productToDelete.id);
        const pathPrefix = 'products';

        try {
            await deleteDoc(productRef);
            
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
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `${pathPrefix}/${productToDelete.id}`,
                operation: 'delete',
            }));
            toast({
                variant: 'destructive',
                title: 'Ошибка удаления',
                description: 'Не удалось удалить продукт. Попробуйте еще раз.',
            });
        } finally {
            setIsDeleting(false);
        }
    };

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
                <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
            </div>

            <ProductsCardView
                products={globalProducts || []}
                onEdit={handleOpenSheet}
                onArchive={handleArchiveAction}
                onDelete={handleDeleteProduct}
                onAdd={() => handleOpenSheet()}
                isArchiving={isArchiving}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSubCategoryChange={setSelectedSubCategory}
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
            />

            {/* Форма редактирования продукта */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto max-w-3xl">
                    <SheetHeader>
                        <SheetTitle>
                            {editingProduct 
                                ? `Редактировать: ${buildProductDisplayName(editingProduct.name, editingProduct.bottleVolumeMl)}` 
                                : 'Добавить новый продукт'}
                        </SheetTitle>
                    </SheetHeader>
                    <ProductForm 
                        product={editingProduct} 
                        onFormSubmit={handleCloseSheet} 
                    />
                </SheetContent>
            </Sheet>

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
