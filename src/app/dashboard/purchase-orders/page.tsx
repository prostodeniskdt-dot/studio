'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderLine, Supplier, Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelatedCollection } from '@/hooks/use-related-collection';
import { useSuppliers } from '@/contexts/suppliers-context';
import { useProducts } from '@/contexts/products-context';
import { Download, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildProductDisplayName } from '@/lib/utils';
import { HelpIcon } from '@/components/ui/help-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PurchaseOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  
  // Загружаем заказы
  const ordersQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'purchaseOrders'), orderBy('orderDate', 'desc')) : null,
    [firestore, barId]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<PurchaseOrder>(ordersQuery);

  // Загружаем поставщиков и продукты
  const { suppliers, isLoading: isLoadingSuppliers } = useSuppliers();
  const { products, isLoading: isLoadingProducts } = useProducts();

  // Загружаем строки заказов
  const orderIds = React.useMemo(() => orders?.map(o => o.id) || [], [orders]);
  const { data: allOrderLines, isLoading: isLoadingLines } = useRelatedCollection<PurchaseOrderLine>(
    firestore,
    orderIds,
    (orderId) => `bars/${barId}/purchaseOrders/${orderId}/lines`
  );

  // Группируем заказы по поставщикам
  const ordersBySupplier = React.useMemo(() => {
    if (!orders || !suppliers || !allOrderLines) return {};
    
    const grouped: Record<string, { supplier: Supplier; orders: PurchaseOrder[]; lines: PurchaseOrderLine[] }> = {};
    
    orders.forEach(order => {
      const supplier = suppliers.find(s => s.id === order.supplierId);
      const supplierId = order.supplierId || 'no-supplier';
      const supplierName = supplier?.name || 'Без поставщика';
      
      if (!grouped[supplierId]) {
        grouped[supplierId] = {
          supplier: supplier || { id: 'no-supplier', barId: barId || '', name: 'Без поставщика' },
          orders: [],
          lines: []
        };
      }
      
      grouped[supplierId].orders.push(order);
      const orderLines = allOrderLines[order.id] || [];
      grouped[supplierId].lines.push(...orderLines);
    });
    
    return grouped;
  }, [orders, suppliers, allOrderLines, barId]);

  // Функция экспорта CSV
  const handleExportCSV = (supplierId: string) => {
    const group = ordersBySupplier[supplierId];
    if (!group || !products) return;

    const escapeCSV = (value: string | number): string => {
      const stringValue = String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const SEPARATOR = ';';
    const headers = ['Наименование продукта', 'Количество', 'Цена за единицу', 'Сумма'];
    const headerRow = headers.map(escapeCSV).join(SEPARATOR);

    const rows = group.lines.map(line => {
      const product = products.find(p => p.id === line.productId);
      const productName = product 
        ? buildProductDisplayName(product.name, product.bottleVolumeMl)
        : 'Неизвестный продукт';
      const quantity = line.quantity || 0;
      const costPerItem = line.costPerItem || 0;
      const total = quantity * costPerItem;

      return [
        productName,
        quantity,
        costPerItem.toFixed(2),
        total.toFixed(2),
      ].map(escapeCSV).join(SEPARATOR);
    });

    const csvContent = [headerRow, ...rows].join('\r\n');
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `purchase_order_${group.supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Экспорт завершен',
      description: `Данные заказа для ${group.supplier.name} выгружены в CSV файл.`,
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!firestore || !barId) return;

    setIsDeleting(orderId);
    try {
      const orderRef = doc(firestore, 'bars', barId, 'purchaseOrders', orderId);
      const linesRef = collection(orderRef, 'lines');
      
      // Удалить все строки заказа
      const linesSnapshot = await getDocs(linesRef);
      const deletePromises = linesSnapshot.docs.map(lineDoc => deleteDoc(lineDoc.ref));
      await Promise.all(deletePromises);
      
      // Удалить сам заказ
      await deleteDoc(orderRef);

      toast({
        title: 'Заказ удален',
        description: 'Заказ и все его позиции были успешно удалены.',
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось удалить заказ. Попробуйте еще раз.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const isLoading = isLoadingOrders || isLoadingSuppliers || isLoadingProducts || isLoadingLines;

  if (isLoading || !barId) {
    return (
      <div className="w-full space-y-4">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
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
    );
  }

  const suppliersList = Object.values(ordersBySupplier);

  if (suppliersList.length === 0) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Закупки</CardTitle>
            <CardDescription>Позиции с минимальными остатками будут отображаться здесь после добавления в заказ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет позиций для закупки</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Закупки</CardTitle>
          <CardDescription>Позиции с минимальными остатками, сгруппированные по поставщикам</CardDescription>
          <div className="mt-4 flex items-center gap-2">
            <HelpIcon 
              description="В этом разделе отображаются позиции с минимальными остатками, сгруппированные по поставщикам. Вы можете экспортировать заказы в CSV и удалять текущие заказы."
            />
            <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {suppliersList.map((group) => (
              <Card key={group.supplier.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{group.supplier.name}</CardTitle>
                      <CardDescription>
                        {group.lines.length} позиций в {group.orders.length} заказ(ах)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.orders.some(order => order.status === 'draft') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={isDeleting !== null}
                            >
                              {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Удалить заказ
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Заказ и все его позиции будут удалены.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => {
                                  const draftOrder = group.orders.find(order => order.status === 'draft');
                                  if (draftOrder) {
                                    handleDeleteOrder(draftOrder.id);
                                  }
                                }}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button onClick={() => handleExportCSV(group.supplier.id)} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Продукт</TableHead>
                          <TableHead className="text-right">Количество</TableHead>
                          <TableHead className="text-right">Цена за единицу</TableHead>
                          <TableHead className="text-right">Сумма</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Нет позиций для этого поставщика
                            </TableCell>
                          </TableRow>
                        ) : (
                          group.lines.map((line) => {
                            const product = products?.find(p => p.id === line.productId);
                            const productName = product 
                              ? buildProductDisplayName(product.name, product.bottleVolumeMl)
                              : 'Неизвестный продукт';
                            const total = (line.quantity || 0) * (line.costPerItem || 0);

                            return (
                              <TableRow key={line.id}>
                                <TableCell>{productName}</TableCell>
                                <TableCell className="text-right">{line.quantity || 0}</TableCell>
                                <TableCell className="text-right">{line.costPerItem?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="text-right font-semibold">{total.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
