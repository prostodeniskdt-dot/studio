/**
 * Скрипт миграции существующих продуктов в библиотеку
 * 
 * Этот скрипт мигрирует существующие продукты в Firestore:
 * - Продукты без barId и без isInLibrary → устанавливает isInLibrary: true (библиотека)
 * - Продукты с barId → устанавливает isInLibrary: false (если не установлено)
 * 
 * Запуск:
 *   npx tsx scripts/migrate-products-to-library.ts
 * 
 * Требования:
 * - Установлен Firebase Admin SDK
 * - Настроены переменные окружения для Firebase Admin
 * - Права на запись в Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация Firebase Admin (если еще не инициализирован)
if (getApps().length === 0) {
  // Используем переменные окружения или service account
  // Для production лучше использовать service account key
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Для локальной разработки может использоваться default credentials
    initializeApp();
  }
}

const db = getFirestore();

async function migrateProducts() {
  console.log('Начало миграции продуктов...');

  try {
    // Получаем все продукты
    const productsSnapshot = await db.collection('products').get();
    console.log(`Найдено продуктов: ${productsSnapshot.size}`);

    let migratedToLibrary = 0;
    let migratedToPersonal = 0;
    let skipped = 0;
    let currentBatch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const updates: any = {};

      // Проверяем, нужно ли мигрировать
      if (!product.barId && product.isInLibrary !== true) {
        // Продукт без barId и без isInLibrary → в библиотеку
        updates.isInLibrary = true;
        migratedToLibrary++;
      } else if (product.barId && product.isInLibrary === undefined) {
        // Продукт с barId, но без isInLibrary → устанавливаем false
        updates.isInLibrary = false;
        migratedToPersonal++;
      } else {
        skipped++;
        continue; // Пропускаем, если уже корректно настроено
      }

      const productRef = db.collection('products').doc(doc.id);
      currentBatch.update(productRef, updates);
      batchCount++;

      if (batchCount % BATCH_SIZE === 0) {
        // Выполняем batch при достижении лимита
        await currentBatch.commit();
        console.log(`Обработано ${batchCount} продуктов...`);
        currentBatch = db.batch(); // Создаем новый batch
      }
    }

    // Выполняем оставшиеся обновления
    if (batchCount % BATCH_SIZE !== 0) {
      await currentBatch.commit();
      console.log(`Завершена обработка ${batchCount} продуктов`);
    }

    console.log('\nРезультаты миграции:');
    console.log(`  Мигрировано в библиотеку: ${migratedToLibrary}`);
    console.log(`  Мигрировано как персональные: ${migratedToPersonal}`);
    console.log(`  Пропущено (уже корректно): ${skipped}`);
    console.log(`  Всего обработано: ${migratedToLibrary + migratedToPersonal + skipped}`);
    console.log('\nМиграция завершена успешно!');
  } catch (error) {
    console.error('Ошибка при миграции:', error);
    process.exit(1);
  }
}

// Запуск миграции
migrateProducts()
  .then(() => {
    console.log('Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });

