'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { CalculatedInventoryLine } from './types';

export type AnalyzeInventoryVarianceInput = {
    productName: string;
    startStock: number;
    purchases: number;
    sales: number;
    theoreticalEndStock: number;
    endStock: number;
};
export type AnalyzeInventoryVarianceOutput = { analysis: string; };

export async function runVarianceAnalysis(line: CalculatedInventoryLine): Promise<AnalyzeInventoryVarianceOutput> {
  try {
    // Ensure we only pass the fields defined in the Zod schema to the AI flow.
    const analysisInput: AnalyzeInventoryVarianceInput = {
      productName: line.product?.name ?? 'Unknown Product',
      theoreticalEndStock: line.theoreticalEndStock,
      endStock: line.endStock,
      sales: line.sales,
      purchases: line.purchases,
      startStock: line.startStock
    };

    const result = await analyzeInventoryVarianceFlow(analysisInput);
    return result;
  } catch (e: any) {
    console.error("Variance analysis failed:", e);
    // Re-throw a more user-friendly error message.
    throw new Error('Не удалось выполнить анализ. Пожалуйста, попробуйте еще раз.');
  }
}
