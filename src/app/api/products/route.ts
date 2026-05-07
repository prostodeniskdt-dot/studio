import { prisma } from '@/lib/db';
import { requireFirebaseUserId } from '@/lib/firebase-admin';
import { jsonResponse, readJson } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

function mapProduct(p: any) {
  // Prisma returns Date; UI expects Firestore Timestamp-like fields but mostly uses primitives.
  // We keep the same field names and pass ISO strings for dates (they are not used in UI heavily).
  return {
    ...p,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

export async function GET(req: Request) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);

    const [personal, library] = await Promise.all([
      prisma.product.findMany({
        where: { barId, isInLibrary: false },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { isInLibrary: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return jsonResponse({
      personalProducts: personal.map(mapProduct),
      libraryProducts: library.map(mapProduct),
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
  }
}

type CreateProductBody = {
  product: {
    id?: string;
    name: string;
    category: string;
    subCategory?: string | null;
    imageUrl?: string | null;
    bottleVolumeMl: number;
    fullBottleWeightG?: number | null;
    emptyBottleWeightG?: number | null;
    reorderPointMl?: number | null;
    reorderQuantity?: number | null;
    defaultSupplierId?: string | null;
    isActive?: boolean;
    isInLibrary?: boolean;
    premixIngredients?: Array<{ productId: string; volumeMl: number; ratio: number }> | null;
  };
};

export async function POST(req: Request) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const body = await readJson<CreateProductBody>(req);

    const p = body.product;
    const isInLibrary = Boolean(p.isInLibrary);

    const created = await prisma.product.create({
      data: {
        id: p.id ?? undefined,
        name: p.name,
        category: p.category as any,
        subCategory: p.subCategory ?? null,
        imageUrl: p.imageUrl ?? null,
        bottleVolumeMl: p.bottleVolumeMl,
        fullBottleWeightG: p.fullBottleWeightG ?? null,
        emptyBottleWeightG: p.emptyBottleWeightG ?? null,
        reorderPointMl: p.reorderPointMl ?? null,
        reorderQuantity: p.reorderQuantity ?? null,
        defaultSupplierId: p.defaultSupplierId ?? null,
        isActive: p.isActive ?? true,
        isInLibrary,
        createdByUserId: uid,
        barId: isInLibrary ? null : barId,
      },
    });

    if (p.premixIngredients && p.premixIngredients.length > 0) {
      await prisma.premixIngredient.createMany({
        data: p.premixIngredients.map((ing) => ({
          premixId: created.id,
          ingredientProductId: ing.productId,
          volumeMl: ing.volumeMl,
          ratio: ing.ratio,
        })),
        skipDuplicates: true,
      });
    }

    return jsonResponse({ ok: true, product: mapProduct(created) });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

