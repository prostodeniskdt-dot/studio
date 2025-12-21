'use client';

import * as React from 'react';
import type { InventoryLine, Product, CalculatedInventoryLine } from '@/lib/types';
import { calculateLineFields } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { translateCategory, translateSubCategory, buildProductDisplayName } from '@/lib/utils';
import { Loader2, Package, ShoppingCart } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type LocalCalculatedLine = CalculatedInventoryLine & { product: Product };

type InventoryTableProps = {
  lines: InventoryLine[];
  setLines: React.Dispatch<React.SetStateAction<InventoryLine[] | null>>;
  products: Product[];
  isEditable: boolean;
  onAddToOrder?: (line: LocalCalculatedLine) => void;
};

type GroupedLines = Record<string, Record<string, LocalCalculatedLine[]>>;


const InventoryTableInner: React.FC<InventoryTableProps> = ({ lines, setLines, products, isEditable, onAddToOrder }) => {
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

  // Убрали totals, так как больше не показываем отклонения

  // Calculate completion percentage for progress indicator
  const completionPercentage = React.useMemo(() => {
    if (!lines || lines.length === 0) return 0;
    const filledLines = lines.filter(line => line.endStock > 0).length;
    return Math.round((filledLines / lines.length) * 100);
  }, [lines]);

  // Handle edge cases: missing or empty data
  if (!lines || lines.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Нет данных для отображения"
        description="Добавьте продукты в инвентаризацию, чтобы увидеть таблицу."
      />
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-48 text-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-2">Продукты не загружены</p>
        <p className="text-sm text-muted-foreground">
          Загрузка списка продуктов...
        </p>
      </div>
    );
  }


  return (
    <>
      {/* Progress indicator */}
      {isEditable && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Заполнение инвентаризации</span>
            <span className="font-semibold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      )}

      <div className="rounded-md border mt-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Продукт</TableHead>
              <TableHead className="text-right">Факт. (мл)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedAndSortedLines).sort((a,b) => a[0].localeCompare(b[0])).map(([category, subCategories]) => (
              <React.Fragment key={category}>
                <TableRow className="bg-primary/10 hover:bg-primary/15 border-b-2 border-primary/20">
                  <TableCell colSpan={2} className="font-bold text-base py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      {translateCategory(category as any)}
                    </div>
                  </TableCell>
                </TableRow>
                {Object.entries(subCategories).sort((a,b) => a[0].localeCompare(b[0])).map(([subCategory, subCategoryLines]) => (
                  <React.Fragment key={subCategory}>
                    {subCategory !== 'uncategorized' && (
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableCell colSpan={2} className="py-2 pl-8 font-semibold text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-0.5 w-4 bg-muted-foreground/30" />
                            {translateSubCategory(subCategory as any)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {subCategoryLines.sort((a,b) => buildProductDisplayName(a.product.name, a.product.bottleVolumeMl).localeCompare(buildProductDisplayName(b.product.name, b.product.bottleVolumeMl))).map(line => {
                      return (
                        <TableRow 
                          key={line.id} 
                          className="transition-colors"
                        >
                          <TableCell className="font-medium pl-4 md:pl-10">
                            <div className="flex items-center gap-2">
                              {buildProductDisplayName(line.product.name, line.product.bottleVolumeMl)}
                              {line.product.reorderPointMl && line.endStock < line.product.reorderPointMl && (
                                <Badge variant="destructive" className="text-xs">
                                  Минимальный остаток
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isEditable ? (
                                <Input 
                                  type="number" 
                                  value={line.endStock} 
                                  onChange={e => handleInputChange(line.id!, 'endStock', e.target.value)} 
                                  className="w-24 text-right ml-auto bg-primary/10 border-primary/30 transition-all duration-200 focus:ring-2 focus:ring-primary/40 focus:bg-primary/15" 
                                />
                              ) : (
                                <span>{line.endStock}</span>
                              )}
                              {line.product.reorderPointMl && 
                               line.endStock < line.product.reorderPointMl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-8 ${!line.product.defaultSupplierId ? 'opacity-50' : ''}`}
                                  onClick={() => onAddToOrder?.(line)}
                                  disabled={!line.product.defaultSupplierId}
                                  title={!line.product.defaultSupplierId ? 'У продукта не указан поставщик по умолчанию. Укажите поставщика в настройках продукта.' : 'Добавить продукт в заказ'}
                                >
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  Добавить в заказ
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export const InventoryTable = React.memo(InventoryTableInner);
