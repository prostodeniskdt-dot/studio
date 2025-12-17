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
 * Analyzes inventory variances using AI to identify possible causes
 */
async function analyzeVarianceWithAI(input: VarianceAnalysisInput): Promise<VarianceAnalysisResult> {
  // Check if API key is available
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    console.warn('GOOGLE_GENAI_API_KEY not set, using fallback analysis');
    return getFallbackAnalysis(input);
  }

  try {
    // Use direct Google Generative AI API call as fallback
    // Note: This requires GOOGLE_GENAI_API_KEY to be set
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY not configured');
    }

    // Prepare analysis prompt
    const prompt = buildAnalysisPrompt(input);

    // Call Google Generative AI API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse and structure the AI response
    return parseAIResponse(analysisText);
  } catch (error) {
    console.error('Error in AI variance analysis:', error);
    // Return fallback analysis if AI fails
    return getFallbackAnalysis(input);
  }
}

/**
 * Builds the prompt for AI analysis
 */
function buildAnalysisPrompt(input: VarianceAnalysisInput): string {
  const { session, lines, topLosses, totals, historicalContext } = input;

  const sessionDate = session.closedAt 
    ? new Date(session.closedAt.seconds * 1000).toLocaleDateString('ru-RU')
    : 'не указана';

  return `Ты - эксперт по анализу инвентаризации в барах и ресторанах. Проанализируй данные инвентаризации и определи возможные причины отклонений.

КОНТЕКСТ:
- Название сессии: ${session.name}
- Дата закрытия: ${sessionDate}
- Всего позиций: ${lines.length}

ТОП-5 НАИБОЛЬШИХ ПОТЕРЬ:
${topLosses.map((loss, idx) => 
  `${idx + 1}. ${loss.productName}: потеря ${loss.differenceMoney.toFixed(2)} руб. (${loss.differencePercent.toFixed(1)}%)`
).join('\n')}

ОБЩАЯ СТАТИСТИКА:
- Общие потери: ${totals.totalLoss.toFixed(2)} руб.
- Общие излишки: ${totals.totalSurplus.toFixed(2)} руб.
- Чистое отклонение: ${totals.totalVariance.toFixed(2)} руб.

ДЕТАЛИ ПОТЕРЬ:
${lines
  .filter(l => l.differenceMoney < 0)
  .slice(0, 10)
  .map(l => {
    const salesVolume = (l.sales * (l.portionVolumeMl || 0)).toFixed(0);
    return `- ${l.productName || 'Продукт'} (${l.productCategory || 'Категория'}): 
  Начало: ${l.startStock} мл, Покупки: ${l.purchases} мл, Продажи: ${salesVolume} мл (${l.sales} порций)
  Теоретический остаток: ${l.theoreticalEndStock.toFixed(0)} мл
  Фактический остаток: ${l.endStock} мл
  Отклонение: ${l.differenceVolume.toFixed(0)} мл (${l.differenceMoney.toFixed(2)} руб., ${l.differencePercent.toFixed(1)}%)`;
  })
  .join('\n\n')}

${historicalContext && historicalContext.previousSessionsCount 
  ? `\nИСТОРИЧЕСКИЙ КОНТЕКСТ:\n- Предыдущих сессий: ${historicalContext.previousSessionsCount}\n- Среднее отклонение: ${historicalContext.averageVariance?.toFixed(2) || 'N/A'} руб.`
  : ''}

ВОЗМОЖНЫЕ ПРИЧИНЫ ОТКЛОНЕНИЙ, которые нужно проанализировать:
1. Утечки и разливы (особенно для жидких продуктов)
2. Ошибки в подсчете остатков
3. Неточности в измерении порций (мерки, джиггеры)
4. Проблемы с качеством товара (испарение, порча)
5. Ошибки при вводе данных (начальный остаток, покупки)
6. Воровство или неправильное использование персоналом
7. Проблемы с учетом возвратов и списаний
8. Ошибки в настройке порций в системе

ВЕРНИ АНАЛИЗ В СЛЕДУЮЩЕМ JSON ФОРМАТЕ:
{
  "summary": "краткое резюме (2-3 предложения)",
  "possibleCauses": [
    {
      "cause": "название причины",
      "likelihood": "high|medium|low",
      "description": "подробное описание",
      "recommendations": ["рекомендация 1", "рекомендация 2"]
    }
  ],
  "insights": ["инсайт 1", "инсайт 2"],
  "overallAssessment": "общая оценка ситуации (1-2 абзаца)"
}

ОБЯЗАТЕЛЬНО верни ВАЛИДНЫЙ JSON, никакого дополнительного текста.`;
}

/**
 * Parses AI response and converts to structured format
 */
function parseAIResponse(responseText: string): VarianceAnalysisResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Анализ завершен',
        possibleCauses: parsed.possibleCauses || [],
        insights: parsed.insights || [],
        overallAssessment: parsed.overallAssessment || 'Анализ данных не выявил критических проблем.',
      };
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  // Fallback if parsing fails
  return {
    summary: 'Автоматический анализ отклонений. Рекомендуется ручная проверка данных.',
    possibleCauses: [{
      cause: 'Требуется дополнительный анализ',
      likelihood: 'medium',
      description: 'Не удалось автоматически определить причины. Рекомендуется провести ручной аудит.',
      recommendations: ['Проверьте правильность ввода данных', 'Сверьте остатки вручную', 'Проверьте настройки порций'],
    }],
    insights: ['Необходима дополнительная информация для точного анализа'],
    overallAssessment: responseText || 'Анализ отклонений требует ручной проверки.',
  };
}

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
 * Server action to analyze inventory variance
 */
export async function analyzeInventoryVariance(input: VarianceAnalysisInput): Promise<VarianceAnalysisResult> {
  try {
    const validated = VarianceAnalysisInputSchema.parse(input);
    return await analyzeVarianceWithAI(validated);
  } catch (error) {
    console.error('Error in analyzeInventoryVariance:', error);
    return getFallbackAnalysis(input as VarianceAnalysisInput);
  }
}