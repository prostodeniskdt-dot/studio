/**
 * Firestore -> PostgreSQL one-time migration.
 *
 * Current implementation migrates the global `products` collection into Postgres.
 * Extend it to bars/suppliers/sessions/orders once verified in staging.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from '../src/lib/db';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    initializeApp({ credential: cert(JSON.parse(keyJson)) });
    return;
  }

  // Fallback for local usage: serviceAccountKey.json in repo root
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const p = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(p)) {
    throw new Error(
      'No FIREBASE_SERVICE_ACCOUNT_KEY and no serviceAccountKey.json found. Provide Firebase Admin credentials.'
    );
  }
  initializeApp({ credential: cert(require(p)) });
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return null;
}

async function migrateProducts() {
  initFirebaseAdmin();
  const db = getFirestore();
  const snap = await db.collection('products').get();

  let upserted = 0;
  for (const doc of snap.docs) {
    const p = doc.data() as Record<string, unknown>;
    const id = doc.id;

    // Minimal mapping based on src/lib/types.ts + zod schema.
    // Unknown/extra fields can be added later.
    await prisma.product.upsert({
      where: { id },
      create: {
        id,
        name: String(p.name ?? ''),
        category: String(p.category ?? 'Other') as any,
        subCategory: typeof p.subCategory === 'string' ? p.subCategory : null,
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : null,
        costPerBottle: asNumber(p.costPerBottle),
        sellingPricePerPortion: asNumber(p.sellingPricePerPortion),
        portionVolumeMl: asNumber(p.portionVolumeMl),
        bottleVolumeMl: asNumber(p.bottleVolumeMl) ?? 0,
        fullBottleWeightG: asNumber(p.fullBottleWeightG),
        emptyBottleWeightG: asNumber(p.emptyBottleWeightG),
        reorderPointMl: asNumber(p.reorderPointMl),
        reorderQuantity: asNumber(p.reorderQuantity),
        defaultSupplierId: typeof p.defaultSupplierId === 'string' ? p.defaultSupplierId : null,
        isPremix: Boolean(p.isPremix ?? p.category === 'Premix'),
        costCalculationMode: typeof p.costCalculationMode === 'string' ? p.costCalculationMode : null,
        isInLibrary: Boolean(p.isInLibrary ?? false),
        createdByUserId: typeof p.createdByUserId === 'string' ? p.createdByUserId : null,
        barId: typeof p.barId === 'string' ? p.barId : null,
        isActive: Boolean(p.isActive ?? true),
      },
      update: {
        name: String(p.name ?? ''),
        category: String(p.category ?? 'Other') as any,
        subCategory: typeof p.subCategory === 'string' ? p.subCategory : null,
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : null,
        costPerBottle: asNumber(p.costPerBottle),
        sellingPricePerPortion: asNumber(p.sellingPricePerPortion),
        portionVolumeMl: asNumber(p.portionVolumeMl),
        bottleVolumeMl: asNumber(p.bottleVolumeMl) ?? 0,
        fullBottleWeightG: asNumber(p.fullBottleWeightG),
        emptyBottleWeightG: asNumber(p.emptyBottleWeightG),
        reorderPointMl: asNumber(p.reorderPointMl),
        reorderQuantity: asNumber(p.reorderQuantity),
        defaultSupplierId: typeof p.defaultSupplierId === 'string' ? p.defaultSupplierId : null,
        isPremix: Boolean(p.isPremix ?? p.category === 'Premix'),
        costCalculationMode: typeof p.costCalculationMode === 'string' ? p.costCalculationMode : null,
        isInLibrary: Boolean(p.isInLibrary ?? false),
        createdByUserId: typeof p.createdByUserId === 'string' ? p.createdByUserId : null,
        barId: typeof p.barId === 'string' ? p.barId : null,
        isActive: Boolean(p.isActive ?? true),
      },
    });

    upserted++;
    if (upserted % 500 === 0) {
      // eslint-disable-next-line no-console
      console.log(`Upserted products: ${upserted}/${snap.size}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Upserted products: ${upserted}`);
}

async function main() {
  await migrateProducts();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

