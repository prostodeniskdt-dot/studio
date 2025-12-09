'use server';

/**
 * @fileOverview AI-powered analysis of inventory variances to identify potential causes of discrepancies.
 *
 * - analyzeInventoryVariance - A function that takes inventory data and returns potential causes for variances.
 * - AnalyzeInventoryVarianceInput - The input type for the analyzeInventoryVariance function.
 * - AnalyzeInventoryVarianceOutput - The return type for the analyzeInventoryVariance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInventoryVarianceInputSchema = z.object({
  productName: z.string().describe('The name of the product being analyzed.'),
  theoreticalEndStock: z.number().describe('The theoretical end stock level of the product.'),
  endStock: z.number().describe('The actual end stock level of the product.'),
  sales: z.number().describe('The amount of the product sold during the inventory session.'),
  purchases: z.number().describe('The amount of the product purchased during the inventory session.'),
  startStock: z.number().describe('The starting stock level of the product.'),
});

export type AnalyzeInventoryVarianceInput = z.infer<typeof AnalyzeInventoryVarianceInputSchema>;

const AnalyzeInventoryVarianceOutputSchema = z.object({
  analysis: z.string().describe('An analysis of potential causes for the inventory variance.'),
});

export type AnalyzeInventoryVarianceOutput = z.infer<typeof AnalyzeInventoryVarianceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'analyzeInventoryVariancePrompt',
  input: {schema: AnalyzeInventoryVarianceInputSchema},
  output: {schema: AnalyzeInventoryVarianceOutputSchema},
  prompt: `Вы — эксперт-аналитик по инвентаризации в барах.

Вам предоставляются данные инвентаризации по конкретному продукту, и ваша задача — проанализировать любые расхождения между теоретическим и фактическим уровнем запасов.

На основе предоставленных данных определите возможные причины расхождения. Учитывайте такие факторы, как возможный перелив, кража, порча, неверная регистрация продаж или неверный подсчет запасов.

Название продукта: {{{productName}}}
Теоретический конечный запас: {{{theoreticalEndStock}}}
Фактический конечный запас: {{{endStock}}}
Продажи: {{{sales}}}
Закупки: {{{purchases}}}
Начальный запас: {{{startStock}}}

Предоставьте краткий анализ потенциальных причин расхождения. Ответ должен быть на русском языке.
`,
});

const analyzeInventoryVarianceFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryVarianceFlow',
    inputSchema: AnalyzeInventoryVarianceInputSchema,
    outputSchema: AnalyzeInventoryVarianceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function analyzeInventoryVariance(input: AnalyzeInventoryVarianceInput): Promise<AnalyzeInventoryVarianceOutput> {
  return analyzeInventoryVarianceFlow(input);
}
