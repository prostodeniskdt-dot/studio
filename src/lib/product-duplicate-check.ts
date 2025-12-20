import type { Product } from './types';
import { extractVolume } from './utils';

/**
 * Нормализует название продукта для сравнения
 * - Удаляет объем (например, "700 мл")
 * - Приводит к нижнему регистру
 * - Удаляет лишние пробелы
 */
function normalizeName(name: string): string {
  const { baseName } = extractVolume(name);
  return baseName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Вычисляет расстояние Левенштейна между двумя строками
 * Используется для определения похожести названий
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Создаем матрицу для динамического программирования
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  // Инициализация первой строки и столбца
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Заполнение матрицы
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // удаление
        matrix[i][j - 1] + 1,      // вставка
        matrix[i - 1][j - 1] + cost // замена
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Вычисляет процент похожести между двумя строками (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Проверяет, является ли новый продукт дубликатом существующих
 * 
 * @param newProductName - Название нового продукта (может содержать объем)
 * @param existingProducts - Массив существующих продуктов
 * @param threshold - Порог похожести в процентах (по умолчанию 85%)
 * @returns Найденный дубликат или null
 */
export function checkProductDuplicate(
  newProductName: string,
  existingProducts: Product[],
  threshold: number = 85
): Product | null {
  const normalizedNewName = normalizeName(newProductName);
  
  // Если название пустое после нормализации, не проверяем
  if (!normalizedNewName) {
    return null;
  }
  
  for (const product of existingProducts) {
    const normalizedExistingName = normalizeName(product.name);
    
    // Если название пустое, пропускаем
    if (!normalizedExistingName) {
      continue;
    }
    
    // Вычисляем похожесть
    const similarity = calculateSimilarity(normalizedNewName, normalizedExistingName);
    
    // Если похожесть выше порога, считаем дубликатом
    if (similarity >= threshold) {
      return product;
    }
  }
  
  return null;
}

