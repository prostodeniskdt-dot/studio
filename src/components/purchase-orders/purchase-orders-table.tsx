'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { PurchaseOrder, Supplier } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PurchaseOrderForm } from './purchase-order-form';
import { deletePurchaseOrder } from '@/lib/actions';
import { formatCurrency, translateStatus } from '@/lib/utils';
import { Badge } from '../ui/badge';
import Link from 'next/link';

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
  const { toast } = useToast();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<PurchaseOrder | undefined>(undefined);
  const [orderToDelete, setOrderToDelete] = React.useState<PurchaseOrder | null>(null);

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
    if (!orderToDelete) return;
    try {
      const result = await deletePurchaseOrder(barId, orderToDelete.id);
      if (result.success) {
        toast({
          title: 'Заказ удален',
          description: `Заказ №${orderToDelete.id.substring(0, 6)} был удален.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить заказ.',
      });
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
        return date.toLocaleDateString('ru-RU');
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
        header: 'Сумма',
        cell: ({ row }) => {
            const amount = row.original.totalAmount;
            return amount ? formatCurrency(amount) : '-';
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
  });

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <div className="w-full">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Заказы на закупку</h1>
              <p className="text-muted-foreground">Управляйте вашими закупками у поставщиков.</p>
            </div>
            <SheetTrigger asChild>
              <Button onClick={() => handleOpenSheet()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Создать заказ
              </Button>
            </SheetTrigger>
          </div>
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
        </div>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingOrder ? 'Редактировать заказ' : 'Создать новый заказ'}</SheetTitle>
          </SheetHeader>
          <PurchaseOrderForm barId={barId} suppliers={suppliers} order={editingOrder} onFormSubmit={handleCloseSheet} />
        </SheetContent>
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
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
    </Sheet>
  );
}
