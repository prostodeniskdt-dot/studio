/**
 * Диагностический скрипт для анализа состояния продуктов в базе
 * 
 * Показывает статистику по продуктам:
 * - Общее количество
 * - Продукты без barId и без isInLibrary (кандидаты на копирование в библиотеку)
 * - Продукты уже в библиотеке
 * - Персональные продукты (с barId)
 * - Премиксы
 * 
 * Запуск:
 *   npx tsx scripts/diagnose-products.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Инициализация Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  const hasEnvServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const hasFileServiceAccount = fs.existsSync(serviceAccountPath);

  if (hasFileServiceAccount) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount) });
      console.log(`[firebase-admin] Используется service account файл: ${serviceAccountPath}`);
    } catch (e) {
      console.error('[firebase-admin] Не удалось прочитать/распарсить serviceAccountKey.json.');
      throw e;
    }
  } else if (hasEnvServiceAccount) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[firebase-admin] Используется service account из переменной окружения');
    } catch (e) {
      console.error('[firebase-admin] Не удалось распарсить FIREBASE_SERVICE_ACCOUNT_KEY.');
      throw e;
    }
  } else {
    console.log('[firebase-admin] Пытаемся использовать Application Default Credentials...');
    initializeApp();
  }
}

const db = getFirestore();

async function diagnoseProducts() {
  console.log('=== Диагностика продуктов в базе ===\n');

  try {
    const productsSnapshot = await db.collection('products').get();
    console.log(`Всего продуктов в базе: ${productsSnapshot.size}\n`);

    let total = 0;
    let premixes = 0;
    let inLibrary = 0; // isInLibrary === true && !barId
    let personal = 0; // с barId
    let oldProducts = 0; // без barId, без isInLibrary или isInLibrary !== true (кандидаты)
    let withBarIdAndInLibrary = 0; // barId && isInLibrary === true (аномалия)
    
    const oldProductsSamples: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string; category?: string }> = [];
    const anomalyProducts: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string }> = [];

    for (const doc of productsSnapshot.docs) {
      total++;
      const product = doc.data();
      const id = doc.id;

      // Премиксы
      if (product.category === 'Premix' || product.isPremix === true) {
        premixes++;
        continue;
      }

      // Продукты в библиотеке (без barId)
      if (product.isInLibrary === true && !product.barId) {
        inLibrary++;
        continue;
      }

      // Персональные продукты (с barId)
      if (product.barId) {
        personal++;
        // Аномалия: barId && isInLibrary === true
        if (product.isInLibrary === true) {
          withBarIdAndInLibrary++;
          if (anomalyProducts.length < 5) {
            anomalyProducts.push({ id, name: product.name, isInLibrary: product.isInLibrary, barId: product.barId });
          }
        }
        continue;
      }

      // Старые продукты (без barId, не в библиотеке)
      // Это кандидаты для копирования в библиотеку
      oldProducts++;
      if (oldProductsSamples.length < 10) {
        oldProductsSamples.push({ 
          id, 
          name: product.name, 
          isInLibrary: product.isInLibrary,
          barId: product.barId,
          category: product.category
        });
      }
    }

    console.log('Статистика:');
    console.log(`  Всего продуктов: ${total}`);
    console.log(`  Премиксы: ${premixes}`);
    console.log(`  В библиотеке (isInLibrary: true, без barId): ${inLibrary}`);
    console.log(`  Персональные (с barId): ${personal}`);
    console.log(`  Старые продукты (без barId, не в библиотеке): ${oldProducts} ⬅️ КАНДИДАТЫ ДЛЯ КОПИРОВАНИЯ`);
    console.log(`  Аномалии (barId && isInLibrary: true): ${withBarIdAndInLibrary}`);

    if (oldProducts > 0) {
      console.log(`\nПримеры старых продуктов (первые ${oldProductsSamples.length}):`);
      oldProductsSamples.forEach(p => {
        console.log(`  - ${p.name} (${p.category || 'без категории'})`);
        console.log(`    ID: ${p.id}`);
        console.log(`    isInLibrary: ${p.isInLibrary ?? 'undefined'}, barId: ${p.barId ?? 'undefined'}`);
      });
    }

    if (withBarIdAndInLibrary > 0) {
      console.log(`\n⚠️  Найдены аномальные продукты (barId && isInLibrary: true):`);
      anomalyProducts.forEach(p => {
        console.log(`  - ${p.name} (ID: ${p.id}, barId: ${p.barId})`);
      });
    }

    console.log(`\n💡 Рекомендация:`);
    if (oldProducts > 0) {
      console.log(`  Запустите скрипт copy-old-products-to-library.ts для копирования ${oldProducts} старых продуктов в библиотеку`);
    } else {
      console.log(`  Все продукты обработаны. Проверьте, что скрипт copy-old-products-to-library.ts был запущен успешно.`);
    }

    return {
      total,
      premixes,
      inLibrary,
      personal,
      oldProducts,
      withBarIdAndInLibrary
    };

  } catch (error) {
    console.error('Ошибка при диагностике:', error);
    throw error;
  }
}

async function main() {
  try {
    await diagnoseProducts();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    if (error instanceof Error) {
      console.error('Стек ошибки:', error.stack);
    }
    process.exit(1);
  }
}

main();

