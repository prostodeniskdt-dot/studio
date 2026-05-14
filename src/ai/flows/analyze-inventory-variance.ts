'use server';

import type { InventoryLine, Product, InventorySession } from '@/lib/types';
import { z } from 'zod';

// Input schema for the variance analysis flow
const VarianceAnalysisInputSchema = z.object({
  session: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.any().optional(),
    closedAt: z.any().optional(),
  }),
  lines: z.array(z.object({
    productId: z.string(),
    productName: z.string().optional(),
    productCategory: z.string().optional(),
    startStock: z.number(),
    purchases: z.number(),
    sales: z.number(),
    endStock: z.number(),
    theoreticalEndStock: z.number(),
    differenceVolume: z.number(),
    differenceMoney: z.number(),
    differencePercent: z.number(),
    portionVolumeMl: z.number().optional(),
  })),
  topLosses: z.array(z.object({
    productName: z.string(),
    differenceMoney: z.number(),
    differencePercent: z.number(),
  })),
  totals: z.object({
    totalLoss: z.number(),
    totalSurplus: z.number(),
    totalVariance: z.number(),
  }),
  historicalContext: z.object({
    previousSessionsCount: z.number().optional(),
    averageVariance: z.number().optional(),
  }).optional(),
});

export type VarianceAnalysisInput = z.infer<typeof VarianceAnalysisInputSchema>;

export type VarianceAnalysisResult = {
  summary: string;
  possibleCauses: Array<{
    cause: string;
    likelihood: 'high' | 'medium' | 'low';
    description: string;
    recommendations: string[];
  }>;
  insights: string[];
  overallAssessment: string;
};

/**
 * Fallback analysis if AI fails
 */
function getFallbackAnalysis(input: VarianceAnalysisInput): VarianceAnalysisResult {
  const hasSignificantLosses = input.totals.totalLoss < -1000;
  const lossPercentage = input.totals.totalVariance !== 0
    ? Math.abs((input.totals.totalLoss / Math.abs(input.totals.totalVariance)) * 100)
    : 0;

  return {
    summary: `Обнаружено отклонение на сумму ${Math.abs(input.totals.totalVariance).toFixed(2)} руб. ${input.totals.totalLoss < 0 ? 'Основная часть - потери' : 'Наблюдаются излишки'}.`,
    possibleCauses: [
      {
        cause: hasSignificantLosses ? 'Значительные потери товара' : 'Небольшие отклонения',
        likelihood: hasSignificantLosses ? 'high' : 'medium',
        description: hasSignificantLosses
          ? `Зафиксированы потери на сумму ${Math.abs(input.totals.totalLoss).toFixed(2)} руб. Необходимо выявить причины.`
          : 'Отклонения находятся в допустимых пределах.',
        recommendations: [
          'Проверьте точность подсчета остатков',
          'Сверьте данные о покупках и продажах',
          'Убедитесь в правильности настройки объемов порций',
        ],
      },
    ],
    insights: [
      `Топ потери: ${input.topLosses[0]?.productName || 'не указано'} (${input.topLosses[0]?.differenceMoney.toFixed(2) || 0} руб.)`,
      `Всего позиций с отклонениями: ${input.lines.filter(l => Math.abs(l.differenceMoney) > 0.01).length}`,
    ],
    overallAssessment: hasSignificantLosses
      ? 'Рекомендуется провести детальный аудит для выявления причин потерь. Проверьте процессы подсчета, измерения порций и хранения товаров.'
      : 'Отклонения находятся в пределах нормы. Рекомендуется регулярный мониторинг.',
  };
}

/**
 * Server action to analyze inventory variance.
 *
 * AI/LLM integration was intentionally removed from the project.
 */
export async function analyzeInventoryVariance(input: VarianceAnalysisInput): Promise<VarianceAnalysisResult> {
  try {
    const validated = VarianceAnalysisInputSchema.parse(input);
    return getFallbackAnalysis(validated);
  } catch (error) {
    console.error('Error in analyzeInventoryVariance:', error);
    return getFallbackAnalysis(input as VarianceAnalysisInput);
  }
}