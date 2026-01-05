/**
 * Скрипт проверки готовности к запуску миграции
 * 
 * Проверяет наличие необходимых зависимостей и учетных данных
 */

import * as path from 'path';
import * as fs from 'fs';

console.log('=== Проверка готовности к миграции ===\n');

// Проверка Node.js версии
const nodeVersion = process.version;
console.log(`✓ Node.js версия: ${nodeVersion}`);

// Проверка наличия package.json
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('✓ package.json найден');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasFirebaseAdmin = packageJson.dependencies?.['firebase-admin'] || packageJson.devDependencies?.['firebase-admin'];
    if (hasFirebaseAdmin) {
      console.log('✓ firebase-admin установлен');
    } else {
      console.log('✗ firebase-admin НЕ установлен');
      console.log('  Установите: npm install firebase-admin');
    }
  } catch (e) {
    console.log('✗ Ошибка чтения package.json');
  }
} else {
  console.log('✗ package.json не найден');
}

// Проверка serviceAccountKey.json
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  console.log('✓ serviceAccountKey.json найден');
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (serviceAccount.project_id) {
      console.log(`  Project ID: ${serviceAccount.project_id}`);
    } else {
      console.log('  ⚠️  project_id не найден в файле');
    }
  } catch (e) {
    console.log('✗ serviceAccountKey.json не является валидным JSON');
  }
} else {
  console.log('✗ serviceAccountKey.json не найден');
  console.log('  Создайте файл serviceAccountKey.json в корне проекта');
  console.log('  Или установите переменную окружения FIREBASE_SERVICE_ACCOUNT_KEY');
}

// Проверка переменной окружения
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('✓ FIREBASE_SERVICE_ACCOUNT_KEY установлена');
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.project_id) {
      console.log(`  Project ID: ${serviceAccount.project_id}`);
    }
  } catch (e) {
    console.log('  ⚠️  FIREBASE_SERVICE_ACCOUNT_KEY не является валидным JSON');
  }
} else {
  console.log('⊘ FIREBASE_SERVICE_ACCOUNT_KEY не установлена (необязательно, если есть файл)');
}

console.log('\n=== Резюме ===');
console.log('Для запуска миграции необходимо:');
console.log('1. Установить firebase-admin: npm install firebase-admin');
console.log('2. Создать serviceAccountKey.json или установить FIREBASE_SERVICE_ACCOUNT_KEY');
console.log('\nПосле настройки запустите:');
console.log('  npx tsx scripts/diagnose-products.ts');
console.log('  npx tsx scripts/copy-old-products-to-library.ts');

