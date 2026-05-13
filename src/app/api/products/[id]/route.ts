import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { resolveWorkingBarContext } from '@/lib/bar-access';
import { appendFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';

// #region agent log
async function __dbgApi(message: string, data: Record<string, unknown>) {
  const line = JSON.stringify({
    sessionId: '6a8e21',
    runId: 'products-sync',
    hypothesisId: 'C',
    location: 'src/app/api/products/[id]/route.ts',
    message,
    data,
    timestamp: Date.now(),
  });
  const p = resolvePath(process.cwd(), 'debug-6a8e21.log');
  await appendFile(p, line + '\n').catch(() => {});
}
// #endregion

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
    const { id } = await ctx.params;
    if (access === 'viewer') {
      await __dbgApi('PATCH:forbidden_viewer', { uid, id });
      return jsonResponse({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await readJson<PatchBody>(req);
    await __dbgApi('PATCH:start', {
      uid,
      workingBarId,
      id,
      hasProductPatch: Boolean(body.product),
      sendToLibrary: body.sendToLibrary === true,
    });

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

    await __dbgApi('PATCH:success', {
      uid,
      id,
      isInLibrary: updated.isInLibrary,
      barId: updated.barId,
      isActive: updated.isActive,
      isPremix: updated.isPremix,
      category: updated.category,
    });
    return jsonResponse({ ok: true, product: mapProduct(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await __dbgApi('PATCH:error', { error: msg });
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

