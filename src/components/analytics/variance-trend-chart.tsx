'use client';

import * as React from 'react';
import type { SessionWithLines } from '@/app/dashboard/analytics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

type ChartDataPoint = {
  name: string;
  totalLoss: number;
  totalSurplus: number;
};

const chartConfig = {
  totalLoss: {
    label: 'Потери',
    color: 'hsl(var(--destructive))',
  },
  totalSurplus: {
    label: 'Излишки',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function VarianceTrendChart({ data }: { data: SessionWithLines[] }) {
  const chartData = React.useMemo<ChartDataPoint[]>(() => {
    return data.map(session => {
      const totals = session.lines.reduce(
        (acc, line) => {
          if (line.differenceMoney < 0) {
            acc.loss += line.differenceMoney;
          } else {
            acc.surplus += line.differenceMoney;
          }
          return acc;
        },
        { loss: 0, surplus: 0 }
      );

      const sessionDate = session.closedAt instanceof Timestamp 
        ? session.closedAt.toDate() 
        : new Date();
      
      return {
        name: sessionDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        totalLoss: Math.abs(totals.loss), // Use absolute value for bar chart height
        totalSurplus: totals.surplus,
      };
    });
  }, [data]);

  return (
    <div className="h-[300px] w-full min-w-0 animate-fade-in">
       <ChartContainer config={chartConfig}>
        <BarChart data={chartData}>
            <defs>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="surplusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
                className="text-xs"
            />
            <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                className="text-xs"
            />
            <ChartTooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  return (
                    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                      <div className="grid gap-2">
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium">{entry.name}:</span>
                            <span className="text-sm font-semibold">{formatCurrency(entry.value as number)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar 
              dataKey="totalSurplus" 
              fill="url(#surplusGradient)" 
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
              animationBegin={0}
            />
            <Bar 
              dataKey="totalLoss" 
              fill="url(#lossGradient)" 
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
              animationBegin={200}
            />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
