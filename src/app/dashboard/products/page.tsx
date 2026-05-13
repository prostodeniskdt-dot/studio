'use client';
import * as React from 'react';
import { ProductsCardView } from "@/components/products/products-card-view";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpIcon } from '@/components/ui/help-icon';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory } from '@/lib/types';
import { buildProductDisplayName } from '@/lib/utils';
import { ProductForm } from '@/components/products/product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Library, Upload } from 'lucide-react';
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

export default function ProductsPage() {
    const { personalProducts, isLoading, refresh: refreshProducts } = useProducts();
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
    const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
    const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showArchived, setShowArchived] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | undefined>();
    const [productToSendToLibrary, setProductToSendToLibrary] = React.useState<Product | null>(null);
    const [isSendingToLibrary, setIsSendingToLibrary] = React.useState(false);

    const { user } = useAuthSession();
    const barId = getWorkingBarId(user);
    const { toast } = useToast();

    // #region agent log
    const __dbg = React.useCallback((message: string, data: Record<string, unknown>) => {
        fetch('http://127.0.0.1:7368/ingest/4b9e7ee6-7078-4b91-881c-e050e57a31cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6a8e21' },
            body: JSON.stringify({
                sessionId: '6a8e21',
                runId: 'products-sync',
                hypothesisId: 'A+C',
                location: 'src/app/dashboard/products/page.tsx',
                message,
                data,
                timestamp: Date.now(),
            }),
        }).catch(() => {});
    }, []);
    // #endregion

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
        if (!barId) return;
        setIsArchiving(product.id);
        const currentIsActive = product.isActive ?? true;

        (async () => {
            try {
                const res = await fetch(`/api/products/${product.id}`, {
                    method: 'PATCH',
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({ product: { isActive: !currentIsActive } }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || 'Failed to update product');

                if (typeof window !== 'undefined' && barId) {
                    try { localStorage.removeItem(`barboss_products_cache_${barId}`); } catch {}
                }
                toast({ title: "Статус продукта изменен." });
                refreshProducts();
            } catch {
                toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось обновить продукт.' });
            } finally {
                setIsArchiving(null);
            }
        })();
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
    };

    const handleSendToLibrary = (product: Product) => {
        setProductToSendToLibrary(product);
    };

    const confirmSendToLibrary = async () => {
        if (!productToSendToLibrary || !barId) return;

        setIsSendingToLibrary(true);

        try {
            __dbg('sendToLibrary:start', { productId: productToSendToLibrary.id, barId });
            const res = await fetch(`/api/products/${productToSendToLibrary.id}`, {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ sendToLibrary: true }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to send to library');
            __dbg('sendToLibrary:success', { productId: productToSendToLibrary.id, barId });
            
            if (typeof window !== 'undefined' && barId) {
                try {
                    localStorage.removeItem(`barboss_products_cache_${barId}`);
                } catch (e) {
                    // Игнорировать ошибки очистки кэша
                }
            }
            
            refreshProducts();
            __dbg('sendToLibrary:refreshCalled', { productId: productToSendToLibrary.id, barId });
            
            toast({ 
                title: "Продукт отправлен в библиотеку", 
                description: `Продукт "${buildProductDisplayName(productToSendToLibrary.name, productToSendToLibrary.bottleVolumeMl)}" теперь доступен всем пользователям.` 
            });
            setProductToSendToLibrary(null);
        } catch (serverError) {
            __dbg('sendToLibrary:error', { productId: productToSendToLibrary?.id, barId, error: serverError instanceof Error ? serverError.message : String(serverError) });
            toast({
                variant: 'destructive',
                title: 'Ошибка отправки в библиотеку',
                description: 'Не удалось отправить продукт в библиотеку. Попробуйте еще раз.',
            });
        } finally {
            setIsSendingToLibrary(false);
        }
    };

    const confirmDelete = async () => {
        if (!productToDelete || !barId) return;

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

    if (isLoading || !personalProducts) {
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
                <div className="flex items-center gap-2">
                    <HelpIcon 
                        description="Добавьте продукты с указанием веса полной и пустой бутылки. Это необходимо для корректной работы калькулятора."
                    />
                    <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
                </div>
                <Link href="/dashboard/products/library">
                    <Button variant="outline" className="gap-2">
                        <Library className="h-4 w-4" />
                        Библиотека продуктов
                    </Button>
                </Link>
            </div>

            <ProductsCardView
                products={personalProducts || []}
                onEdit={handleOpenSheet}
                onArchive={handleArchiveAction}
                onDelete={handleDeleteProduct}
                onSendToLibrary={handleSendToLibrary}
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

            {/* Диалог подтверждения отправки в библиотеку */}
            <AlertDialog open={!!productToSendToLibrary} onOpenChange={(open) => !open && setProductToSendToLibrary(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Отправить продукт в библиотеку?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите отправить продукт "{productToSendToLibrary ? buildProductDisplayName(productToSendToLibrary.name, productToSendToLibrary.bottleVolumeMl) : ''}" в общую библиотеку? 
                            После этого он станет доступен всем пользователям, но вы больше не сможете его редактировать.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductToSendToLibrary(null)}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSendToLibrary}
                            disabled={isSendingToLibrary}
                        >
                            {isSendingToLibrary ? 'Отправка...' : 'Отправить в библиотеку'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
