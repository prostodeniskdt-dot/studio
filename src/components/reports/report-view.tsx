'use client';

import * as React from 'react';
import type { InventorySession, Product, CalculatedInventoryLine } from '@/lib/types';
import { calculateInventoryLine } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LocalizedDate } from "@/components/localized-date";

type ReportViewProps = {
  session: InventorySession;
  products: Product[];
};

export function ReportView({ session, products }: ReportViewProps) {
  const { toast } = useToast();
  const calculatedLines: CalculatedInventoryLine[] = React.useMemo(() =>
    session.lines.map(line => {
      const product = products.find(p => p.id === line.productId);
      return product ? calculateInventoryLine(line, product) : ({} as CalculatedInventoryLine);
    }).filter(l => l.id).sort((a,b) => a.differenceMoney - b.differenceMoney),
    [session.lines, products]
  );

  const totals = React.useMemo(() => {
    return calculatedLines.reduce(
      (acc, line) => {
        acc.totalCost += (line.sales * (line.product?.costPerBottle ?? 0) / (line.product?.bottleVolumeMl ?? 1)) * (line.product?.portionVolumeMl ?? 0);
        acc.totalRevenue += line.sales * (line.product?.sellingPricePerPortion ?? 0);
        acc.totalVariance += line.differenceMoney;
        return acc;
      },
      { totalCost: 0, totalRevenue: 0, totalVariance: 0 }
    );
  }, [calculatedLines]);

  const topLosses = calculatedLines.filter(l => l.differenceMoney < 0).slice(0, 3);
  
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Продукт,Начало (мл),Покупки (мл),Продажи (порции),Теор. конец (мл),Факт. конец (мл),Разница (мл),Разница (руб.)\n";
    calculatedLines.forEach(line => {
      const row = [
        line.product?.name,
        line.startStock,
        line.purchases,
        line.sales,
        Math.round(line.theoreticalEndStock),
        line.endStock,
        Math.round(line.differenceVolume),
        line.differenceMoney.toFixed(2)
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `barboss_report_${session.name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Экспортировано в CSV", description: "Отчет был загружен." });
  };


  return (
    <div>
        <div className="flex items-start justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Отчет по инвентаризации</h1>
                <p className="text-muted-foreground">{session.name} - {session.closedAt && <>Закрыто <LocalizedDate date={session.closedAt} /></>}</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Экспорт CSV
                </Button>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader><CardTitle>Общее отклонение</CardTitle></CardHeader>
                <CardContent>
                    <p className={cn("text-3xl font-bold", totals.totalVariance > 0 ? 'text-green-600' : 'text-destructive')}>
                        {formatCurrency(totals.totalVariance)}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Общая выручка</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatCurrency(totals.totalRevenue)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Общая себестоимость</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatCurrency(totals.totalCost)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Pour Cost %</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">
                        {totals.totalRevenue > 0 ? ((totals.totalCost / totals.totalRevenue) * 100).toFixed(2) : '0.00'}%
                    </p>
                </CardContent>
            </Card>
        </div>

        <Card className="mb-6">
            <CardHeader><CardTitle>Топ 3 потери</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {topLosses.length > 0 ? topLosses.map(line => (
                        <div key={line.id} className="flex justify-between items-center">
                            <span>{line.product?.name}</span>
                            <span className="font-mono font-semibold text-destructive">{formatCurrency(line.differenceMoney)}</span>
                        </div>
                    )) : <p className="text-muted-foreground">Значительных потерь не зафиксировано.</p>}
                </div>
            </CardContent>
        </Card>

        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Продукт</TableHead>
                    <TableHead className="text-right">Теор. (мл)</TableHead>
                    <TableHead className="text-right">Факт. (мл)</TableHead>
                    <TableHead className="text-right">Разн. (мл)</TableHead>
                    <TableHead className="text-right">Разн. (%)</TableHead>
                    <TableHead className="text-right">Разн. (руб.)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {calculatedLines.map(line => (
                <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.product?.name}</TableCell>
                    <TableCell className="text-right font-mono">{Math.round(line.theoreticalEndStock)}</TableCell>
                    <TableCell className="text-right font-mono">{line.endStock}</TableCell>
                    <TableCell className={cn("text-right font-mono", line.differenceVolume > 0 ? 'text-green-600' : line.differenceVolume < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {Math.round(line.differenceVolume)}
                    </TableCell>
                     <TableCell className={cn("text-right font-mono", line.differencePercent > 0 ? 'text-green-600' : line.differencePercent < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {line.differencePercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", line.differenceMoney > 0 ? 'text-green-600' : line.differenceMoney < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {formatCurrency(line.differenceMoney)}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
             <TableFooter>
                <TableRow>
                    <TableCell colSpan={5} className="font-bold text-lg">Общее отклонение</TableCell>
                    <TableCell className={cn("text-right font-bold text-lg", totals.totalVariance > 0 ? 'text-green-600' : totals.totalVariance < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {formatCurrency(totals.totalVariance)}
                    </TableCell>
                </TableRow>
            </TableFooter>
            </Table>
        </div>
    </div>
  );
}
