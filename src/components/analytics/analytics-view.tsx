'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingDown, TrendingUp, BarChart3, LineChart } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';

// Dynamic import for heavy chart component
const VarianceTrendChart = dynamic(
  () => import('@/components/analytics/variance-trend-chart').then(mod => ({ default: mod.VarianceTrendChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function AnalyticsView({ data }: { data: SessionWithLines[] }) {
    // Filter out sessions without lines (they won't have meaningful data)
    const sessionsWithData = data.filter(session => session.lines && session.lines.length > 0);
    
    // Calculate KPI metrics
    const metrics = React.useMemo(() => {
        let totalLoss = 0;
        let totalSurplus = 0;
        let totalSessions = sessionsWithData.length;
        
        sessionsWithData.forEach(session => {
            session.lines.forEach(line => {
                if (line.differenceMoney < 0) {
                    totalLoss += Math.abs(line.differenceMoney);
                } else {
                    totalSurplus += line.differenceMoney;
                }
            });
        });
        
        return {
            totalLoss,
            totalSurplus,
            totalSessions,
            netVariance: totalSurplus - totalLoss
        };
    }, [sessionsWithData]);
    
    return (
        <>
            <SectionHeader
                title="Аналитика"
                description="Анализируйте данные по инвентаризациям для принятия лучших решений."
            />

            {/* KPI Cards */}
            {sessionsWithData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        title="Общие потери"
                        value={formatCurrency(metrics.totalLoss)}
                        icon={TrendingDown}
                        variant="destructive"
                        description="Сумма всех потерь"
                    />
                    <MetricCard
                        title="Общие излишки"
                        value={formatCurrency(metrics.totalSurplus)}
                        icon={TrendingUp}
                        variant="success"
                        description="Сумма всех излишков"
                    />
                    <MetricCard
                        title="Чистое отклонение"
                        value={formatCurrency(metrics.netVariance)}
                        icon={BarChart3}
                        variant={metrics.netVariance >= 0 ? 'success' : 'destructive'}
                        description="Разница между излишками и потерями"
                    />
                    <MetricCard
                        title="Завершенных сессий"
                        value={metrics.totalSessions}
                        icon={LineChart}
                        description="Всего инвентаризаций"
                    />
                </div>
            )}

            <div className="grid w-full grid-cols-1 gap-6">
                <Card className="w-full animate-fade-in">
                <CardHeader>
                    <CardTitle>Динамика отклонений</CardTitle>
                    <CardDescription>
                        Общая сумма потерь и излишков по каждой завершенной инвентаризации.
                        {sessionsWithData.length !== data.length && (
                            <span className="block mt-1 text-xs text-muted-foreground">
                                Показано {sessionsWithData.length} из {data.length} сессий (сессии без данных исключены)
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sessionsWithData.length > 0 ? (
                        <VarianceTrendChart data={sessionsWithData} />
                    ) : (
                        <EmptyState
                            icon={LineChart}
                            title="Нет данных для анализа"
                            description={
                                data.length === 0 
                                    ? "Завершите хотя бы одну инвентаризацию, чтобы увидеть аналитику."
                                    : "Завершенные инвентаризации не содержат данных для анализа. Убедитесь, что в сессиях есть строки с данными."
                            }
                        />
                    )}
                </CardContent>
                </Card>
            </div>
        </>
    )
}
