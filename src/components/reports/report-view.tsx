'use client';

import * as React from 'react';
import type { InventorySession, Product, InventoryLine, CalculatedInventoryLine, ProductCategory, ProductSubCategory } from '@/lib/types';
import { calculateLineFields } from '@/lib/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency, translateCategory, translateSubCategory, translateProductName } from '@/lib/utils';
import { Download, FileType, FileJson, Loader2, ShoppingCart, BarChart, PieChart as PieChartIcon, Sparkles, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { useServerAction } from '@/hooks/use-server-action';
import { analyzeInventoryVariance, type VarianceAnalysisInput, type VarianceAnalysisResult } from '@/lib/actions';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart as RechartsPieChart, Cell } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ReportViewProps = {
  session: InventorySession;
  products: Product[];
  onCreatePurchaseOrder: () => void;
  isCreatingOrder: boolean;
};

type GroupedLines = Record<string, Record<string, CalculatedInventoryLine[]>>;


export function ReportView({ session, products, onCreatePurchaseOrder, isCreatingOrder }: ReportViewProps) {
  const { toast } = useToast();
  const [aiAnalysis, setAiAnalysis] = React.useState<VarianceAnalysisResult | null>(null);

  // Create products map for O(1) lookup instead of O(n) find
  const productsMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const groupedAndSortedLines = React.useMemo(() => {
    if (!session.lines) return {};
    const calculatedLines = session.lines.map(line => {
      const product = productsMap.get(line.productId);
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
  }, [session.lines, productsMap]);
  
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
  
  const topLosses = React.useMemo(() => 
    allCalculatedLines.filter(l => l.differenceMoney < 0).sort((a, b) => a.differenceMoney - b.differenceMoney).slice(0, 5),
    [allCalculatedLines]
  );

  const varianceCompositionData = React.useMemo(() => [
      { name: 'Излишки', value: totals.totalSurplus, fill: 'hsl(var(--chart-2))' },
      { name: 'Потери', value: Math.abs(totals.totalLoss), fill: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0), [totals]);

  const needsReorder = React.useMemo(() =>
    allCalculatedLines.some(line => line.product?.reorderPointMl && line.endStock < line.product.reorderPointMl),
    [allCalculatedLines]
  );

  // Prepare data for AI analysis
  const analysisInput = React.useMemo<VarianceAnalysisInput>(() => ({
    session: {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      closedAt: session.closedAt,
    },
    lines: allCalculatedLines.map(line => ({
      productId: line.productId,
      productName: line.product?.name,
      productCategory: line.product?.category,
      startStock: line.startStock,
      purchases: line.purchases,
      sales: line.sales,
      endStock: line.endStock,
      theoreticalEndStock: line.theoreticalEndStock,
      differenceVolume: line.differenceVolume,
      differenceMoney: line.differenceMoney,
      differencePercent: line.differencePercent,
      portionVolumeMl: line.product?.portionVolumeMl,
    })),
    topLosses: topLosses.map(loss => ({
      productName: loss.product?.name || 'Неизвестный продукт',
      differenceMoney: loss.differenceMoney,
      differencePercent: loss.differencePercent,
    })),
    totals: {
      totalLoss: totals.totalLoss,
      totalSurplus: totals.totalSurplus,
      totalVariance: totals.totalVariance,
    },
  }), [session, allCalculatedLines, topLosses, totals]);

  const { execute: runAnalysis, isLoading: isAnalyzing } = useServerAction(analyzeInventoryVariance, {
    onSuccess: (result) => {
      setAiAnalysis(result);
      toast({
        title: 'Анализ завершен',
        description: 'ИИ завершил анализ отклонений инвентаризации.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка анализа',
        description: error || 'Не удалось выполнить анализ. Попробуйте еще раз.',
      });
    },
  });

  const handleAnalyzeVariance = () => {
    runAnalysis(analysisInput);
  };
  
  const handleExportCSV = () => {
    // Helper function to escape CSV values - always wrap in quotes for consistency
    const escapeCSV = (value: string | number): string => {
      const stringValue = String(value);
      // Always wrap in quotes and escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    // Use semicolon as separator for Russian locale Excel compatibility
    const SEPARATOR = ';';
    let csvLines: string[] = [];
    
    // Header row - all values in quotes
    const headerRow = [
      'Продукт',
      'Начало (мл)',
      'Покупки (мл)',
      'Продажи (порции)',
      'Теор. конец (мл)',
      'Факт. конец (мл)',
      'Разница (мл)',
      'Разница (руб.)',
      'Разница (%)'
    ].map(escapeCSV).join(SEPARATOR);
    csvLines.push(headerRow);
    
    // Data rows
    allCalculatedLines.forEach(line => {
      const row = [
        line.product ? translateProductName(line.product.name, line.product.bottleVolumeMl) : '',
        line.startStock,
        line.purchases,
        line.sales,
        Math.round(line.theoreticalEndStock),
        line.endStock,
        Math.round(line.differenceVolume),
        line.differenceMoney.toFixed(2),
        line.differencePercent.toFixed(2)
      ].map(escapeCSV).join(SEPARATOR);
      csvLines.push(row);
    });
    
    // Empty row for spacing
    csvLines.push('');
    
    // Totals row
    const totalsRow = [
      'ИТОГО',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.totalVariance.toFixed(2),
      ''
    ].map(escapeCSV).join(SEPARATOR);
    csvLines.push(totalsRow);
    
    // Additional summary rows
    csvLines.push('');
    csvLines.push(escapeCSV('Сводка') + SEPARATOR);
    csvLines.push([escapeCSV('Общее отклонение'), escapeCSV(totals.totalVariance.toFixed(2))].join(SEPARATOR));
    csvLines.push([escapeCSV('Общая выручка'), escapeCSV(totals.totalRevenue.toFixed(2))].join(SEPARATOR));
    csvLines.push([escapeCSV('Общая себестоимость'), escapeCSV(totals.totalCost.toFixed(2))].join(SEPARATOR));
    csvLines.push([escapeCSV('Pour Cost %'), escapeCSV(totals.totalRevenue > 0 ? ((totals.totalCost / totals.totalRevenue) * 100).toFixed(2) : '0.00')].join(SEPARATOR));
    csvLines.push([escapeCSV('Общие потери'), escapeCSV(totals.totalLoss.toFixed(2))].join(SEPARATOR));
    csvLines.push([escapeCSV('Общие излишки'), escapeCSV(totals.totalSurplus.toFixed(2))].join(SEPARATOR));
    
    // Use \r\n for Windows compatibility
    const csvContent = csvLines.join('\r\n');
    
    // Add UTF-8 BOM at the beginning of the string for Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Use data URI with proper encoding - this works better than Blob for CSV
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", `barboss_report_${session.name.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ 
      title: "Экспортировано в CSV", 
      description: "Отчет был загружен. При открытии в Excel используйте разделитель 'точка с запятой' или используйте экспорт в Excel для лучшей совместимости." 
    });
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(session, allCalculatedLines, totals);
      toast({ title: "Экспортировано в Excel", description: "Отчет был загружен." });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать отчет в Excel.',
      });
    }
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
                <Button 
                  onClick={handleAnalyzeVariance} 
                  disabled={isAnalyzing}
                  variant="outline"
                >
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isAnalyzing ? 'Анализ...' : 'Проанализировать отклонения'}
                </Button>
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
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      <span>Excel (.xlsx)</span>
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
                            <RechartsBarChart data={topLosses.map(l => ({ ...l, loss: -l.differenceMoney, name: l.product ? translateProductName(l.product.name, l.product.bottleVolumeMl) : '' }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" interval={0} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={120} axisLine={false} tickLine={false}/>
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

        {/* AI Analysis Section */}
        {aiAnalysis && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-анализ отклонений
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Резюме</h3>
                <p className="text-muted-foreground">{aiAnalysis.summary}</p>
              </div>

              {aiAnalysis.possibleCauses && aiAnalysis.possibleCauses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Возможные причины</h3>
                  <div className="space-y-4">
                    {aiAnalysis.possibleCauses.map((cause, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{cause.cause}</h4>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            cause.likelihood === 'high' && "bg-destructive/10 text-destructive",
                            cause.likelihood === 'medium' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
                            cause.likelihood === 'low' && "bg-muted text-muted-foreground"
                          )}>
                            {cause.likelihood === 'high' && 'Высокая вероятность'}
                            {cause.likelihood === 'medium' && 'Средняя вероятность'}
                            {cause.likelihood === 'low' && 'Низкая вероятность'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{cause.description}</p>
                        {cause.recommendations && cause.recommendations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Рекомендации:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {cause.recommendations.map((rec, recIdx) => (
                                <li key={recIdx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Инсайты</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {aiAnalysis.insights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Общая оценка</h3>
                <p className="text-muted-foreground">{aiAnalysis.overallAssessment}</p>
              </div>
            </CardContent>
          </Card>
        )}

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
                {Object.entries(groupedAndSortedLines).map(([category, subCategories]) => (
                    <React.Fragment key={category}>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={6} className="font-bold text-base">
                                {translateCategory(category as ProductCategory)}
                            </TableCell>
                        </TableRow>
                        {Object.entries(subCategories).map(([subCategory, lines]) => (
                            <React.Fragment key={subCategory}>
                                {subCategory !== 'uncategorized' && (
                                     <TableRow className="bg-muted/10 hover:bg-muted/10">
                                        <TableCell colSpan={6} className="py-2 pl-8 font-semibold text-sm">
                                            {translateSubCategory(subCategory as ProductSubCategory)}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {lines.sort((a,b) => (a.product ? translateProductName(a.product.name, a.product.bottleVolumeMl) : '').localeCompare(b.product ? translateProductName(b.product.name, b.product.bottleVolumeMl) : '')).map(line => (
                                    <TableRow key={line.id}>
                                        <TableCell className="font-medium pl-12">{line.product ? translateProductName(line.product.name, line.product.bottleVolumeMl) : ''}</TableCell>
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
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                ))}
            </TableBody>
             <TableFooter>
                <TableRow>
                    <TableCell colSpan={5} className="font-bold text-lg">Общее отклонение</TableCell>
                    <TableCell className={cn("text-right font-bold text-lg", totals.totalVariance >= 0 ? 'text-green-600' : 'text-destructive')}>
                        {formatCurrency(totals.totalVariance)}
                    </TableCell>
                </TableRow>
            </TableFooter>
            </Table>
        </div>
    </div>
  );
}
