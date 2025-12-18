'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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
    
    return (
        <>
            <div className="flex w-full items-center justify-between py-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Аналитика</h1>
                    <p className="text-muted-foreground">Анализируйте данные по инвентаризациям для принятия лучших решений.</p>
                </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-6">
                <Card className="w-full">
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
                        <div className="text-center py-10">
                            <p className="text-muted-foreground mb-2">Нет данных для анализа.</p>
                            <p className="text-sm text-muted-foreground">
                                {data.length === 0 
                                    ? "Завершите хотя бы одну инвентаризацию, чтобы увидеть аналитику."
                                    : "Завершенные инвентаризации не содержат данных для анализа. Убедитесь, что в сессиях есть строки с данными."}
                            </p>
                        </div>
                    )}
                </CardContent>
                </Card>
            </div>
        </>
    )
}
