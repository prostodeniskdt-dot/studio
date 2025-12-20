'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ChevronDown, PlusCircle, Loader2, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { formatCurrency, translateCategory, dedupeProductsByName, buildProductDisplayName } from '@/lib/utils';
import { PremixForm } from './premix-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function PremixesTable({ premixes }: { premixes: Product[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    costPerBottle: false,
    id: false, 
    subCategory: false,
    bottleVolumeMl: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingPremix, setEditingPremix] = React.useState<Product | undefined>(undefined);
  const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [premixToDelete, setPremixToDelete] = React.useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  const handleOpenSheet = (premix?: Product) => {
    setEditingPremix(premix);
    setIsSheetOpen(true);
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingPremix(undefined);
  }

  const handleArchiveAction = (premix: Product) => {
    if (!firestore) return;
    setIsArchiving(premix.id);
    
    // Используем глобальную коллекцию products для примиксов
    const collectionPath = collection(firestore, 'products');
    const premixRef = doc(collectionPath, premix.id);
    const updateData = { isActive: !premix.isActive };
    const pathPrefix = 'products';
    
    updateDoc(premixRef, updateData)
      .then(() => {
        toast({ title: "Статус премикса изменен." });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${pathPrefix}/${premix.id}`, operation: 'update', requestResourceData: updateData }));
      })
      .finally(() => {
        setIsArchiving(null);
      });
  }

  const handleDeletePremix = (premix: Product) => {
    setPremixToDelete(premix);
  }

  const confirmDelete = async () => {
    if (!premixToDelete || !firestore) return;

    setIsDeleting(true);
    
    // Используем глобальную коллекцию products для примиксов
    const collectionPath = collection(firestore, 'products');
    const premixRef = doc(collectionPath, premixToDelete.id);
    const pathPrefix = 'products';

    try {
        await deleteDoc(premixRef);
        toast({ title: "Премикс удален", description: `Премикс "${buildProductDisplayName(premixToDelete.name, premixToDelete.bottleVolumeMl)}" был безвозвратно удален.` });
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

  const uniquePremixes = React.useMemo(() => {
    return dedupeProductsByName(premixes);
  }, [premixes]);

  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Выбрать все"
          className="hidden sm:flex"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Выбрать строку"
          className="hidden sm:flex"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
       accessorKey: 'id',
       header: 'ID',
       enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Название',
      cell: ({ row }) => {
        const premix = row.original;
        return (
          <div className="flex items-center gap-2">
            <span>{buildProductDisplayName(premix.name, premix.bottleVolumeMl)}</span>
            <Badge variant="secondary" className="text-xs">Премикс</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => {
          const category = row.getValue('category') as Product['category'];
          return <div>{translateCategory(category)}</div>;
      },
    },
    {
      accessorKey: 'subCategory',
      header: 'Подкатегория',
      cell: ({ row }) => {
          const subCategory = row.original.subCategory;
          return subCategory ? <div>{subCategory}</div> : null
      },
    },
    {
      accessorKey: 'costPerBottle',
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-auto p-0 font-medium"
            >
              Стоимость
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('costPerBottle') as number ?? 0)}</div>,
    },
    {
      accessorKey: 'bottleVolumeMl',
      header: () => <div className="text-right">Объем</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue('bottleVolumeMl')} мл</div>,
    },
    {
      accessorKey: 'isActive',
      header: 'Статус',
      cell: ({ row }) => (
        <Badge variant={row.getValue('isActive') ? 'default' : 'outline'}>
          {row.getValue('isActive') ? 'Активен' : 'Архивирован'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const premix = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isArchiving === premix.id}>
                {isArchiving === premix.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                <span className="sr-only">Открыть меню</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenSheet(premix)}>Редактировать премикс</DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleArchiveAction(premix)}
                className={cn(premix.isActive && "focus:bg-destructive/10")}
               >
                {premix.isActive ? 'Архивировать' : 'Восстановить'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => handleDeletePremix(premix)}
               >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: uniquePremixes,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <>
              <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
                  <div>
                      <h1 className="text-3xl font-bold tracking-tight">Премиксы</h1>
                      <p className="text-muted-foreground">Управляйте премиксами и заготовками для калькулятора.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              type="text"
                              value={globalFilter ?? ''}
                              onChange={(e) => setGlobalFilter(e.target.value)}
                              placeholder="Поиск по названию..."
                              className="pl-9"
                          />
                      </div>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9">
                              Колонки <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          {table
                              .getAllColumns()
                              .filter((column) => column.getCanHide())
                              .map((column) => {
                              return (
                                  <DropdownMenuCheckboxItem
                                  key={column.id}
                                  className="capitalize"
                                  checked={column.getIsVisible()}
                                  onCheckedChange={(value) =>
                                      column.toggleVisibility(!!value)
                                  }
                                  >
                                  {{
                                      name: 'Название',
                                      category: 'Категория',
                                      subCategory: 'Подкатегория',
                                      costPerBottle: 'Стоимость',
                                      bottleVolumeMl: 'Объем',
                                      isActive: 'Статус',
                                      id: 'ID'
                                  }[column.id] || column.id}
                                  </DropdownMenuCheckboxItem>
                              );
                              })}
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <SheetTrigger asChild>
                          <Button onClick={() => handleOpenSheet()} className="h-9">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Добавить премикс
                          </Button>
                      </SheetTrigger>
                  </div>
              </div>
              {table.getFilteredRowModel().rows.length !== table.getRowModel().rows.length && (
                  <div className="text-sm text-muted-foreground mb-4">
                      Найдено премиксов: {table.getFilteredRowModel().rows.length}
                  </div>
              )}
            
          <div className="rounded-md border">
              <Table>
              <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                      return (
                          <TableHead key={header.id} 
                          className={cn({
                              'hidden sm:table-cell': ['costPerBottle', 'bottleVolumeMl'].includes(header.column.id),
                              'hidden lg:table-cell': ['category', 'subCategory'].includes(header.column.id)
                          })}
                          >
                          {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                              )}
                          </TableHead>
                      );
                      })}
                  </TableRow>
                  ))}
              </TableHeader>
              <TableBody>
                  {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                      <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      >
                      {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}
                          className={cn({
                              'hidden sm:table-cell': ['costPerBottle', 'bottleVolumeMl'].includes(cell.column.id),
                              'hidden lg:table-cell': ['category', 'subCategory'].includes(cell.column.id)
                          })}
                          >
                          {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                          )}
                          </TableCell>
                      ))}
                      </TableRow>
                  ))
                  ) : (
                  <TableRow>
                      <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                      >
                      Премиксы не найдены.
                      </TableCell>
                  </TableRow>
                  )}
              </TableBody>
              </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
              {table.getFilteredSelectedRowModel().rows.length} из{' '}
              {table.getFilteredRowModel().rows.length} строк выбрано.
              </div>
              <div className="space-x-2">
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
          </>
          <SheetContent className="w-full sm:w-[480px] sm:max-w-none overflow-y-auto">
              <SheetHeader>
                  <SheetTitle>{editingPremix ? `Редактировать: ${buildProductDisplayName(editingPremix.name, editingPremix.bottleVolumeMl)}` : 'Добавить новый премикс'}</SheetTitle>
              </SheetHeader>
              <PremixForm premix={editingPremix} onFormSubmit={handleCloseSheet} />
          </SheetContent>
      </Sheet>
      <AlertDialog open={!!premixToDelete} onOpenChange={(open) => !open && setPremixToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                Вы собираетесь безвозвратно удалить премикс <span className="font-semibold">"{premixToDelete ? buildProductDisplayName(premixToDelete.name, premixToDelete.bottleVolumeMl) : ''}"</span>. Это действие нельзя отменить.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {isDeleting ? "Удаление..." : "Удалить"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

