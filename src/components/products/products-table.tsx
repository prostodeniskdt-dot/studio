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
import { MoreHorizontal, ArrowUpDown, ChevronDown, PlusCircle, Loader2, Search } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Product, ProductCategory } from '@/lib/types';
import { formatCurrency, translateCategory, translateSubCategory, productCategories, productSubCategories } from '@/lib/utils';
import { ProductForm } from './product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function ProductsTable({ products }: { products: Product[] }) {
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
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
  const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = React.useState('');
  
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

  const handleArchiveAction = (product: Product) => {
    if (!firestore) return;
    setIsArchiving(product.id);
    const productRef = doc(firestore, 'products', product.id);
    const updateData = { isActive: !product.isActive };
    
    updateDoc(productRef, updateData)
      .then(() => {
        toast({ title: "Статус продукта изменен." });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `products/${product.id}`, operation: 'update', requestResourceData: updateData }));
      })
      .finally(() => {
        setIsArchiving(null);
      });
  }

  const uniqueProducts = React.useMemo(() => {
    // Ensure products are unique by their canonical `id` field, not the document id
    const productMap = new Map<string, Product>();
    products.forEach(p => {
        if (!productMap.has(p.id)) {
            productMap.set(p.id, p);
        }
    });
    return Array.from(productMap.values());
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
        return <div>{product.name}</div>;
      },
    },
    {
      accessorKey: 'category',
      header: 'Категория',
      cell: ({ row }) => {
          const category = row.getValue('category') as Product['category'];
          return <div>{translateCategory(category)}</div>;
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'subCategory',
      header: 'Подкатегория',
      cell: ({ row }) => {
          const subCategory = row.original.subCategory;
          return subCategory ? <div>{translateSubCategory(subCategory)}</div> : null
      },
       filterFn: 'equals',
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
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isArchiving === product.id}>
                {isArchiving === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                <span className="sr-only">Открыть меню</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenSheet(product)}>Редактировать продукт</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleArchiveAction(product)}
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
    data: uniqueProducts,
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
  
  const selectedCategory = table.getColumn('category')?.getFilterValue() as ProductCategory | undefined;
  const subCategoryOptions = selectedCategory ? productSubCategories[selectedCategory] : [];

  React.useEffect(() => {
      const currentSubCategory = table.getColumn('subCategory')?.getFilterValue();
      if (selectedCategory && currentSubCategory && !productSubCategories[selectedCategory]?.includes(currentSubCategory as string)) {
          table.getColumn('subCategory')?.setFilterValue(undefined);
      }
  }, [selectedCategory, table]);


  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <>
            <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Продукты</h1>
                    <p className="text-muted-foreground">Управляйте каталогом товаров и их профилями для калькулятора.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по названию..."
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="pl-10 w-full sm:w-[250px]"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline">
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
                                        subCategory: 'Подкатегория',
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
            <div className="flex items-center gap-2 mb-4">
                <Select
                    value={(table.getColumn('category')?.getFilterValue() as string) ?? '_all_'}
                    onValueChange={(value) => table.getColumn('category')?.setFilterValue(value === '_all_' ? undefined : value)}
                >
                    <SelectTrigger className="w-auto sm:w-[180px]">
                    <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="_all_">Все категории</SelectItem>
                    {productCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{translateCategory(cat)}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Select
                    value={(table.getColumn('subCategory')?.getFilterValue() as string) ?? '_all_'}
                    onValueChange={(value) => table.getColumn('subCategory')?.setFilterValue(value === '_all_' ? undefined : value)}
                    disabled={!subCategoryOptions || subCategoryOptions.length === 0}
                >
                    <SelectTrigger className="w-auto sm:w-[180px]">
                    <SelectValue placeholder="Все подкатегории" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="_all_">Все подкатегории</SelectItem>
                    {subCategoryOptions?.map(subCat => (
                            <SelectItem key={subCat} value={subCat}>{translateSubCategory(subCat)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
        </>
         <SheetContent className="w-full sm:w-[480px] sm:max-w-none overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{editingProduct ? 'Редактировать продукт' : 'Добавить новый продукт'}</SheetTitle>
            </SheetHeader>
            <ProductForm product={editingProduct} onFormSubmit={handleCloseSheet} />
        </SheetContent>
    </Sheet>
  );
}
