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
import { PlusCircle, Trash2 } from 'lucide-react';
import { formatCurrency, translateCategory } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { Combobox, GroupedComboboxOption } from '../ui/combobox';
import Image from 'next/image';

interface PurchaseOrderLinesTableProps {
  lines: PurchaseOrderLine[];
  products: Product[];
  barId: string;
  orderId: string;
  isEditable: boolean;
}

export function PurchaseOrderLinesTable({ lines, products, barId, orderId, isEditable }: PurchaseOrderLinesTableProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [localLines, setLocalLines] = React.useState(lines);
  const [isAdding, setIsAdding] = React.useState(false);

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
    const batch = writeBatch(firestore);
    localLines.forEach(line => {
      const lineRef = doc(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines', line.id);
      batch.update(lineRef, {
        quantity: line.quantity,
        costPerItem: line.costPerItem,
        receivedQuantity: line.receivedQuantity || 0
      });
    });
    try {
      await batch.commit();
      toast({ title: 'Позиции заказа обновлены' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка при сохранении' });
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines', lineId));
        // Firestore listener will handle the UI update
        toast({ title: 'Позиция удалена' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Ошибка при удалении' });
    }
  };
  
  const handleAddProduct = async (productId: string) => {
    if (!firestore) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Prevent adding duplicates
    if (localLines.some(line => line.productId === productId)) {
        toast({
            variant: "destructive",
            title: "Продукт уже в заказе",
            description: "Этот продукт уже был добавлен в этот заказ."
        });
        return;
    }

    try {
      const linesCollection = collection(firestore, 'bars', barId, 'purchaseOrders', orderId, 'lines');
      const newLineRef = doc(linesCollection);
      const newLineData = {
        id: newLineRef.id,
        purchaseOrderId: orderId,
        productId: productId,
        quantity: 1,
        costPerItem: product.costPerBottle,
        receivedQuantity: 0,
      };
      await addDoc(linesCollection, newLineData);
      // Firestore listener will update the list
      toast({ title: 'Продукт добавлен в заказ' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Ошибка при добавлении продукта' });
    } finally {
        setIsAdding(false);
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

  return (
    <div className="space-y-4">
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
            <Button onClick={handleSaveLines} disabled={JSON.stringify(localLines) === JSON.stringify(lines)}>Сохранить изменения</Button>
        </div>
    </div>
  );
}
