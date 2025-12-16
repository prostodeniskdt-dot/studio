'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, PlusCircle, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { PurchaseOrder, Supplier } from '@/lib/types';
import { PurchaseOrderForm } from './purchase-order-form';
import { formatCurrency, translateStatus } from '@/lib/utils';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface OrderWithSupplier extends PurchaseOrder {
  supplier?: Supplier;
  totalAmount: number;
}

interface PurchaseOrdersTableProps {
  orders: OrderWithSupplier[];
  barId: string;
  suppliers: Supplier[];
}

export function PurchaseOrdersTable({ orders, barId, suppliers }: PurchaseOrdersTableProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<PurchaseOrder | undefined>(undefined);
  const [orderToDelete, setOrderToDelete] = React.useState<PurchaseOrder | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const handleOpenSheet = (order?: PurchaseOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingOrder(undefined);
  };
  
  const handleDeleteClick = (order: PurchaseOrder) => {
    setOrderToDelete(order);
  };

  const confirmDelete = async () => {
    if (!orderToDelete || !firestore) return;
    const orderRef = doc(firestore, 'bars', barId, 'purchaseOrders', orderToDelete.id);
    
    try {
        const linesRef = collection(orderRef, 'lines');
        const linesSnapshot = await getDocs(linesRef);
        const batch = writeBatch(firestore);
        linesSnapshot.forEach((lineDoc) => batch.delete(lineDoc.ref));
        batch.delete(orderRef);
        
        await batch.commit();
        toast({ title: "Заказ удален." });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'delete' }));
    } finally {
        setOrderToDelete(null);
    }
  };

  const columns: ColumnDef<OrderWithSupplier>[] = [
    {
      accessorKey: 'id',
      header: 'Номер',
      cell: ({ row }) => <div className="font-medium">#{(row.getValue('id') as string).substring(0, 6)}</div>,
    },
    {
      accessorKey: 'supplier',
      header: 'Поставщик',
      cell: ({ row }) => {
        const supplier = row.getValue('supplier') as Supplier | undefined;
        return supplier?.name || 'Неизвестный поставщик';
      }
    },
    {
      accessorKey: 'orderDate',
      header: 'Дата заказа',
      cell: ({ row }) => {
        const date = (row.getValue('orderDate') as any).toDate();
        return <div className="text-left">{date.toLocaleDateString('ru-RU')}</div>;
      }
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => {
        const status = row.getValue('status') as PurchaseOrder['status'];
        return <Badge variant="outline">{translateStatus(status)}</Badge>;
      }
    },
    {
        accessorKey: 'totalAmount',
        header: () => <div className="text-right">Сумма</div>,
        cell: ({ row }) => {
            const amount = row.original.totalAmount;
            return <div className="text-right">{amount ? formatCurrency(amount) : '-'}</div>;
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="text-right">
             <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/purchase-orders/${order.id}`}>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Открыть меню</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/purchase-orders/${order.id}`)}>
                  Просмотреть / Изменить
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenSheet(order)}>
                  Редактировать детали
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteClick(order)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardTitle>Заказы на закупку</CardTitle>
                        <CardDescription>Управляйте вашими закупками у поставщиков.</CardDescription>
                    </div>
                    <SheetTrigger asChild>
                        <Button onClick={() => handleOpenSheet()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Создать заказ
                        </Button>
                    </SheetTrigger>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                <Table>
                    <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                            {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                        ))}
                        </TableRow>
                    ))}
                    </TableHeader>
                    <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                            ))}
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                            Заказов пока нет.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Показано {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, orders.length)} из {orders.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
            </CardContent>
        </Card>
        
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingOrder ? 'Редактировать заказ' : 'Создать новый заказ'}</SheetTitle>
          </SheetHeader>
          <PurchaseOrderForm barId={barId} suppliers={suppliers} order={editingOrder} onFormSubmit={handleCloseSheet} />
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!orderToDelete} onOpenChange={(open: boolean) => !open && setOrderToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Вы собираетесь удалить заказ <span className="font-semibold">№{orderToDelete?.id.substring(0, 6)}</span>. Это действие нельзя отменить.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
