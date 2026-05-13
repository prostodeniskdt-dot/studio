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
import { MoreHorizontal, ArrowUpDown, ChevronDown, PlusCircle, Loader2, Trash2, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Product, ProductCategory } from '@/lib/types';
import { formatCurrency, translateCategory, translateSubCategory, productCategories, productSubCategories, dedupeProductsByName, buildProductDisplayName } from '@/lib/utils';
import { ProductForm } from './product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { useToast } from '@/hooks/use-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useIsMobile } from '@/hooks/use-mobile';

export function ProductsTable({ products }: { products: Product[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    id: false, 
    subCategory: false,
    bottleVolumeMl: false,
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
  const [isArchiving, setIsArchiving] = React.useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const isMobile = useIsMobile();

  const { user } = useAuthSession();
  const barId = getWorkingBarId(user);
  const { toast } = useToast();
  const { refresh: refreshProducts, upsertProduct, removeProductById } = useProducts();

  const handleOpenSheet = (product?: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingProduct(undefined);
  };

  const handleArchiveAction = (product: Product) => {
    if (!user || !barId) return;
    setIsArchiving(product.id);
    
    const currentIsActive = product.isActive ?? true;
    const updateData = { isActive: !currentIsActive };

    (async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ product: updateData }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');

        if (typeof window !== 'undefined' && barId) {
          try {
            localStorage.removeItem(`barboss_products_cache_${barId}`);
          } catch {}
        }
        toast({ title: "Статус продукта изменен." });
        if (json?.product) upsertProduct(json.product as Product);
        refreshProducts();
      } catch {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось изменить статус.' });
      } finally {
        setIsArchiving(null);
      }
    })();
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  }

  const confirmDelete = async () => {
    if (!productToDelete || !user || !barId) return;

    setIsDeleting(true);

    try {
        const res = await fetch(`/api/products/${productToDelete.id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
        
        // Очистить кэш localStorage
        if (typeof window !== 'undefined' && barId) {
          try {
            localStorage.removeItem(`barboss_products_cache_${barId}`);
          } catch (e) {
            // Игнорировать ошибки очистки кэша
          }
        }
        
        removeProductById(productToDelete.id);
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


  const uniqueProducts = React.useMemo(() => {
    return dedupeProductsByName(products);
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    if (!uniqueProducts) return [];
    if (showArchived) return uniqueProducts;
    return uniqueProducts.filter(p => p.isActive !== false);
  }, [uniqueProducts, showArchived]);


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
          <div className="flex items-center gap-2">
            <span>{buildProductDisplayName(product.name, product.bottleVolumeMl)}</span>
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
      accessorKey: 'bottleVolumeMl',
      header: () => <div className="text-right">Объем</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue('bottleVolumeMl')} мл</div>,
    },
    {
      accessorKey: 'isActive',
      header: 'Статус',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') ?? true;
        return (
          <Badge variant={isActive ? 'default' : 'outline'}>
            {isActive ? 'Активен' : 'Архивирован'}
          </Badge>
        );
      },
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
              <DropdownMenuItem 
                onClick={() => handleArchiveAction(product)}
                className={cn(product.isActive && "focus:bg-destructive/10")}
               >
                {product.isActive ? 'Архивировать' : 'Восстановить'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => handleDeleteProduct(product)}
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
    data: filteredProducts,
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

  // Virtualization for large tables (>100 rows)
  const { rows } = table.getRowModel();
  const shouldVirtualize = rows.length > 100;
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 10,
  });
  
  const selectedCategory = table.getColumn('category')?.getFilterValue() as ProductCategory | undefined;
  const selectedSubCategory = table.getColumn('subCategory')?.getFilterValue() as string | undefined;
  const subCategoryOptions = selectedCategory ? productSubCategories[selectedCategory] : [];

  const handleCategoryChange = (category: ProductCategory | undefined) => {
    table.getColumn('category')?.setFilterValue(category);
    if (!category) {
      table.getColumn('subCategory')?.setFilterValue(undefined);
    }
  };

  const handleSubCategoryChange = (subCategory: string | undefined) => {
    table.getColumn('subCategory')?.setFilterValue(subCategory);
  };

  React.useEffect(() => {
      const currentSubCategory = table.getColumn('subCategory')?.getFilterValue();
      if (selectedCategory && currentSubCategory && !productSubCategories[selectedCategory]?.includes(currentSubCategory as string)) {
          table.getColumn('subCategory')?.setFilterValue(undefined);
      }
  }, [selectedCategory, table]);

  const MobileFiltersContent = (
    <div className="space-y-4 py-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Поиск по названию..."
          className="pl-9"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="showArchivedMobile"
          checked={showArchived}
          onCheckedChange={(checked) => setShowArchived(checked === true)}
        />
        <label
          htmlFor="showArchivedMobile"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Показать архивированные
        </label>
      </div>

      <Select
        value={selectedCategory ? selectedCategory : '__all__'}
        onValueChange={(value) =>
          handleCategoryChange(
            value === '__all__' ? undefined : (value as ProductCategory)
          )
        }
      >
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Все категории" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Все категории</SelectItem>
          {productCategories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {translateCategory(cat)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCategory && subCategoryOptions.length > 0 && (
        <Select
          value={selectedSubCategory ? selectedSubCategory : '__all__'}
          onValueChange={(value) =>
            handleSubCategoryChange(value === '__all__' ? undefined : value)
          }
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Все подкатегории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все подкатегории</SelectItem>
            {subCategoryOptions.map((subCat) => (
              <SelectItem key={subCat} value={subCat}>
                {translateSubCategory(subCat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium">Колонки (для таблицы)</div>
        <div className="grid grid-cols-2 gap-2">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <Checkbox
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                />
                <span className="truncate">
                  {
                    {
                      name: 'Название',
                      category: 'Категория',
                      subCategory: 'Подкатегория',
                      bottleVolumeMl: 'Объем',
                      isActive: 'Статус',
                      id: 'ID',
                    }[column.id] || column.id
                  }
                </span>
              </label>
            ))}
        </div>
      </div>
    </div>
  );


  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <>
              {isMobile ? (
                <div className="flex w-full min-w-0 flex-col gap-3 py-4">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Продукты</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      Управляйте каталогом товаров и их профилями для калькулятора.
                    </p>
                  </div>
                  <div className="flex w-full min-w-0 gap-2">
                    <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                      <SheetTrigger asChild>
                        <Button type="button" variant="outline" className="h-11 min-w-0 flex-1">
                          <Search className="mr-2 h-4 w-4 shrink-0" />
                          Фильтры
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden">
                        <SheetHeader className="text-left">
                          <SheetTitle>Фильтры и поиск</SheetTitle>
                        </SheetHeader>
                        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-safe">{MobileFiltersContent}</div>
                      </SheetContent>
                    </Sheet>
                    <SheetTrigger asChild>
                      <Button type="button" className="h-11 min-w-0 flex-1" onClick={() => handleOpenSheet()}>
                        <PlusCircle className="mr-2 h-4 w-4 shrink-0" />
                        Добавить
                      </Button>
                    </SheetTrigger>
                  </div>
                </div>
              ) : (
              <div className="flex min-w-0 flex-col justify-between gap-4 py-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="min-w-0 shrink-0">
                      <h1 className="text-3xl font-bold tracking-tight">Продукты</h1>
                      <p className="text-muted-foreground">Управляйте каталогом товаров и их профилями для калькулятора.</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
                      <div className="relative min-w-0 flex-1 basis-full sm:basis-48 md:min-w-[12rem]">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              type="text"
                              value={globalFilter ?? ''}
                              onChange={(e) => setGlobalFilter(e.target.value)}
                              placeholder="Поиск по названию..."
                              className="pl-9"
                          />
                      </div>
                      <div className="flex items-center space-x-2">
                          <Checkbox
                              id="showArchived"
                              checked={showArchived}
                              onCheckedChange={(checked) => setShowArchived(checked === true)}
                          />
                          <label
                              htmlFor="showArchived"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                              Показать архивированные
                          </label>
                      </div>
                      <Select
                          value={selectedCategory ? selectedCategory : '__all__'}
                          onValueChange={(value) => handleCategoryChange(value === '__all__' ? undefined : value as ProductCategory)}
                      >
                          <SelectTrigger className="h-9 w-full min-w-0 max-w-full sm:w-[180px]">
                              <SelectValue placeholder="Все категории" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="__all__">Все категории</SelectItem>
                              {productCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{translateCategory(cat)}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      {selectedCategory && subCategoryOptions.length > 0 && (
                          <Select
                              value={selectedSubCategory ? selectedSubCategory : '__all__'}
                              onValueChange={(value) => handleSubCategoryChange(value === '__all__' ? undefined : value)}
                          >
                              <SelectTrigger className="h-9 w-full min-w-0 max-w-full sm:w-[180px]">
                                  <SelectValue placeholder="Все подкатегории" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="__all__">Все подкатегории</SelectItem>
                                  {subCategoryOptions.map(subCat => (
                                      <SelectItem key={subCat} value={subCat}>{translateSubCategory(subCat)}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      )}
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
                                  {
                                      {
                                          name: 'Название',
                                          category: 'Категория',
                                          subCategory: 'Подкатегория',
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
                          <Button onClick={() => handleOpenSheet()} className="h-9">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Добавить
                          </Button>
                      </SheetTrigger>
                  </div>
              </div>
              )}
              {table.getFilteredRowModel().rows.length !== table.getRowModel().rows.length && (
                  <div className="text-sm text-muted-foreground mb-4">
                      Найдено продуктов: {table.getFilteredRowModel().rows.length}
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
                              'hidden sm:table-cell': ['bottleVolumeMl'].includes(header.column.id),
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
                  {rows?.length ? (
                  shouldVirtualize ? (
                    <div
                      ref={parentRef}
                      className="h-[600px] overflow-auto"
                      style={{ contain: 'strict' }}
                    >
                      <div
                        style={{
                          height: `${virtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                          const row = rows[virtualRow.index];
                          return (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && 'selected'}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell
                                  key={cell.id}
                                  className={cn({
                                    'hidden sm:table-cell': ['bottleVolumeMl'].includes(cell.column.id),
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
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
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
                  )
                  ) : (
                  <TableRow>
                      <TableCell
                      colSpan={columns.length}
                      className="h-24 p-0"
                      >
                      <EmptyState
                        icon={Package}
                        title="Продукты не найдены"
                        description={table.getFilteredRowModel().rows.length === 0 && table.getRowModel().rows.length === 0 
                          ? "Начните добавлять продукты в ваш каталог"
                          : "Попробуйте изменить фильтры поиска"}
                      />
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
                  <SheetTitle>{editingProduct ? `Редактировать: ${buildProductDisplayName(editingProduct.name, editingProduct.bottleVolumeMl)}` : 'Добавить новый продукт'}</SheetTitle>
              </SheetHeader>
              <ProductForm product={editingProduct} onFormSubmit={handleCloseSheet} />
          </SheetContent>
      </Sheet>
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                Вы собираетесь безвозвратно удалить продукт <span className="font-semibold">"{productToDelete ? buildProductDisplayName(productToDelete.name, productToDelete.bottleVolumeMl) : ''}"</span>. Это действие нельзя отменить.
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
