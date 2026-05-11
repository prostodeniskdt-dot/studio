import { prisma } from '@/lib/db';
import { BULK_INTERACTIVE_TRANSACTION } from '@/lib/db/transaction-defaults';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { assertCanReadBar, assertCanWriteBar } from '@/lib/bar-access';

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { id } = await ctx.params;

    const session = await prisma.inventorySession.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!session) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
    await assertCanReadBar(uid, session.barId);

    return jsonResponse({
      ok: true,
      session: {
        ...session,
        createdAt: toIso(session.createdAt),
        closedAt: toIso(session.closedAt),
        updatedAt: toIso(session.updatedAt),
      },
      lines: session.lines.map((l) => ({
        ...l,
        createdAt: toIso(l.createdAt),
        updatedAt: toIso(l.updatedAt),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

type PatchBody = {
  session?: Partial<{
    name: string;
    status: 'draft' | 'in_progress' | 'completed';
    closedAt: string | null; // ISO
  }>;
  upsertLines?: Array<{
    id: string;
    productId: string;
    stockMode?: 'volume_ml' | 'pieces';
    startStock: number;
    purchases: number;
    sales: number;
    endStock: number;
    theoreticalEndStock: number;
    differenceVolume: number;
    differenceMoney: number;
    differencePercent: number;
  }>;
  addProductLine?: {
    productId: string;
    stockMode?: 'volume_ml' | 'pieces';
    endStock?: number;
  };
  /** Несколько новых строк за один запрос (импорт бланка). */
  addProductLines?: Array<{
    productId: string;
    stockMode?: 'volume_ml' | 'pieces';
    endStock?: number;
  }>;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { id } = await ctx.params;
    const body = await readJson<PatchBody>(req);

    const session = await prisma.inventorySession.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!session) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
    await assertCanWriteBar(uid, session.barId);

    await prisma.$transaction(
      async (tx) => {
        if (body.session) {
          await tx.inventorySession.update({
            where: { id },
            data: {
              ...(body.session.name !== undefined ? { name: body.session.name } : {}),
              ...(body.session.status !== undefined ? { status: body.session.status as any } : {}),
              ...(body.session.closedAt !== undefined
                ? { closedAt: body.session.closedAt ? new Date(body.session.closedAt) : null }
                : {}),
            },
          });
        }

        const linesToAdd = [...(body.addProductLines ?? [])];
        if (body.addProductLine?.productId) {
          linesToAdd.push(body.addProductLine);
        }
        for (const pl of linesToAdd) {
          if (!pl.productId) continue;
          const existing = await tx.inventoryLine.findFirst({
            where: { inventorySessionId: id, productId: pl.productId },
          });
          if (!existing) {
            const mode = pl.stockMode === 'pieces' ? 'pieces' : 'volume_ml';
            const end = typeof pl.endStock === 'number' ? pl.endStock : 0;
            await tx.inventoryLine.create({
              data: {
                inventorySessionId: id,
                productId: pl.productId,
                stockMode: mode,
                startStock: 0,
                purchases: 0,
                sales: 0,
                endStock: end,
                theoreticalEndStock: 0,
                differenceVolume: 0,
                differenceMoney: 0,
                differencePercent: 0,
              },
            });
          }
        }

        if (body.upsertLines && body.upsertLines.length > 0) {
          const ids = body.upsertLines.map((l) => l.id);
          const foreign = await tx.inventoryLine.findMany({
            where: { id: { in: ids }, NOT: { inventorySessionId: id } },
            select: { id: true },
          });
          if (foreign.length > 0) {
            throw new Error('Some lines do not belong to this session');
          }

          // Нельзя параллелить операции на одном interactive tx — Prisma даёт "Transaction not found".
          for (const l of body.upsertLines) {
            await tx.inventoryLine.upsert({
              where: { id: l.id },
              create: {
                id: l.id,
                inventorySessionId: id,
                productId: l.productId,
                stockMode: l.stockMode === 'pieces' ? 'pieces' : 'volume_ml',
                startStock: l.startStock,
                purchases: l.purchases,
                sales: l.sales,
                endStock: l.endStock,
                theoreticalEndStock: l.theoreticalEndStock,
                differenceVolume: l.differenceVolume,
                differenceMoney: l.differenceMoney,
                differencePercent: l.differencePercent,
              },
              update: {
                productId: l.productId,
                ...(l.stockMode ? { stockMode: l.stockMode === 'pieces' ? 'pieces' : 'volume_ml' } : {}),
                startStock: l.startStock,
                purchases: l.purchases,
                sales: l.sales,
                endStock: l.endStock,
                theoreticalEndStock: l.theoreticalEndStock,
                differenceVolume: l.differenceVolume,
                differenceMoney: l.differenceMoney,
                differencePercent: l.differencePercent,
              },
            });
          }
        }
      },
      BULK_INTERACTIVE_TRANSACTION
    );

    const updated = await prisma.inventorySession.findFirst({
      where: { id, barId: session.barId },
      include: { lines: true },
    });

    return jsonResponse({
      ok: true,
      session: updated
        ? {
            ...updated,
            createdAt: toIso(updated.createdAt),
            closedAt: toIso(updated.closedAt),
            updatedAt: toIso(updated.updatedAt),
          }
        : null,
      lines: updated?.lines.map((l) => ({
        ...l,
        createdAt: toIso(l.createdAt),
        updatedAt: toIso(l.updatedAt),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { id } = await ctx.params;

    const session = await prisma.inventorySession.findFirst({ where: { id } });
    if (!session) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
    await assertCanWriteBar(uid, session.barId);

    await prisma.inventorySession.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

