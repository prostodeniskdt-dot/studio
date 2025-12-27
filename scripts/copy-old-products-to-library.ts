/**
 * Скрипт безопасного копирования старых продуктов в библиотеку
 * 
 * Этот скрипт безопасно копирует старые продукты (без barId) в библиотеку,
 * используя set() с merge: true для сохранения ID продуктов и предотвращения
 * поломки ссылок в других коллекциях (InventoryLine, PurchaseOrderLine, PremixIngredient).
 * 
 * Запуск:
 *   npx tsx scripts/copy-old-products-to-library.ts
 * 
 * Требования:
 * - Установлен Firebase Admin SDK (npm install firebase-admin)
 * - Настроены переменные окружения для Firebase Admin или serviceAccountKey.json
 * - Права на запись в Firestore
 * 
 * Внимание: Операция обновит существующие документы, сохранив их ID!
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Инициализация Firebase Admin
if (getApps().length === 0) {
  // ВАЖНО: используем process.cwd(), потому что __dirname может отсутствовать в ESM-режиме (tsx).
  // Запускать скрипт нужно из корня репозитория.
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
      console.error('Проверьте, что файл валидный JSON и находится в корне проекта:', serviceAccountPath);
      throw e;
    }
  } else if (hasEnvServiceAccount) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[firebase-admin] Используется service account из переменной окружения FIREBASE_SERVICE_ACCOUNT_KEY');
    } catch (e) {
      console.error('[firebase-admin] Не удалось распарсить FIREBASE_SERVICE_ACCOUNT_KEY как JSON.');
      throw e;
    }
  } else {
    // Application Default Credentials (ADC)
    // Если ADC не настроены, дальнейшие запросы к Firestore упадут. Дадим понятную подсказку.
    console.log('[firebase-admin] serviceAccountKey.json не найден и FIREBASE_SERVICE_ACCOUNT_KEY не задан.');
    console.log('[firebase-admin] Пытаемся использовать Application Default Credentials (ADC)...');
    initializeApp();
  }
}

const db = getFirestore();

/**
 * Безопасное копирование старых продуктов в библиотеку
 * Использует set() с merge: true для сохранения ID и ссылок
 */
async function copyOldProductsToLibrary() {
  console.log('=== Копирование старых продуктов в библиотеку ===\n');

  const startTime = Date.now();

  try {
    const productsSnapshot = await db.collection('products').get();
    console.log(`Найдено всего продуктов в базе: ${productsSnapshot.size}`);

    let copiedToLibrary = 0;
    let skipped = 0;
    let skippedPremixes = 0;
    let skippedAlreadyInLibrary = 0;
    let skippedPersonal = 0;
    let currentBatch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();

      // Пропускаем премиксы
      if (product.category === 'Premix' || product.isPremix === true) {
        skippedPremixes++;
        skipped++;
        continue;
      }

      // Пропускаем продукты уже в библиотеке
      if (product.isInLibrary === true && !product.barId) {
        skippedAlreadyInLibrary++;
        skipped++;
        continue;
      }

      // Пропускаем персональные продукты пользователей (те, что имеют barId)
      if (product.barId) {
        skippedPersonal++;
        skipped++;
        continue;
      }

      // Копируем старый продукт в библиотеку (без barId)
      // Используем set() с merge: true для безопасного обновления с сохранением ID
      const productRef = db.collection('products').doc(doc.id);
      
      // Подготавливаем данные для обновления
      // На этом этапе product гарантированно не имеет barId (мы пропустили продукты с barId выше)
      const updateData = {
        isInLibrary: true,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Используем set() с merge: true для безопасного обновления
      // Это сохранит все существующие поля и добавит/обновит только указанные
      // ID документа сохраняется, поэтому все ссылки на этот продукт продолжат работать
      currentBatch.set(productRef, updateData, { merge: true });
      copiedToLibrary++;
      batchCount++;

      if (batchCount % BATCH_SIZE === 0) {
        await currentBatch.commit();
        console.log(`  Обработано ${batchCount} продуктов для копирования...`);
        currentBatch = db.batch();
      }
    }

    // Выполняем оставшиеся обновления
    if (batchCount % BATCH_SIZE !== 0 && batchCount > 0) {
      await currentBatch.commit();
      console.log(`  Завершено копирование ${batchCount} продуктов`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\nРезультаты копирования:`);
    console.log(`  ✓ Скопировано в библиотеку: ${copiedToLibrary}`);
    console.log(`  ⊘ Пропущено (уже в библиотеке): ${skippedAlreadyInLibrary}`);
    console.log(`  ⊘ Пропущено (персональные продукты): ${skippedPersonal}`);
    console.log(`  ⊘ Пропущено (премиксы): ${skippedPremixes}`);
    console.log(`  ⊘ Всего пропущено: ${skipped}`);
    console.log(`  = Всего обработано: ${copiedToLibrary + skipped}`);
    console.log(`  ⏱  Время выполнения: ${duration} сек`);
  } catch (error) {
    console.error('Ошибка при копировании продуктов:', error);
    throw error;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('=== Скрипт копирования старых продуктов в библиотеку ===\n');
  console.log('⚠️  Внимание: Этот скрипт обновит существующие документы продуктов!');
  console.log('   ID продуктов будут сохранены для поддержания ссылок.\n');
  console.log('Начало выполнения в:', new Date().toISOString());
  console.log('');

  try {
    await copyOldProductsToLibrary();
    
    console.log('\n✅ Все операции выполнены успешно!');
    console.log('Завершение выполнения в:', new Date().toISOString());
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении скрипта:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Стек ошибки:', error.stack);
    }
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

