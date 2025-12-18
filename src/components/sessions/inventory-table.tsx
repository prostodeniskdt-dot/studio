'use client';

import * as React from 'react';
import type { InventoryLine, Product, CalculatedInventoryLine } from '@/lib/types';
import { calculateLineFields } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency, translateCategory, translateSubCategory, buildProductDisplayName } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type LocalCalculatedLine = CalculatedInventoryLine & { product: Product };

type InventoryTableProps = {
  lines: InventoryLine[];
  setLines: React.Dispatch<React.SetStateAction<InventoryLine[] | null>>;
  products: Product[];
  isEditable: boolean;
};

type GroupedLines = Record<string, Record<string, LocalCalculatedLine[]>>;


const InventoryTableInner: React.FC<InventoryTableProps> = ({ lines, setLines, products, isEditable }) => {
  const productsById = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  const calculatedLines = React.useMemo(() => {
    return lines
      .map(line => {
        const product = productsById.get(line.productId);
        if (!product) return null;
        const calculatedFields = calculateLineFields(line, product);
        return { ...line, product, ...calculatedFields };
      })
      .filter((l): l is LocalCalculatedLine => l !== null);
  }, [lines, productsById]);


  const groupedAndSortedLines = React.useMemo(() => {
    return calculatedLines.reduce<GroupedLines>((acc, line) => {
        const category = line.product?.category || 'Other';
        const subCategory = line.product?.subCategory || 'uncategorized';

        if (!acc[category]) acc[category] = {};
        if (!acc[category][subCategory]) acc[category][subCategory] = [];
        
        acc[category][subCategory].push(line);
        return acc;
    }, {});
  }, [calculatedLines]);


  const handleInputChange = (lineId: string, field: keyof InventoryLine, value: string) => {
    const numericValue = Number(value);
    if (value !== '' && isNaN(numericValue)) return;
    const finalValue = value === '' ? 0 : numericValue;

    setLines(currentLines => {
        if (!currentLines) return null;
        return currentLines.map(line => 
            line.id === lineId ? { ...line, [field]: finalValue } : line
        );
    });
  };

  const totals = React.useMemo(() => {
    return calculatedLines.reduce(
      (acc, line) => {
        acc.differenceMoney += line.differenceMoney;
        return acc;
      },
      { differenceMoney: 0 }
    );
  }, [calculatedLines]);

  // Handle edge cases: missing or empty data
  if (!lines || lines.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-48 text-center p-4">
        <p className="text-muted-foreground mb-2">Нет данных для отображения</p>
        <p className="text-sm text-muted-foreground">
          Добавьте продукты в инвентаризацию, чтобы увидеть таблицу.
        </p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-48 text-center p-4">
        <p className="text-muted-foreground mb-2">Продукты не загружены</p>
        <p className="text-sm text-muted-foreground">
          Загрузка списка продуктов...
        </p>
        <Loader2 className="h-6 w-6 animate-spin mt-4" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full md:w-auto">Продукт</TableHead>
              <TableHead className="text-right hidden md:table-cell">Начало (мл)</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Покупки (мл)</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Продажи (порции)</TableHead>
              <TableHead className="text-right hidden md:table-cell">Теор. (мл)</TableHead>
              <TableHead className="text-right">Факт. (мл)</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Разн. (мл)</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Разн. (руб.)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedAndSortedLines).sort((a,b) => a[0].localeCompare(b[0])).map(([category, subCategories]) => (
              <React.Fragment key={category}>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={8} className="font-bold text-base text-primary">
                    {translateCategory(category as any)}
                  </TableCell>
                </TableRow>
                {Object.entries(subCategories).sort((a,b) => a[0].localeCompare(b[0])).map(([subCategory, subCategoryLines]) => (
                  <React.Fragment key={subCategory}>
                    {subCategory !== 'uncategorized' && (
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={8} className="py-2 pl-8 font-semibold text-sm">
                          {translateSubCategory(subCategory as any)}
                        </TableCell>
                      </TableRow>
                    )}
                    {subCategoryLines.sort((a,b) => buildProductDisplayName(a.product.name, a.product.bottleVolumeMl).localeCompare(buildProductDisplayName(b.product.name, b.product.bottleVolumeMl))).map(line => {
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium pl-4 md:pl-10">{buildProductDisplayName(line.product.name, line.product.bottleVolumeMl)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {isEditable ? (
                              <Input type="number" value={line.startStock} onChange={e => handleInputChange(line.id!, 'startStock', e.target.value)} className="w-24 text-right ml-auto" />
                            ) : line.startStock}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                            {isEditable ? (
                              <Input type="number" value={line.purchases} onChange={e => handleInputChange(line.id!, 'purchases', e.target.value)} className="w-24 text-right ml-auto" />
                            ) : line.purchases}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                            {isEditable ? (
                              <Input type="number" value={line.sales} onChange={e => handleInputChange(line.id!, 'sales', e.target.value)} className="w-24 text-right ml-auto" />
                            ) : line.sales}
                          </TableCell>
                          <TableCell className="text-right font-mono hidden md:table-cell">{Math.round(line.theoreticalEndStock)}</TableCell>
                          <TableCell className="text-right">
                            {isEditable ? (
                              <Input type="number" value={line.endStock} onChange={e => handleInputChange(line.id!, 'endStock', e.target.value)} className="w-24 text-right ml-auto bg-primary/10" />
                            ) : line.endStock}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono hidden sm:table-cell", line.differenceVolume > 0 ? 'text-green-600' : line.differenceVolume < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            {Math.round(line.differenceVolume)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono hidden sm:table-cell", line.differenceMoney > 0 ? 'text-green-600' : line.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                            {formatCurrency(line.differenceMoney)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-bold text-lg hidden sm:table-cell">Общее отклонение</TableCell>
              <TableCell colSpan={1} className="font-bold text-lg sm:hidden">Итого</TableCell>

              <TableCell className={cn("text-right font-bold text-lg", totals.differenceMoney > 0 ? 'text-green-600' : totals.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {formatCurrency(totals.differenceMoney)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}

export const InventoryTable = React.memo(InventoryTableInner);
