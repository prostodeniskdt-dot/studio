import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { assertCanWriteBar, resolveWorkingBarContext } from '@/lib/bar-access';

function mapProduct(p: any) {
  const premixIngredients = p.premixIngredients?.length
    ? p.premixIngredients.map((x: any) => ({
        productId: x.ingredientProductId,
        volumeMl: x.volumeMl,
        ratio: x.ratio,
      }))
    : undefined;
  const { premixIngredients: _raw, ...rest } = p;
  return {
    ...rest,
    premixIngredients,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);

    const includePremix = {
      premixIngredients: {
        select: { ingredientProductId: true, volumeMl: true, ratio: true },
      },
    } as const;

    const [personal, library] = await Promise.all([
      prisma.product.findMany({
        where: { barId, isInLibrary: false },
        orderBy: { updatedAt: 'desc' },
        include: includePremix,
      }),
      prisma.product.findMany({
        where: { isInLibrary: true },
        orderBy: { updatedAt: 'desc' },
        include: includePremix,
      }),
    ]);

    return jsonResponse({
      personalProducts: personal.map(mapProduct),
      libraryProducts: library.map(mapProduct),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
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
    isPremix?: boolean;
    usesVolumeCalculator?: boolean;
    externalCode?: string | null;
    barcode?: string | null;
    premixIngredients?: Array<{ productId: string; volumeMl: number; ratio: number }> | null;
    costCalculationMode?: 'auto' | 'manual' | null;
  };
};

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    await assertCanWriteBar(uid, barId);
    const body = await readJson<CreateProductBody>(req);

    const p = body.product;
    const isInLibrary = Boolean(p.isInLibrary);
    const isPremix = p.category === 'Premix' || Boolean(p.isPremix);

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
        isPremix,
        costCalculationMode: p.costCalculationMode ?? null,
        usesVolumeCalculator: p.usesVolumeCalculator ?? true,
        externalCode: p.externalCode?.trim() || null,
        barcode: p.barcode?.replace(/\s/g, '') || null,
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
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

