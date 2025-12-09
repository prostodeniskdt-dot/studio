'use client';

import * as React from 'react';
import type { InventoryLine, Product, CalculatedInventoryLine } from '@/lib/types';
import { calculateInventoryLine } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { VarianceAnalysisModal } from './variance-analysis-modal';

type InventoryTableProps = {
  lines: InventoryLine[];
  setLines: React.Dispatch<React.SetStateAction<InventoryLine[] | null>>;
  products: Product[];
  isEditable: boolean;
};

export function InventoryTable({ lines, setLines, products, isEditable }: InventoryTableProps) {
  
  const [analyzingLine, setAnalyzingLine] = React.useState<CalculatedInventoryLine | null>(null);

  const calculatedLines: CalculatedInventoryLine[] = React.useMemo(() => 
    lines.map(line => {
      const product = products.find(p => p.id === line.productId);
      return product ? calculateInventoryLine(line, product) : ({} as CalculatedInventoryLine);
    }).filter(l => l.id), 
  [lines, products]);


  const handleInputChange = (lineId: string, field: keyof InventoryLine, value: string) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;

    setLines(currentLines => {
        if (!currentLines) return null;
        return currentLines.map(line => 
            line.id === lineId ? { ...line, [field]: numericValue } : line
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


  return (
    <>
      <div className="rounded-md border mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Продукт</TableHead>
              <TableHead className="text-right">Начало (мл)</TableHead>
              <TableHead className="text-right">Покупки (мл)</TableHead>
              <TableHead className="text-right">Продажи (порции)</TableHead>
              <TableHead className="text-right">Теор. (мл)</TableHead>
              <TableHead className="text-right">Факт. (мл)</TableHead>
              <TableHead className="text-right">Разн. (мл)</TableHead>
              <TableHead className="text-right">Разн. (руб.)</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculatedLines.map(line => (
              <TableRow key={line.id} className={cn(line.differenceVolume !== 0 && 'bg-destructive/5 hover:bg-destructive/10')}>
                <TableCell className="font-medium">{line.product?.name}</TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <Input type="number" value={line.startStock} onChange={e => handleInputChange(line.id!, 'startStock', e.target.value)} className="w-24 text-right ml-auto" />
                  ) : line.startStock}
                </TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <Input type="number" value={line.purchases} onChange={e => handleInputChange(line.id!, 'purchases', e.target.value)} className="w-24 text-right ml-auto" />
                  ) : line.purchases}
                </TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <Input type="number" value={line.sales} onChange={e => handleInputChange(line.id!, 'sales', e.target.value)} className="w-24 text-right ml-auto" />
                  ) : line.sales}
                </TableCell>
                <TableCell className="text-right font-mono">{Math.round(line.theoreticalEndStock)}</TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <Input type="number" value={line.endStock} onChange={e => handleInputChange(line.id!, 'endStock', e.target.value)} className="w-24 text-right ml-auto" />
                  ) : line.endStock}
                </TableCell>
                <TableCell className={cn("text-right font-mono", line.differenceVolume > 0 ? 'text-green-600' : line.differenceVolume < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {Math.round(line.differenceVolume)}
                </TableCell>
                <TableCell className={cn("text-right font-mono", line.differenceMoney > 0 ? 'text-green-600' : line.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {formatCurrency(line.differenceMoney)}
                </TableCell>
                <TableCell className="text-center">
                    {Math.abs(line.differenceVolume) > (line.product?.portionVolumeMl ?? 40) / 2 && (
                         <Button variant="ghost" size="sm" onClick={() => setAnalyzingLine(line)}>
                            <Sparkles className="h-4 w-4" />
                            <span className="sr-only">Анализ</span>
                         </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-bold text-lg">Общее отклонение</TableCell>
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
