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

export async function analyzeInventoryVariance(input: AnalyzeInventoryVarianceInput): Promise<AnalyzeInventoryVarianceOutput> {
  return analyzeInventoryVarianceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInventoryVariancePrompt',
  input: {schema: AnalyzeInventoryVarianceInputSchema},
  output: {schema: AnalyzeInventoryVarianceOutputSchema},
  prompt: `You are an expert inventory analyst for bars.

You are provided with inventory data for a specific product and your task is to analyze any variances between the theoretical and actual stock levels.

Based on the provided data, identify potential causes for the variance. Consider factors such as potential over-pouring, theft, spoilage, incorrect sales recording, or incorrect stock counting.

Product Name: {{{productName}}}
Theoretical End Stock: {{{theoreticalEndStock}}}
Actual End Stock: {{{endStock}}}
Sales: {{{sales}}}
Purchases: {{{purchases}}}
Starting Stock: {{{startStock}}}

Provide a concise analysis of the potential causes for the variance.
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
