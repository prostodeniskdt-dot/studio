/**
 * Скрипт миграции продуктов в библиотеку и создания премиксов
 * 
 * Этот скрипт выполняет две основные задачи:
 * 1. Мигрирует все существующие продукты (кроме премиксов) в общую библиотеку
 * 2. Создает 10 популярных премиксов в библиотеке, используя продукты из базы
 * 
 * Запуск:
 *   npx tsx scripts/seed-library-products-and-premixes.ts
 * 
 * Требования:
 * - Установлен Firebase Admin SDK (npm install firebase-admin)
 * - Настроены переменные окружения для Firebase Admin или serviceAccountKey.json
 * - Права на запись в Firestore
 * 
 * Внимание: Миграция продуктов в библиотеку необратима!
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Инициализация Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Используем переменные окружения или default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      initializeApp();
    }
  }
}

const db = getFirestore();

// Тип для рецепта премикса
interface PremixRecipe {
  name: string;
  totalVolume: number;
  ingredients: [string, number][]; // Кортежи [название продукта, объем в мл]
}

// Рецепты популярных премиксов
const PREMIX_RECIPES: PremixRecipe[] = [
  {
    name: 'Лонг Айленд Айс Ти',
    totalVolume: 180,
    ingredients: [
      ['Водка', 20],
      ['Джин', 20],
      ['Белый ром', 20],
      ['Трипл Сек', 20],
      ['Сахарный сироп', 15],
      ['Лимонный сок', 30],
      ['Кола', 55],
    ],
  },
  {
    name: 'Маргарита',
    totalVolume: 120,
    ingredients: [
      ['Текила', 50],
      ['Трипл Сек', 20],
      ['Лимонный сок', 30],
      ['Сахарный сироп', 20],
    ],
  },
  {
    name: 'Московский Мул',
    totalVolume: 150,
    ingredients: [
      ['Водка', 50],
      ['Лимонный сок', 15],
      ['Имбирное пиво', 85],
    ],
  },
  {
    name: 'Мохито',
    totalVolume: 150,
    ingredients: [
      ['Белый ром', 50],
      ['Сахарный сироп', 20],
      ['Лимонный сок', 25],
      ['Содовая', 55],
    ],
  },
  {
    name: 'Пина Колада',
    totalVolume: 180,
    ingredients: [
      ['Белый ром', 60],
      ['Кокосовый ликер', 30],
      ['Ананасовый сок', 90],
    ],
  },
  {
    name: 'Космополитен',
    totalVolume: 120,
    ingredients: [
      ['Водка', 40],
      ['Трипл Сек', 15],
      ['Клюквенный сок', 30],
      ['Лимонный сок', 35],
    ],
  },
  {
    name: 'Секс на пляже',
    totalVolume: 150,
    ingredients: [
      ['Водка', 40],
      ['Персиковый ликер', 20],
      ['Клюквенный сок', 40],
      ['Ананасовый сок', 50],
    ],
  },
  {
    name: 'Б-52',
    totalVolume: 60,
    ingredients: [
      ['Кофейный ликер', 20],
      ['Бейлис', 20],
      ['Трипл Сек', 20],
    ],
  },
  {
    name: 'Дайкири',
    totalVolume: 100,
    ingredients: [
      ['Белый ром', 60],
      ['Лимонный сок', 30],
      ['Сахарный сироп', 10],
    ],
  },
  {
    name: 'Отвертка',
    totalVolume: 150,
    ingredients: [
      ['Водка', 50],
      ['Апельсиновый сок', 100],
    ],
  },
];

// Маппинг названий ингредиентов к категориям для поиска
interface ProductMapping {
  category: string;
  subCategory?: string;
  searchNames?: string[]; // Альтернативные названия для поиска
}

const PRODUCT_NAME_MAPPING: Record<string, ProductMapping> = {
  'Водка': { category: 'Vodka' },
  'Джин': { category: 'Gin', subCategory: 'London Dry' },
  'Белый ром': { category: 'Rum', subCategory: 'White' },
  'Темный ром': { category: 'Rum', subCategory: 'Dark' },
  'Текила': { category: 'Tequila' },
  'Трипл Сек': { category: 'Liqueur', searchNames: ['Трипл Сек', 'Триплсек'] },
  'Кофейный ликер': { category: 'Liqueur' },
  'Бейлис': { category: 'Liqueur', searchNames: ['Бейлис', 'Бейлис Ориджинал'] },
  'Персиковый ликер': { category: 'Liqueur' },
  'Кокосовый ликер': { category: 'Liqueur' },
  'Сахарный сироп': { category: 'Syrup' },
  'Сироп Гренадин': { category: 'Syrup' },
  'Лимонный сок': { category: 'Other' },
  'Клюквенный сок': { category: 'Other' },
  'Ананасовый сок': { category: 'Other' },
  'Апельсиновый сок': { category: 'Other' },
  'Кола': { category: 'Other' },
  'Имбирное пиво': { category: 'Beer', subCategory: 'Lager' },
  'Содовая': { category: 'Other' },
};

/**
 * Поиск продукта в библиотеке по названию и категории
 */
async function findProductByName(
  ingredientName: string,
  category?: string,
  subCategory?: string,
  searchNames?: string[]
): Promise<{ id: string; name: string; category: string } | null> {
  try {
    // Получаем все продукты из библиотеки
    const productsSnapshot = await db.collection('products')
      .where('isInLibrary', '==', true)
      .where('isActive', '==', true)
      .get();

    if (productsSnapshot.empty) {
      return null;
    }

    // Нормализуем название для поиска
    const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const searchNameNormalized = normalizeName(ingredientName);
    const searchNamesNormalized = searchNames?.map(n => normalizeName(n)) || [];
    const allSearchNames = [searchNameNormalized, ...searchNamesNormalized];

    // Сначала пытаемся найти точное совпадение
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productNameNormalized = normalizeName(product.name);

      // Проверяем категорию
      if (category && product.category !== category) continue;
      if (subCategory && product.subCategory !== subCategory) continue;

      // Проверяем точное совпадение названия
      if (allSearchNames.some(search => productNameNormalized === search)) {
        return { id: doc.id, name: product.name, category: product.category };
      }

      // Проверяем частичное совпадение (название содержит искомое или наоборот)
      if (allSearchNames.some(search => 
        productNameNormalized.includes(search) || 
        search.includes(productNameNormalized)
      )) {
        return { id: doc.id, name: product.name, category: product.category };
      }
    }

    // Если не нашли точное совпадение, пытаемся найти по частичному совпадению без учета категории
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productNameNormalized = normalizeName(product.name);

      if (category && product.category !== category) continue;

      if (allSearchNames.some(search => 
        productNameNormalized.includes(search) || 
        search.includes(productNameNormalized)
      )) {
        return { id: doc.id, name: product.name, category: product.category };
      }
    }

    return null;
  } catch (error) {
    console.error(`Ошибка при поиске продукта "${ingredientName}":`, error);
    return null;
  }
}

/**
 * Миграция всех продуктов (кроме премиксов) в библиотеку
 */
async function migrateProductsToLibrary() {
  console.log('=== Миграция продуктов в библиотеку ===\n');

  try {
    const productsSnapshot = await db.collection('products').get();
    console.log(`Найдено продуктов: ${productsSnapshot.size}`);

    let migratedToLibrary = 0;
    let skipped = 0;
    let currentBatch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();

      // Пропускаем премиксы
      if (product.category === 'Premix' || product.isPremix === true) {
        skipped++;
        continue;
      }

      // Пропускаем если уже в библиотеке
      if (product.isInLibrary === true && !product.barId) {
        skipped++;
        continue;
      }

      // Мигрируем в библиотеку
      const productRef = db.collection('products').doc(doc.id);
      currentBatch.update(productRef, {
        isInLibrary: true,
        barId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      migratedToLibrary++;
      batchCount++;

      if (batchCount % BATCH_SIZE === 0) {
        await currentBatch.commit();
        console.log(`Обработано ${batchCount} продуктов...`);
        currentBatch = db.batch();
      }
    }

    // Выполняем оставшиеся обновления
    if (batchCount % BATCH_SIZE !== 0 && batchCount > 0) {
      await currentBatch.commit();
    }

    console.log(`\nРезультаты миграции:`);
    console.log(`  Мигрировано в библиотеку: ${migratedToLibrary}`);
    console.log(`  Пропущено: ${skipped}`);
    console.log(`  Всего обработано: ${migratedToLibrary + skipped}`);
  } catch (error) {
    console.error('Ошибка при миграции продуктов:', error);
    throw error;
  }
}

/**
 * Создание премиксов в библиотеке
 */
async function createPremixes() {
  console.log('\n=== Создание премиксов ===\n');

  try {
    let createdCount = 0;
    let skippedCount = 0;
    const batch = db.batch();

    for (const recipe of PREMIX_RECIPES) {
      console.log(`Создание премикса: ${recipe.name}`);
      
      const ingredients: Array<{ productId: string; volumeMl: number; ratio: number }> = [];
      let allIngredientsFound = true;

      for (const ingredient of recipe.ingredients) {
        const [ingredientName, volumeMl] = ingredient as [string, number];
        const mapping = PRODUCT_NAME_MAPPING[ingredientName];
        
        if (!mapping) {
          console.warn(`  ⚠️  Не найден маппинг для ингредиента: ${ingredientName}`);
          allIngredientsFound = false;
          break;
        }

        const product = await findProductByName(
          ingredientName,
          mapping.category,
          mapping.subCategory,
          mapping.searchNames
        );

        if (!product) {
          console.warn(`  ⚠️  Не найден продукт: ${ingredientName} (${mapping.category}${mapping.subCategory ? `, ${mapping.subCategory}` : ''})`);
          allIngredientsFound = false;
          break;
        }

        const ratio = volumeMl / recipe.totalVolume;
        ingredients.push({
          productId: product.id,
          volumeMl,
          ratio,
        });
        console.log(`  ✓ Найден: ${product.name} (${volumeMl}мл)`);
      }

      if (!allIngredientsFound || ingredients.length === 0) {
        console.warn(`  ❌ Пропущен премикс "${recipe.name}" - не все ингредиенты найдены\n`);
        skippedCount++;
        continue;
      }

      // Создаем премикс
      const premixRef = db.collection('products').doc();
      const premixData = {
        id: premixRef.id,
        name: recipe.name,
        category: 'Premix',
        isPremix: true,
        premixIngredients: ingredients,
        bottleVolumeMl: recipe.totalVolume,
        isActive: true,
        isInLibrary: true,
        costCalculationMode: 'auto',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(premixRef, premixData);
      createdCount++;
      console.log(`  ✓ Премикс "${recipe.name}" готов к созданию\n`);
    }

    if (createdCount > 0) {
      await batch.commit();
      console.log(`✓ Создано премиксов: ${createdCount}`);
    } else {
      console.log('⚠️  Не создано ни одного премикса');
    }

    if (skippedCount > 0) {
      console.log(`⚠️  Пропущено премиксов: ${skippedCount}`);
    }
  } catch (error) {
    console.error('Ошибка при создании премиксов:', error);
    throw error;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('=== Скрипт миграции продуктов и создания премиксов ===\n');
  console.log('Внимание: Этот скрипт мигрирует все продукты в библиотеку (необратимо)!\n');

  try {
    // Шаг 1: Миграция продуктов в библиотеку
    await migrateProductsToLibrary();
    
    // Шаг 2: Создание премиксов
    await createPremixes();
    
    console.log('\n✅ Все операции выполнены успешно!');
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запуск
main()
  .then(() => {
    console.log('\nСкрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });

