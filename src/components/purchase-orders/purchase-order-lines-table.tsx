'use client';

import * as React from 'react';
import type { PurchaseOrderLine, Product } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency, translateCategory } from '@/lib/utils';
import { Combobox, GroupedComboboxOption } from '../ui/combobox';
import Image from 'next/image';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch, collection, setDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrderLinesTableProps {
  lines: PurchaseOrderLine[];
  products: Product[];
  barId: string;
  orderId: string;
  isEditable: boolean;
}

export function PurchaseOrderLinesTable({ lines, products, barId, orderId, isEditable }: PurchaseOrderLinesTableProps) {
  const [localLines, setLocalLines] = React.useState(lines);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  React.useEffect(() => {
    setLocalLines(lines);
  }, [lines]);

  const handleLineChange = (lineId: string, field: 'quantity' | 'costPerItem' | 'receivedQuantity', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== '') return;

    setLocalLines(prev =>
      prev.map(line =>
        line.id === lineId ? { ...line, [field]: value === '' ? 0 : numValue } : line
      )
    );
  };
  
  const handleSaveLines = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        localLines.forEach(line => {
            const lineRef = doc(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines', line.id);
            batch.update(lineRef, {
                quantity: line.quantity,
                costPerItem: line.costPerItem,
                receivedQuantity: line.receivedQuantity,
            });
        });
        await batch.commit();
        toast({ title: 'Позиции заказа обновлены' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/purchaseOrders/${orderId}/lines`, operation: 'update' }));
    } finally {
        setIsSaving(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
        const lineRef = doc(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines', lineId);
        await deleteDoc(lineRef);
        toast({ title: 'Позиция удалена' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/purchaseOrders/${orderId}/lines/${lineId}`, operation: 'delete' }));
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleAddProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !firestore) return;
    setIsProcessing(true);
    setIsAdding(false);
    try {
        const lineRef = doc(collection(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines'));
        const newLineData = {
            id: lineRef.id,
            purchaseOrderId: orderId,
            productId: product.id,
            quantity: 1,
            costPerItem: product.costPerBottle,
            receivedQuantity: 0,
        };
        await setDoc(lineRef, newLineData);
        toast({ title: 'Продукт добавлен в заказ' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/purchaseOrders/${orderId}/lines`, operation: 'create' }));
    } finally {
        setIsProcessing(false);
    }
  };

  const linesWithProducts = React.useMemo(() => {
    return localLines.map(line => ({
      ...line,
      product: products.find(p => p.id === line.productId),
    }));
  }, [localLines, products]);

  const totalAmount = React.useMemo(() => {
    return linesWithProducts.reduce((sum, line) => sum + line.quantity * line.costPerItem, 0);
  }, [linesWithProducts]);
  
  const groupedProductOptions = React.useMemo<GroupedComboboxOption[]>(() => {
    const productsInOrder = new Set(localLines.map(line => line.productId));
    const availableProducts = products.filter(p => p.isActive && !productsInOrder.has(p.id));
    const groups: Record<string, { value: string; label: string }[]> = {};
    
    availableProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: p.name });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [products, localLines]);
  
  const hasChanges = JSON.stringify(localLines) !== JSON.stringify(lines);

  return (
    <div className="space-y-4">
        {isProcessing && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )}
        <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[40%]">Продукт</TableHead>
                <TableHead className="text-right">Кол-во (бут.)</TableHead>
                <TableHead className="text-right">Цена за шт.</TableHead>
                <TableHead className="text-right">Получено</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                {isEditable && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
            </TableHeader>
            <TableBody>
            {linesWithProducts.length > 0 ? (
                linesWithProducts.map(line => (
                <TableRow key={line.id}>
                    <TableCell>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-md bg-muted overflow-hidden relative flex-shrink-0">
                                {line.product?.imageUrl && (
                                    <Image src={line.product.imageUrl} alt={line.product.name} fill style={{objectFit: 'contain'}} />
                                )}
                            </div>
                            <div>{line.product?.name || 'Неизвестный продукт'}</div>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        {isEditable ? (
                            <Input
                                type="number"
                                value={line.quantity}
                                onChange={e => handleLineChange(line.id, 'quantity', e.target.value)}
                                className="w-20 ml-auto text-right"
                            />
                        ) : line.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                        {isEditable ? (
                           <Input
                                type="number"
                                step="0.01"
                                value={line.costPerItem}
                                onChange={e => handleLineChange(line.id, 'costPerItem', e.target.value)}
                                className="w-24 ml-auto text-right"
                            />
                        ) : formatCurrency(line.costPerItem)}
                    </TableCell>
                    <TableCell className="text-right">
                         <Input
                            type="number"
                            value={line.receivedQuantity || ''}
                            onChange={e => handleLineChange(line.id, 'receivedQuantity', e.target.value)}
                            className="w-20 ml-auto text-right"
                            placeholder="0"
                        />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        {formatCurrency(line.quantity * line.costPerItem)}
                    </TableCell>
                    {isEditable && (
                        <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    )}
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={isEditable ? 6 : 5} className="h-24 text-center">
                        В этом заказе пока нет позиций.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={4} className="text-right text-lg font-bold">Итого</TableCell>
                    <TableCell className="text-right text-lg font-bold">{formatCurrency(totalAmount)}</TableCell>
                    {isEditable && <TableCell></TableCell>}
                </TableRow>
            </TableFooter>
        </Table>
        </div>
        <div className="flex items-center gap-4">
            {isEditable && (
                <>
                {isAdding ? (
                    <Combobox
                        options={groupedProductOptions}
                        onSelect={(value) => handleAddProduct(value)}
                        placeholder="Выберите продукт для добавления..."
                        searchPlaceholder="Поиск продукта..."
                        notFoundText="Продукт не найден или уже в заказе."
                        triggerClassName="w-full"
                    />
                ) : (
                    <Button variant="outline" onClick={() => setIsAdding(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Добавить продукт
                    </Button>
                )}
                </>
            )}
            <Button onClick={handleSaveLines} disabled={!hasChanges || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
        </div>
    </div>
  );
}
