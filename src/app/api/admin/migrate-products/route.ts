import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Инициализация Firebase Admin
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY не установлена в переменных окружения');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    initializeApp({ credential: cert(serviceAccount) });
    return getFirestore();
  } catch (error) {
    throw new Error(`Ошибка парсинга FIREBASE_SERVICE_ACCOUNT_KEY: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = initializeFirebaseAdmin();
    const startTime = Date.now();
    
    const productsSnapshot = await db.collection('products').get();
    
    let copiedToLibrary = 0;
    let skipped = 0;
    let skippedPremixes = 0;
    let skippedAlreadyInLibrary = 0;
    let skippedPersonal = 0;
    let currentBatch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    const sampleProductsToCopy: Array<{ id: string; name: string }> = [];
    const sampleSkippedPersonal: Array<{ id: string; name: string; barId: string }> = [];
    const sampleSkippedInLibrary: Array<{ id: string; name: string }> = [];

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productId = doc.id;

      // Пропускаем премиксы
      if (product.category === 'Premix' || product.isPremix === true) {
        skippedPremixes++;
        skipped++;
        continue;
      }

      // Пропускаем персональные продукты пользователей (те, что имеют barId)
      if (product.barId) {
        skippedPersonal++;
        skipped++;
        if (sampleSkippedPersonal.length < 3) {
          sampleSkippedPersonal.push({ id: productId, name: product.name || 'без названия', barId: product.barId });
        }
        continue;
      }

      // Пропускаем продукты уже в библиотеке
      if (product.isInLibrary === true) {
        skippedAlreadyInLibrary++;
        skipped++;
        if (sampleSkippedInLibrary.length < 3) {
          sampleSkippedInLibrary.push({ id: productId, name: product.name || 'без названия' });
        }
        continue;
      }

      // Копируем старый продукт в библиотеку
      const productRef = db.collection('products').doc(productId);
      
      const updateData = {
        isInLibrary: true,
        updatedAt: FieldValue.serverTimestamp(),
      };

      currentBatch.set(productRef, updateData, { merge: true });
      copiedToLibrary++;
      batchCount++;

      if (sampleProductsToCopy.length < 5) {
        sampleProductsToCopy.push({ id: productId, name: product.name || 'без названия' });
      }

      if (batchCount % BATCH_SIZE === 0) {
        await currentBatch.commit();
        currentBatch = db.batch();
      }
    }

    // Выполняем оставшиеся обновления
    if (batchCount % BATCH_SIZE !== 0 && batchCount > 0) {
      await currentBatch.commit();
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      data: {
        copiedToLibrary,
        skipped: {
          total: skipped,
          alreadyInLibrary: skippedAlreadyInLibrary,
          personal: skippedPersonal,
          premixes: skippedPremixes,
        },
        total: copiedToLibrary + skipped,
        duration: `${duration} сек`,
        samples: {
          copied: sampleProductsToCopy,
          skippedPersonal: sampleSkippedPersonal,
          skippedInLibrary: sampleSkippedInLibrary,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ошибка при миграции продуктов:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

