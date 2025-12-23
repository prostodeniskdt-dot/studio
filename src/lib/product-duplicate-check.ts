import type { Product } from './types';
import { extractVolume } from './utils';

/**
 * Нормализует название продукта для сравнения
 * - Удаляет объем (например, "700 мл")
 * - Приводит к нижнему регистру
 * - Удаляет лишние пробелы
 * - Удаляет специальные символы для более точного сравнения
 */
function normalizeName(name: string): string {
  const { baseName } = extractVolume(name);
  return baseName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sа-яё]/gi, ''); // Удаляем специальные символы, оставляем только буквы и цифры
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
 * Проверяет, является ли одно название подстрокой другого
 * Используется для разрешения случаев, когда одно название является частью другого
 * Например: "чинзано" является частью "чинзано розе"
 */
function isSubstringMatch(normalizedNew: string, normalizedExisting: string): boolean {
  if (!normalizedNew || !normalizedExisting) return false;
  
  // Проверяем, является ли одно название подстрокой другого
  // Но только если разница в длине существенна (минимум 3 символа)
  const lengthDiff = Math.abs(normalizedNew.length - normalizedExisting.length);
  if (lengthDiff < 3) return false; // Слишком похожие по длине - не подстрока
  
  return normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew);
}

/**
 * Определяет, есть ли существенные различия между названиями
 * Существенные различия - это дополнительные слова, а не только орфографические ошибки
 * 
 * @param str1 - Первое нормализованное название
 * @param str2 - Второе нормализованное название
 * @returns true, если есть существенные различия (разные слова)
 */
function hasSignificantDifference(str1: string, str2: string): boolean {
  if (!str1 || !str2) return false;
  
  // Разбиваем на слова
  const words1 = str1.split(/\s+/).filter(w => w.length > 2); // Игнорируем очень короткие слова
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);
  
  // Если количество слов сильно отличается - это существенное различие
  if (Math.abs(words1.length - words2.length) >= 1) {
    // Проверяем, есть ли уникальные слова в каждом названии
    const uniqueWords1 = words1.filter(w => !words2.includes(w));
    const uniqueWords2 = words2.filter(w => !words1.includes(w));
    
    // Если есть уникальные слова длиннее 3 символов - это существенное различие
    if (uniqueWords1.some(w => w.length > 3) || uniqueWords2.some(w => w.length > 3)) {
      return true;
    }
  }
  
  // Проверяем, есть ли в одном названии слова, которых нет в другом
  const allWords1 = new Set(words1);
  const allWords2 = new Set(words2);
  
  // Находим слова, которые есть только в одном из названий
  const onlyIn1 = words1.filter(w => !allWords2.has(w));
  const onlyIn2 = words2.filter(w => !allWords1.has(w));
  
  // Если есть уникальные слова длиннее 3 символов - это существенное различие
  return onlyIn1.some(w => w.length > 3) || onlyIn2.some(w => w.length > 3);
}

/**
 * Вычисляет адаптивный порог похожести на основе длины названий
 * Для коротких названий нужен более строгий порог
 */
function getAdaptiveThreshold(str1: string, str2: string, baseThreshold: number): number {
  const minLength = Math.min(str1.length, str2.length);
  const maxLength = Math.max(str1.length, str2.length);
  
  // Для очень коротких названий (< 10 символов) повышаем порог до 90-95%
  if (minLength < 10) {
    return Math.max(baseThreshold, 90);
  }
  
  // Для средних названий (10-20 символов) используем базовый порог
  if (minLength < 20) {
    return baseThreshold;
  }
  
  // Для длинных названий можно немного снизить порог
  return Math.max(baseThreshold - 2, 80);
}

/**
 * Проверяет, является ли новый продукт дубликатом существующих
 * 
 * Использует многоуровневую проверку:
 * 1. Точное совпадение после нормализации → блокировать
 * 2. Проверка на включение подстрок → разрешить, если один является частью другого
 * 3. Проверка расстояния Левенштейна с учетом существенных различий
 * 
 * @param newProductName - Название нового продукта (может содержать объем)
 * @param existingProducts - Массив существующих продуктов
 * @param threshold - Порог похожести в процентах (по умолчанию 85%)
 * @param newProductVolume - Объем нового продукта в мл (опционально, для сравнения только с продуктами того же объема)
 * @returns Найденный дубликат или null
 */
export function checkProductDuplicate(
  newProductName: string,
  existingProducts: Product[],
  threshold: number = 85,
  newProductVolume?: number // Новый параметр для объема
): Product | null {
  const normalizedNewName = normalizeName(newProductName);
  
  // Если название пустое после нормализации, не проверяем
  if (!normalizedNewName) {
    return null;
  }
  
  for (const product of existingProducts) {
    // Если указан объем нового продукта, сравниваем только с продуктами с таким же объемом
    if (newProductVolume !== undefined && product.bottleVolumeMl !== newProductVolume) {
      continue;
    }
    
    const normalizedExistingName = normalizeName(product.name);
    
    // Если название пустое, пропускаем
    if (!normalizedExistingName) {
      continue;
    }
    
    // Уровень 1: Точное совпадение после нормализации → блокировать
    if (normalizedNewName === normalizedExistingName) {
      return product;
    }
    
    // Уровень 2: Проверка на включение подстрок → разрешить, если один является частью другого
    if (isSubstringMatch(normalizedNewName, normalizedExistingName)) {
      // Одно название является подстрокой другого - это разные продукты
      // Например: "чинзано" vs "чинзано розе" - разрешаем
      continue;
    }
    
    // Уровень 3: Проверка расстояния Левенштейна с учетом существенных различий
    // Вычисляем адаптивный порог на основе длины названий
    const adaptiveThreshold = getAdaptiveThreshold(normalizedNewName, normalizedExistingName, threshold);
    
    // Вычисляем похожесть
    const similarity = calculateSimilarity(normalizedNewName, normalizedExistingName);
    
    // Если похожесть выше порога, проверяем на существенные различия
    if (similarity >= adaptiveThreshold) {
      // Проверяем, есть ли существенные различия (дополнительные слова)
      if (hasSignificantDifference(normalizedNewName, normalizedExistingName)) {
        // Есть существенные различия - это разные продукты, разрешаем
        // Например: "чинзано розе" vs "чинзано рояле" - разные продукты
        continue;
      }
      
      // Нет существенных различий, только орфографические - блокируем как дубликат
      // Например: "чинзано" vs "чинзанно" - орфографическая ошибка
      return product;
    }
  }
  
  return null;
}

