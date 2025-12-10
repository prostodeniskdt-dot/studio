'use client';

import * as React from 'react';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VarianceTrendChart } from '@/components/analytics/variance-trend-chart';

export function AnalyticsView({ data }: { data: SessionWithLines[] }) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between py-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Аналитика</h1>
                    <p className="text-muted-foreground">Анализируйте данные по инвентаризациям для принятия лучших решений.</p>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                <CardHeader>
                    <CardTitle>Динамика отклонений</CardTitle>
                    <CardDescription>Общая сумма потерь и излишков по каждой завершенной инвентаризации.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.length > 0 ? <VarianceTrendChart data={data} /> : <p className="text-muted-foreground text-center py-10">Нет данных для анализа. Завершите хотя бы одну инвентаризацию.</p>}
                </CardContent>
                </Card>
            </div>
        </div>
    )
}
