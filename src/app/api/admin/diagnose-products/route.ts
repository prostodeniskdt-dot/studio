import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация Firebase Admin (использует переменные окружения)
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Проверяем наличие учетных данных в переменных окружения
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

export async function GET(request: NextRequest) {
  try {
    const db = initializeFirebaseAdmin();
    
    const productsSnapshot = await db.collection('products').get();
    
    let total = 0;
    let premixes = 0;
    let inLibrary = 0; // isInLibrary === true && !barId
    let personal = 0; // с barId
    let oldProducts = 0; // без barId, без isInLibrary или isInLibrary !== true (кандидаты)
    let withBarIdAndInLibrary = 0; // barId && isInLibrary === true (аномалия)
    
    const oldProductsSamples: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string; category?: string }> = [];
    const anomalyProducts: Array<{ id: string; name: string; isInLibrary?: boolean; barId?: string }> = [];
    const libraryProductsSamples: Array<{ id: string; name: string }> = [];

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
        if (libraryProductsSamples.length < 5) {
          libraryProductsSamples.push({ id, name: product.name || 'без названия' });
        }
        continue;
      }

      // Персональные продукты (с barId)
      if (product.barId) {
        personal++;
        // Аномалия: barId && isInLibrary === true
        if (product.isInLibrary === true) {
          withBarIdAndInLibrary++;
          if (anomalyProducts.length < 5) {
            anomalyProducts.push({ id, name: product.name || 'без названия', isInLibrary: product.isInLibrary, barId: product.barId });
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
          name: product.name || 'без названия', 
          isInLibrary: product.isInLibrary,
          barId: product.barId,
          category: product.category
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total,
        premixes,
        inLibrary,
        personal,
        oldProducts,
        withBarIdAndInLibrary,
        samples: {
          oldProducts: oldProductsSamples,
          libraryProducts: libraryProductsSamples,
          anomalies: anomalyProducts,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ошибка при диагностике продуктов:', error);
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

