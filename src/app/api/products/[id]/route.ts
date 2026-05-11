import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { resolveWorkingBarContext } from '@/lib/bar-access';

function mapProduct(p: any) {
  return {
    ...p,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

type PatchBody = {
  // Generic partial update
  product?: Record<string, unknown>;
  // Convenience actions
  sendToLibrary?: boolean;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { barId: workingBarId, access } = await resolveWorkingBarContext(uid);
    if (access === 'viewer') {
      return jsonResponse({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await readJson<PatchBody>(req);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    // Персональные — бар работы или автор; общая библиотека — любой авторизованный с правом записи.
    const isLibraryGlobal = existing.isInLibrary === true && (existing.barId == null || existing.barId === '');
    const canEdit =
      (existing.barId && existing.barId === workingBarId) ||
      (existing.createdByUserId && existing.createdByUserId === uid) ||
      isLibraryGlobal;
    if (!canEdit) return jsonResponse({ ok: false, error: 'Forbidden' }, { status: 403 });

    const sendToLibrary = body.sendToLibrary === true;
    const patch = body.product ?? {};

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(patch as any),
        ...(sendToLibrary
          ? {
              isInLibrary: true,
              barId: null,
            }
          : {}),
      },
    });

    const premixIngredients = (patch as any)?.premixIngredients as
      | Array<{ productId: string; volumeMl: number; ratio: number }>
      | undefined;
    if (premixIngredients) {
      await prisma.premixIngredient.deleteMany({ where: { premixId: id } });
      if (premixIngredients.length > 0) {
        await prisma.premixIngredient.createMany({
          data: premixIngredients.map((ing) => ({
            premixId: id,
            ingredientProductId: ing.productId,
            volumeMl: ing.volumeMl,
            ratio: ing.ratio,
          })),
        });
      }
    }

    return jsonResponse({ ok: true, product: mapProduct(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { barId: workingBarId, access } = await resolveWorkingBarContext(uid);
    if (access === 'viewer') {
      return jsonResponse({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    const canDelete =
      (existing.barId && existing.barId === workingBarId) ||
      (existing.createdByUserId && existing.createdByUserId === uid);
    if (!canDelete) return jsonResponse({ ok: false, error: 'Forbidden' }, { status: 403 });

    await prisma.product.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

