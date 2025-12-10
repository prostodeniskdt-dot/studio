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
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
            />
            <YAxis
                tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="totalSurplus" fill="var(--color-totalSurplus)" radius={4} />
            <Bar dataKey="totalLoss" fill="var(--color-totalLoss)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
