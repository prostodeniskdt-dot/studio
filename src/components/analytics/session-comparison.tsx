'use client';

import * as React from 'react';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { buildProductDisplayName, translateCategory } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useProducts } from '@/contexts/products-context';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type ComparisonRow = {
  productId: string;
  productName: string;
  category: string;
  sessions: Record<string, number>; // sessionId -> endStock
  difference?: number; // Разница между сессиями
  [key: `session_${string}`]: number; // Динамические ключи для сессий
};

export function SessionComparison({ sessions }: { sessions: SessionWithLines[] }) {
  const { products } = useProducts();
  const [selectedSessionIds, setSelectedSessionIds] = React.useState<Set<string>>(new Set());

  const productsMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  // Инициализация: выбираем первые 2 сессии по умолчанию
  React.useEffect(() => {
    if (sessions.length > 0 && selectedSessionIds.size === 0) {
      const firstTwo = new Set(sessions.slice(0, 2).map(s => s.id));
      setSelectedSessionIds(firstTwo);
    }
  }, [sessions, selectedSessionIds.size]);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Создать данные для сравнения
  const comparisonData = React.useMemo(() => {
    if (selectedSessionIds.size === 0) return [];

    const selectedSessions = sessions.filter(s => selectedSessionIds.has(s.id));
    if (selectedSessions.length === 0) return [];

    // Собрать все уникальные продукты из выбранных сессий
    const allProductIds = new Set<string>();
    selectedSessions.forEach(session => {
      session.lines?.forEach(line => {
        allProductIds.add(line.productId);
      });
    });

    // Создать строки сравнения
    const rows: ComparisonRow[] = Array.from(allProductIds).map(productId => {
      const product = productsMap.get(productId);
      const sessionsData: Record<string, number> = {};

      selectedSessions.forEach(session => {
        const line = session.lines?.find(l => l.productId === productId);
        sessionsData[session.id] = line?.endStock ?? 0;
      });

      return {
        productId,
        productName: product ? buildProductDisplayName(product.name, product.bottleVolumeMl) : 'Неизвестный продукт',
        category: product?.category || 'Other',
        sessions: sessionsData,
      };
    });

    // Группировать по категориям
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = [];
      }
      acc[row.category].push(row);
      return acc;
    }, {} as Record<string, ComparisonRow[]>);

    // Сортировать внутри категорий по названию
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.productName.localeCompare(b.productName));
    });

    return grouped;
  }, [selectedSessionIds, sessions, productsMap]);

  const selectedSessions = sessions.filter(s => selectedSessionIds.has(s.id));

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Нет завершенных инвентаризаций"
        description="Завершите хотя бы одну инвентаризацию для сравнения."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Выбор инвентаризаций */}
      <Card>
        <CardHeader>
          <CardTitle>Выберите инвентаризации для сравнения</CardTitle>
          <CardDescription>
            Выберите две или более завершенных инвентаризаций для анализа динамики остатков
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => {
              const isSelected = selectedSessionIds.has(session.id);
              let sessionDate = '';
              if (session.closedAt) {
                if (session.closedAt instanceof Timestamp) {
                  sessionDate = session.closedAt.toDate().toLocaleDateString('ru-RU');
                } else {
                  const date = session.closedAt as any;
                  if (date instanceof Date) {
                    sessionDate = date.toLocaleDateString('ru-RU');
                  } else if (date?.toDate) {
                    sessionDate = date.toDate().toLocaleDateString('ru-RU');
                  }
                }
              }
              
              return (
                <div key={session.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={session.id}
                    checked={isSelected}
                    onCheckedChange={() => handleSessionToggle(session.id)}
                  />
                  <Label
                    htmlFor={session.id}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {session.name} ({sessionDate})
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Таблица сравнения */}
      {selectedSessions.length > 0 && Object.keys(comparisonData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Сравнение инвентаризаций</CardTitle>
            <CardDescription>
              Динамика остатков продуктов по выбранным инвентаризациям
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden w-full">
              <div className="overflow-x-auto max-w-full">
                <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Продукт</TableHead>
                    {selectedSessions.map(session => {
                      let sessionDate = '';
                      if (session.closedAt) {
                        if (session.closedAt instanceof Timestamp) {
                          sessionDate = session.closedAt.toDate().toLocaleDateString('ru-RU');
                        } else {
                          const date = session.closedAt as any;
                          if (date instanceof Date) {
                            sessionDate = date.toLocaleDateString('ru-RU');
                          } else if (date?.toDate) {
                            sessionDate = date.toDate().toLocaleDateString('ru-RU');
                          }
                        }
                      }
                      return (
                        <TableHead key={session.id} className="text-right min-w-[120px]">
                          {session.name}
                          {sessionDate && (
                            <>
                              <br />
                              <span className="text-xs text-muted-foreground">({sessionDate})</span>
                            </>
                          )}
                        </TableHead>
                      );
                    })}
                    {selectedSessions.length >= 2 && (
                      <>
                        <TableHead className="text-right min-w-[120px]">Разница (мл)</TableHead>
                        <TableHead className="text-right min-w-[120px]">Динамика (%)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(comparisonData)
                    .sort(([catA], [catB]) => translateCategory(catA as any).localeCompare(translateCategory(catB as any)))
                    .map(([category, rows]) => (
                      <React.Fragment key={category}>
                        <TableRow className="bg-primary/10 hover:bg-primary/15 border-b-2 border-primary/20">
                          <TableCell colSpan={selectedSessions.length + (selectedSessions.length >= 2 ? 3 : 1)} className="font-bold text-base py-3 sticky left-0 bg-primary/10 z-10">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-primary" />
                              {translateCategory(category as any)}
                            </div>
                          </TableCell>
                        </TableRow>
                        {rows.map(row => {
                          const session1Stock = selectedSessions[0] ? row.sessions[selectedSessions[0].id] ?? 0 : 0;
                          const session2Stock = selectedSessions[1] ? row.sessions[selectedSessions[1].id] ?? 0 : 0;
                          const difference = selectedSessions.length >= 2 ? session2Stock - session1Stock : 0;
                          const percentage = selectedSessions.length >= 2 && session1Stock > 0 
                            ? ((difference / session1Stock) * 100).toFixed(1) 
                            : null;

                          return (
                            <TableRow key={row.productId}>
                              <TableCell className="font-medium min-w-[200px] sticky left-0 bg-background z-10">{row.productName}</TableCell>
                              {selectedSessions.map(session => (
                                <TableCell key={session.id} className="text-right font-mono min-w-[120px]">
                                  {row.sessions[session.id] ?? 0}
                                </TableCell>
                              ))}
                              {selectedSessions.length >= 2 && (
                                <>
                                  <TableCell className={`${difference > 0 ? 'text-success' : difference < 0 ? 'text-destructive' : ''} text-right font-mono font-semibold min-w-[120px]`}>
                                    {difference > 0 ? '+' : ''}{difference}
                                  </TableCell>
                                  <TableCell className={`${percentage && parseFloat(percentage) > 0 ? 'text-success' : percentage && parseFloat(percentage) < 0 ? 'text-destructive' : ''} text-right font-mono font-semibold min-w-[120px]`}>
                                    {percentage ? (parseFloat(percentage) > 0 ? '+' : '') + percentage + '%' : '-'}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSessions.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Выберите инвентаризации"
          description="Выберите одну или несколько инвентаризаций для сравнения."
        />
      )}
    </div>
  );
}

