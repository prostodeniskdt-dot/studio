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
import { ProductSearch } from './product-search';
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Product, ProductCategory } from '@/lib/types';
import { formatCurrency, translateCategory, translateSubCategory, productCategories, productSubCategories, dedupeProductsByName, buildProductDisplayName } from '@/lib/utils';
import { ProductForm } from './product-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
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
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;
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
    if (!firestore || !barId) return;
    setIsArchiving(product.id);
    
    // Определить правильную коллекцию: примиксы в bars/{barId}/premixes, остальные в products
    const isPremix = product.isPremix === true || product.category === 'Premix';
    const collectionPath = isPremix
      ? collection(firestore, 'bars', barId, 'premixes')
      : collection(firestore, 'products');
    const productRef = doc(collectionPath, product.id);
    const updateData = { isActive: !product.isActive };
    const pathPrefix = isPremix ? `bars/${barId}/premixes` : 'products';
    
    updateDoc(productRef, updateData)
      .then(() => {
        toast({ title: "Статус продукта изменен." });
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `${pathPrefix}/${product.id}`, operation: 'update', requestResourceData: updateData }));
      })
      .finally(() => {
        setIsArchiving(null);
      });
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  }

  const confirmDelete = async () => {
    if (!productToDelete || !firestore || !barId) return;

    setIsDeleting(true);
    
    // Определить правильную коллекцию: примиксы в bars/{barId}/premixes, остальные в products
    const isPremix = productToDelete.isPremix === true || productToDelete.category === 'Premix';
    const collectionPath = isPremix
      ? collection(firestore, 'bars', barId, 'premixes')
      : collection(firestore, 'products');
    const productRef = doc(collectionPath, productToDelete.id);
    const pathPrefix = isPremix ? `bars/${barId}/premixes` : 'products';

    try {
        await deleteDoc(productRef);
        toast({ title: "Продукт удален", description: `Продукт "${buildProductDisplayName(productToDelete.name, productToDelete.bottleVolumeMl)}" был безвозвратно удален.` });
        setProductToDelete(null);
    } catch (serverError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `${pathPrefix}/${productToDelete.id}`,
            operation: 'delete',
        }));
    } finally {
        setIsDeleting(false);
    }
};


  const uniqueProducts = React.useMemo(() => {
    return dedupeProductsByName(products);
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
        const isPremix = product.isPremix === true || product.category === 'Premix';
        return (
          <div className="flex items-center gap-2">
            <span>{buildProductDisplayName(product.name, product.bottleVolumeMl)}</span>
            {isPremix && (
              <Badge variant="secondary" className="text-xs">Примикс</Badge>
            )}
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
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('costPerBottle'))}</div>,
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


  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <>
              <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
                  <div>
                      <h1 className="text-3xl font-bold tracking-tight">Продукты</h1>
                      <p className="text-muted-foreground">Управляйте каталогом товаров и их профилями для калькулятора.</p>
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
                      <Select
                          value={selectedCategory ? selectedCategory : '__all__'}
                          onValueChange={(value) => handleCategoryChange(value === '__all__' ? undefined : value as ProductCategory)}
                      >
                          <SelectTrigger className="w-[180px] h-9">
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
                              <SelectTrigger className="w-[180px] h-9">
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
                          <Button onClick={() => handleOpenSheet()} className="h-9">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Добавить
                          </Button>
                      </SheetTrigger>
                  </div>
              </div>
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
