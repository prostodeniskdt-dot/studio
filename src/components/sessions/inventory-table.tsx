'use client';

import * as React from 'react';
import type { InventoryLine, Product, CalculatedInventoryLine } from '@/lib/types';
import { calculateLineFields } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, translateCategory, translateSubCategory } from '@/lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';
import { VarianceAnalysisModal } from './variance-analysis-modal';

type InventoryTableProps = {
  lines: InventoryLine[];
  setLines: React.Dispatch<React.SetStateAction<InventoryLine[] | null>>;
  products: Product[];
  isEditable: boolean;
};

type GroupedLines = Record<string, Record<string, CalculatedInventoryLine[]>>;


export function InventoryTable({ lines, setLines, products, isEditable }: InventoryTableProps) {
  
  const [analyzingLine, setAnalyzingLine] = React.useState<CalculatedInventoryLine | null>(null);

  // This combines the line data with its corresponding product and calculated fields
  const getCalculatedLine = React.useCallback((line: InventoryLine): CalculatedInventoryLine | null => {
    const product = products.find(p => p.id === line.productId);
    if (!product) {
      return null;
    }
    const calculatedFields = calculateLineFields(line, product);
    return { ...line, product, ...calculatedFields };
  }, [products]);

  const groupedAndSortedLines = React.useMemo(() => {
    const calculatedLines = lines.map(getCalculatedLine).filter((l): l is CalculatedInventoryLine => l !== null);
    
    return calculatedLines.reduce<GroupedLines>((acc, line) => {
        const category = line.product?.category || 'Other';
        const subCategory = line.product?.subCategory || 'uncategorized';

        if (!acc[category]) {
            acc[category] = {};
        }
        if (!acc[category][subCategory]) {
            acc[category][subCategory] = [];
        }
        acc[category][subCategory].push(line);
        return acc;
    }, {});
  }, [lines, getCalculatedLine]);

  const handleInputChange = (lineId: string, field: keyof InventoryLine, value: string) => {
    const numericValue = Number(value);
    if (value !== '' && isNaN(numericValue)) return;

    setLines(currentLines => {
        if (!currentLines) return null;
        return currentLines.map(line => {
            if (line.id === lineId) {
                const updatedLine = { ...line, [field]: value === '' ? 0 : numericValue };
                const product = products.find(p => p.id === updatedLine.productId);
                if (product) {
                    const { theoreticalEndStock, differenceVolume, differenceMoney, differencePercent } = calculateLineFields(updatedLine, product);
                    return { ...updatedLine, theoreticalEndStock, differenceVolume, differenceMoney, differencePercent };
                }
                return updatedLine;
            }
            return line;
        });
    });
  };

  const totals = React.useMemo(() => {
    return lines.map(getCalculatedLine).filter((l): l is CalculatedInventoryLine => l !== null).reduce(
      (acc, line) => {
        acc.differenceMoney += line.differenceMoney;
        return acc;
      },
      { differenceMoney: 0 }
    );
  }, [lines, getCalculatedLine]);

  if (!lines || !products) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
      <div className="rounded-md border mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full md:w-[250px]">Продукт</TableHead>
              <TableHead className="text-right hidden md:table-cell">Начало (мл)</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Покупки (мл)</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Продажи (порции)</TableHead>
              <TableHead className="text-right hidden md:table-cell">Теор. (мл)</TableHead>
              <TableHead className="text-right">Факт. (мл)</TableHead>
              <TableHead className="text-right">Разн. (мл)</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Разн. (руб.)</TableHead>
              <TableHead className="w-[100px] text-center">Анализ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedAndSortedLines).map(([category, subCategories]) => (
              <React.Fragment key={category}>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={9} className="font-bold text-base text-primary">
                    {translateCategory(category as any)}
                  </TableCell>
                </TableRow>
                {Object.entries(subCategories).map(([subCategory, subCategoryLines]) => (
                  <React.Fragment key={subCategory}>
                    {subCategory !== 'uncategorized' && (
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={9} className="py-2 pl-8 font-semibold text-sm">
                          {translateSubCategory(subCategory as any)}
                        </TableCell>
                      </TableRow>
                    )}
                    {subCategoryLines.map(line => (
                      <TableRow key={line.id} className={cn(line.differenceVolume !== 0 && isEditable && 'bg-amber-500/10 hover:bg-amber-500/20')}>
                        <TableCell className="font-medium pl-4 md:pl-10">{line.product?.name}</TableCell>
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
                        <TableCell className={cn("text-right font-mono", line.differenceVolume > 0 ? 'text-green-600' : line.differenceVolume < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          {Math.round(line.differenceVolume)}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono hidden sm:table-cell", line.differenceMoney > 0 ? 'text-green-600' : line.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          {formatCurrency(line.differenceMoney)}
                        </TableCell>
                        <TableCell className="text-center">
                          {Math.abs(line.differenceVolume) > (line.product?.portionVolumeMl ?? 40) / 4 && (
                            <Button variant="ghost" size="sm" onClick={() => setAnalyzingLine(line)}>
                              <Sparkles className="h-4 w-4" />
                              <span className="sr-only">Анализ</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-bold text-lg hidden sm:table-cell">Общее отклонение</TableCell>
              <TableCell colSpan={3} className="font-bold text-lg sm:hidden">Общее отклонение</TableCell>

              <TableCell className={cn("text-right font-bold text-lg", totals.differenceMoney > 0 ? 'text-green-600' : totals.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {formatCurrency(totals.differenceMoney)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {analyzingLine && (
        <VarianceAnalysisModal 
          line={analyzingLine}
          open={!!analyzingLine}
          onOpenChange={() => setAnalyzingLine(null)}
        />
      )}
    </>
  );
}
