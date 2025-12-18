'use client';

import * as React from 'react';
import { PlusCircle, Search, Edit2, Trash2, Archive, ArchiveRestore, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
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
import type { Product } from '@/lib/types';
import { formatCurrency, buildProductDisplayName } from '@/lib/utils';
import { PremixForm } from './premix-form';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useProducts } from '@/contexts/products-context';

export function PremixesCardView({ premixes }: { premixes: Product[] }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingPremix, setEditingPremix] = React.useState<Product | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [premixToDelete, setPremixToDelete] = React.useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();
  const { products: allProducts } = useProducts();

  // Создаем Map для быстрого поиска продуктов по ID
  const productsMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach(p => map.set(p.id, p));
    return map;
  }, [allProducts]);

  // Фильтрация примиксов
  const filteredPremixes = React.useMemo(() => {
    if (!searchQuery.trim()) return premixes;
    const query = searchQuery.toLowerCase();
    return premixes.filter(p => {
      // Поиск по названию
      if (p.name.toLowerCase().includes(query)) return true;
      
      // Поиск по названиям ингредиентов
      if (p.premixIngredients?.some(ing => {
        const product = productsMap.get(ing.productId);
        return product?.name.toLowerCase().includes(query);
      })) return true;
      
      return false;
    });
  }, [premixes, searchQuery, productsMap]);

  const handleOpenDialog = (premix?: Product) => {
    setEditingPremix(premix);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPremix(undefined);
  };

  const handleArchiveAction = async (premix: Product) => {
    if (!firestore) return;
    setIsArchiving(premix.id);
    
    const collectionPath = collection(firestore, 'products');
    const premixRef = doc(collectionPath, premix.id);
    const updateData = { isActive: !premix.isActive };
    const pathPrefix = 'products';
    
    try {
      await updateDoc(premixRef, updateData);
      toast({ title: "Статус примикса изменен." });
    } catch (serverError) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: `${pathPrefix}/${premix.id}`, 
        operation: 'update', 
        requestResourceData: updateData 
      }));
    } finally {
      setIsArchiving(null);
    }
  };

  const handleDeletePremix = (premix: Product) => {
    setPremixToDelete(premix);
  };

  const confirmDelete = async () => {
    if (!premixToDelete || !firestore) return;

    setIsDeleting(true);
    
    const collectionPath = collection(firestore, 'products');
    const premixRef = doc(collectionPath, premixToDelete.id);
    const pathPrefix = 'products';

    try {
      await deleteDoc(premixRef);
      toast({ 
        title: "Примикс удален", 
        description: `Примикс "${buildProductDisplayName(premixToDelete.name, premixToDelete.bottleVolumeMl)}" был безвозвратно удален.` 
      });
      setPremixToDelete(null);
    } catch (serverError) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `${pathPrefix}/${premixToDelete.id}`,
        operation: 'delete',
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Примиксы</h1>
          <p className="text-muted-foreground">Управляйте примиксами и заготовками для калькулятора.</p>
        </div>

        {/* Search with Add Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или ингредиентам..."
              className="pl-9"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="h-9">
                <PlusCircle className="mr-2 h-4 w-4" />
                Добавить примикс
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPremix 
                    ? `Редактировать: ${buildProductDisplayName(editingPremix.name, editingPremix.bottleVolumeMl)}` 
                    : 'Добавить новый примикс'}
                </DialogTitle>
                <DialogDescription>
                  {editingPremix 
                    ? 'Измените информацию о примиксе и его составе.'
                    : 'Создайте новый примикс, указав его состав из продуктов и заготовок.'}
                </DialogDescription>
              </DialogHeader>
              <PremixForm 
                premix={editingPremix} 
                onFormSubmit={handleCloseDialog} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards Grid */}
        {filteredPremixes.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Примиксы не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Попробуйте изменить поисковый запрос.' : 'Создайте свой первый примикс.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {filteredPremixes.map((premix) => (
              <Card key={premix.id} className={`flex flex-col ${premix.isActive ? '' : 'opacity-60'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {buildProductDisplayName(premix.name, premix.bottleVolumeMl)}
                      </CardTitle>
                      <CardDescription className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">Примикс</Badge>
                        <Badge variant={premix.isActive ? 'default' : 'outline'} className="text-xs">
                          {premix.isActive ? 'Активен' : 'Архивирован'}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pb-4">
                  {/* Ингредиенты */}
                  {premix.premixIngredients && premix.premixIngredients.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Состав:</h4>
                      <div className="space-y-1.5">
                        {premix.premixIngredients.map((ingredient, index) => {
                          const product = productsMap.get(ingredient.productId);
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between gap-2 text-sm bg-muted/50 p-2.5 rounded-md"
                            >
                              <span className="font-medium truncate flex-1 min-w-0">
                                {product ? buildProductDisplayName(product.name, product.bottleVolumeMl) : ingredient.productId}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap ml-2">
                                {ingredient.volumeMl} мл <span className="text-xs">({(ingredient.ratio * 100).toFixed(1)}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground text-center">Ингредиенты не добавлены</p>
                    </div>
                  )}

                  {/* Информация */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Объем</div>
                      <div className="font-semibold text-base">{premix.bottleVolumeMl} мл</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Стоимость</div>
                      <div className="font-semibold text-base">{formatCurrency(premix.costPerBottle)}</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(premix)}
                    className="flex-1"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveAction(premix)}
                    disabled={isArchiving === premix.id}
                    className="px-3"
                  >
                    {isArchiving === premix.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : premix.isActive ? (
                      <Archive className="h-4 w-4" />
                    ) : (
                      <ArchiveRestore className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePremix(premix)}
                    className="text-destructive hover:text-destructive px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        {filteredPremixes.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Найдено примиксов: {filteredPremixes.length}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!premixToDelete} onOpenChange={(open) => !open && setPremixToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить примикс{' '}
              <span className="font-semibold">
                "{premixToDelete ? buildProductDisplayName(premixToDelete.name, premixToDelete.bottleVolumeMl) : ''}"
              </span>. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

