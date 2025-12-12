'use client';

import * as React from 'react';
import type { InventorySession, Product, InventoryLine, CalculatedInventoryLine } from '@/lib/types';
import { calculateLineFields } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency, translateCategory, translateSubCategory } from '@/lib/utils';
import { Download, FileType, FileJson, Loader2, ShoppingCart, BarChart, PieChart as PieChartIcon, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart as RechartsPieChart, Cell } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VarianceAnalysisModal } from '../sessions/variance-analysis-modal';


type ReportViewProps = {
  session: InventorySession;
  products: Product[];
  onCreatePurchaseOrder: () => void;
  isCreatingOrder: boolean;
};

type GroupedLines = Record<string, Record<string, CalculatedInventoryLine[]>>;


export function ReportView({ session, products, onCreatePurchaseOrder, isCreatingOrder }: ReportViewProps) {
  const { toast } = useToast();
  const [analyzingLine, setAnalyzingLine] = React.useState<CalculatedInventoryLine | null>(null);

  const groupedAndSortedLines = React.useMemo(() => {
    if (!session.lines) return {};
    const calculatedLines = session.lines.map(line => {
      const product = products.find(p => p.id === line.productId);
      if (!product) return null;
      const calculatedFields = calculateLineFields(line, product);
      return { ...line, product, ...calculatedFields };
    }).filter((l): l is NonNullable<typeof l> => l !== null);
    
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
  }, [session.lines, products]);
  
  const allCalculatedLines = React.useMemo(() => 
    Object.values(groupedAndSortedLines).flatMap(sub => Object.values(sub).flat()),
  [groupedAndSortedLines]);


  const totals = React.useMemo(() => {
    return allCalculatedLines.reduce(
      (acc, line) => {
        const costPerPortion = ((line.product?.costPerBottle ?? 0) / (line.product?.bottleVolumeMl ?? 1)) * (line.product?.portionVolumeMl ?? 0);
        acc.totalCost += line.sales * costPerPortion;
        acc.totalRevenue += line.sales * (line.product?.sellingPricePerPortion ?? 0);
        acc.totalVariance += line.differenceMoney;
        if (line.differenceMoney < 0) acc.totalLoss += line.differenceMoney;
        if (line.differenceMoney > 0) acc.totalSurplus += line.differenceMoney;
        return acc;
      },
      { totalCost: 0, totalRevenue: 0, totalVariance: 0, totalLoss: 0, totalSurplus: 0 }
    );
  }, [allCalculatedLines]);
  
  const topLosses = allCalculatedLines.filter(l => l.differenceMoney < 0).sort((a, b) => a.differenceMoney - b.differenceMoney).slice(0, 5);

  const varianceCompositionData = [
      { name: 'Излишки', value: totals.totalSurplus, fill: 'hsl(var(--chart-2))' },
      { name: 'Потери', value: Math.abs(totals.totalLoss), fill: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  const needsReorder = React.useMemo(() =>
    allCalculatedLines.some(line => line.product?.reorderPointMl && line.endStock < line.product.reorderPointMl),
    [allCalculatedLines]
  );
  
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Продукт,Начало (мл),Покупки (мл),Продажи (порции),Теор. конец (мл),Факт. конец (мл),Разница (мл),Разница (руб.)\n";
    allCalculatedLines.forEach(line => {
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
  
  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return '';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ru-RU');
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('ru-RU');
    }
    return 'Неверная дата';
  }

  if (!session || !products || !session.lines) {
      return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }


  return (
    <div>
        <div className="flex items-start justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Отчет по инвентаризации</h1>
                <p className="text-muted-foreground">{session.name} - {session.closedAt && <>Закрыто {formatDate(session.closedAt)}</>}</p>
            </div>
            <div className="flex gap-2">
                <Button onClick={onCreatePurchaseOrder} disabled={isCreatingOrder || !needsReorder}>
                  {isCreatingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  {isCreatingOrder ? 'Создание...' : 'Создать заказ на закупку'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Экспорт
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Формат экспорта</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileType className="mr-2 h-4 w-4" />
                      <span>CSV (для Excel)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                       <FileJson className="mr-2 h-4 w-4" />
                      <span>PDF (скоро)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader><CardTitle>Общее отклонение</CardTitle></CardHeader>
                <CardContent>
                    <p className={cn("text-3xl font-bold", totals.totalVariance >= 0 ? 'text-green-600' : 'text-destructive')}>
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

        <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader className='flex-row items-center justify-between'>
                    <CardTitle>Топ 5 потерь</CardTitle>
                    <BarChart className='h-5 w-5 text-muted-foreground'/>
                </CardHeader>
                <CardContent>
                    {topLosses.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <RechartsBarChart data={topLosses.map(l => ({ ...l, loss: -l.differenceMoney }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="product.name" type="category" interval={0} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={120} axisLine={false} tickLine={false}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => [formatCurrency(value), 'Потеря']} />
                                <Bar dataKey="loss" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-center py-10">Значительных потерь не зафиксировано.</p>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader  className='flex-row items-center justify-between'>
                    <CardTitle>Состав отклонений</CardTitle>
                    <PieChartIcon className='h-5 w-5 text-muted-foreground'/>
                </CardHeader>
                <CardContent>
                    {varianceCompositionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                             <RechartsPieChart>
                                <Pie data={varianceCompositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return (
                                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                            {`${varianceCompositionData[index].name}: ${formatCurrency(Number(value))}`}
                                        </text>
                                    );
                                }}>
                                    {varianceCompositionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-center py-10">Отклонений нет.</p>}
                </CardContent>
            </Card>
        </div>

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
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(groupedAndSortedLines).map(([category, subCategories]) => (
                    <React.Fragment key={category}>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={7} className="font-bold text-base">
                                {translateCategory(category as any)}
                            </TableCell>
                        </TableRow>
                        {Object.entries(subCategories).map(([subCategory, lines]) => (
                            <React.Fragment key={subCategory}>
                                {subCategory !== 'uncategorized' && (
                                     <TableRow className="bg-muted/10 hover:bg-muted/10">
                                        <TableCell colSpan={7} className="py-2 pl-8 font-semibold text-sm">
                                            {translateSubCategory(subCategory as any)}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {lines.sort((a,b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '')).map(line => (
                                    <TableRow key={line.id}>
                                        <TableCell className="font-medium pl-12">{line.product?.name}</TableCell>
                                        <TableCell className="text-right font-mono">{Math.round(line.theoreticalEndStock)}</TableCell>
                                        <TableCell className="text-right font-mono">{line.endStock}</TableCell>
                                        <TableCell className={cn("text-right font-mono", line.differenceVolume >= 0 ? 'text-green-600' : 'text-destructive')}>
                                            {Math.round(line.differenceVolume)}
                                        </TableCell>
                                        <TableCell className={cn("text-right font-mono", line.differencePercent >= 0 ? 'text-green-600' : 'text-destructive')}>
                                            {line.differencePercent.toFixed(2)}%
                                        </TableCell>
                                        <TableCell className={cn("text-right font-mono", line.differenceMoney >= 0 ? 'text-green-600' : 'text-destructive')}>
                                            {formatCurrency(line.differenceMoney)}
                                        </TableCell>
                                        <TableCell>
                                            {line.differenceVolume !== 0 && (
                                                <Button variant="ghost" size="icon" onClick={() => setAnalyzingLine(line)}>
                                                    <Lightbulb className="h-4 w-4" />
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
                    <TableCell colSpan={6} className="font-bold text-lg">Общее отклонение</TableCell>
                    <TableCell className={cn("text-right font-bold text-lg", totals.totalVariance >= 0 ? 'text-green-600' : 'text-destructive')}>
                        {formatCurrency(totals.totalVariance)}
                    </TableCell>
                </TableRow>
            </TableFooter>
            </Table>
        </div>
        {analyzingLine && (
            <VarianceAnalysisModal 
                line={analyzingLine}
                open={!!analyzingLine}
                onOpenChange={(open) => !open && setAnalyzingLine(null)}
            />
        )}
    </div>
  );
}
