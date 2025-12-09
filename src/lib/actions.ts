'use server';

import { analyzeInventoryVariance } from '@/ai/flows/analyze-inventory-variance';
import type { CalculatedInventoryLine } from './types';

export async function runVarianceAnalysis(line: CalculatedInventoryLine) {
  if (!line.product) {
    return { analysis: 'Ошибка: данные о продукте отсутствуют.' };
  }

  const input = {
    productName: line.product.name,
    startStock: line.startStock,
    purchases: line.purchases,
    sales: line.sales * line.product.portionVolumeMl, // Convert portions to ml for analysis
    endStock: line.endStock,
    theoreticalEndStock: line.theoreticalEndStock,
  };

  try {
    const result = await analyzeInventoryVariance(input);
    return result;
  } catch (error) {
    console.error('Error analyzing inventory variance:', error);
    return { analysis: 'Произошла ошибка при анализе отклонения. Пожалуйста, попробуйте еще раз.' };
  }
}
