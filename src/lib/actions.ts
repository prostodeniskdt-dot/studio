'use server';

import { analyzeInventoryVariance as analyzeInventoryVarianceFlow } from '@/ai/flows/analyze-inventory-variance';
import type { InventoryLine, Product } from './types';
import type { AnalyzeInventoryVarianceInput, AnalyzeInventoryVarianceOutput } from '@/ai/flows/analyze-inventory-variance';

export type { AnalyzeInventoryVarianceInput, AnalyzeInventoryVarianceOutput };

export async function runVarianceAnalysis(line: InventoryLine & { product?: Product }) {
  if (!line.product) {
    throw new Error('Данные о продукте отсутствуют для анализа.');
  }

  // Ensure all required fields for the flow are present
  const { name, portionVolumeMl } = line.product;
  const { startStock, purchases, sales, endStock, theoreticalEndStock } = line;

  if (
    name === undefined ||
    startStock === undefined ||
    purchases === undefined ||
    sales === undefined ||
    endStock === undefined ||
    theoreticalEndStock === undefined ||
    portionVolumeMl === undefined
  ) {
    throw new Error('Неполные данные для анализа.');
  }

  const input: AnalyzeInventoryVarianceInput = {
    productName: name,
    startStock: startStock,
    purchases: purchases,
    sales: sales * portionVolumeMl, // Convert portions to ml for analysis
    endStock: endStock,
    theoreticalEndStock: theoreticalEndStock,
  };

  try {
    const result = await analyzeInventoryVarianceFlow(input);
    return result;
  } catch (error) {
    console.error('Error in runVarianceAnalysis calling Genkit flow:', error);
    // Propagate a user-friendly error message
    throw new Error('Сбой AI-анализа. Пожалуйста, проверьте свой API-ключ Gemini и повторите попытку.');
  }
}
