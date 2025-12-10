'use client';

import * as React from 'react';
import Image from 'next/image';
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
import { MoreHorizontal, ArrowUpDown, ChevronDown, PlusCircle } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { formatCurrency, translateCategory, translateSubCategory } from '@/lib/utils';
import { ProductForm } from './product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Combobox, type GroupedComboboxOption } from '../ui/combobox';


export function ProductsTable({ products }: { products: Product[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    costPerBottle: false,
    id: false, 
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleOpenSheet = (product?: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingProduct(undefined);
  }

  const handleArchiveAction = async (product: Product, archive: boolean) => {
    if (!firestore) return;
    const productRef = doc(firestore, 'products', product.id!);
    const batch = writeBatch(firestore);
    batch.update(productRef, { isActive: !archive });
    await batch.commit();
    toast({
      title: `Продукт ${archive ? 'архивирован' : 'восстановлен'}`,
      description: `"${product.name}" был ${archive ? 'архивирован' : 'восстановлен'}.`,
    });
  }

  const groupedProductOptions = React.useMemo<GroupedComboboxOption[]>(() => {
    if (!products) return [];

    const groups: Record<string, { value: string; label: string }[]> = {};
    
    products.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: p.name });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [products]);


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
        const product = row.original;
        return (
            <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-md bg-muted overflow-hidden relative flex-shrink-0">
                    {product.imageUrl && (
                        <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'contain'}} />
                    )}
                </div>
                <div>{product.name}</div>
            </div>
        )
      },
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => {
          const category = row.getValue('category') as Product['category'];
          const subCategory = row.original.subCategory;
          return (
              <div>
                  <div>{translateCategory(category)}</div>
                  {subCategory && <div className="text-xs text-muted-foreground">{translateSubCategory(subCategory)}</div>}
              </div>
          )
      }
    },
    {
      accessorKey: 'costPerBottle',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Стоимость
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div className="lowercase text-left pl-4">{formatCurrency(row.getValue('costPerBottle'))}</div>,
    },
    {
      accessorKey: 'bottleVolumeMl',
      header: 'Объем',
      cell: ({ row }) => <div>{row.getValue('bottleVolumeMl')} мл</div>,
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
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Открыть меню</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenSheet(product)}>Редактировать продукт</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleArchiveAction(product, product.isActive)}
                className={cn(product.isActive && "text-destructive focus:text-destructive")}
               >
                {product.isActive ? 'Архивировать' : 'Восстановить'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
    },
  });

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <div className="w-full">
            <div className="flex items-center justify-between py-4 gap-2 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Продукты</h1>
                    <p className="text-muted-foreground">Управляйте каталогом товаров и их профилями для калькулятора.</p>
                </div>
                <div className="flex items-center gap-2">
                <Combobox 
                  options={groupedProductOptions}
                  onSelect={(value) => {
                    table.getColumn('id')?.setFilterValue(value || undefined);
                  }}
                  value={table.getColumn('id')?.getFilterValue() as string}
                  placeholder="Поиск по названию..."
                  searchPlaceholder="Введите название продукта..."
                  notFoundText="Продукт не найден."
                  triggerClassName='w-[200px] sm:w-[250px]'
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
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
                            {
                                {
                                    name: 'Название',
                                    category: 'Категория',
                                    costPerBottle: 'Стоимость',
                                    bottleVolumeMl: 'Объем',
                                    isActive: 'Статус',
                                    id: 'ID'
                                }[column.id] || column.id
                            }
                            </DropdownMenuCheckboxItem>
                        );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
                <SheetTrigger asChild>
                    <Button onClick={() => handleOpenSheet()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Добавить
                    </Button>
                </SheetTrigger>
                </div>
            </div>
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
                            'hidden lg:table-cell': ['category'].includes(header.column.id)
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
                            'hidden lg:table-cell': ['category'].includes(cell.column.id)
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
                    Продукты не найдены.
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
        </div>
         <SheetContent className="w-full sm:w-[480px] sm:max-w-none overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{editingProduct ? 'Редактировать продукт' : 'Добавить новый продукт'}</SheetTitle>
            </SheetHeader>
            <ProductForm product={editingProduct} onFormSubmit={handleCloseSheet} />
        </SheetContent>
    </Sheet>
  );
}
