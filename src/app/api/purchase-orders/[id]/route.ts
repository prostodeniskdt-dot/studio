import { prisma } from '@/lib/db';
import { requireFirebaseUserId } from '@/lib/firebase-admin';
import { jsonResponse, readJson } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const { id } = await ctx.params;

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, barId },
      include: { lines: true, supplier: true },
    });
    if (!order) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    return jsonResponse({
      ok: true,
      order: {
        ...order,
        orderDate: toIso(order.orderDate),
        expectedDeliveryDate: toIso(order.expectedDeliveryDate),
        createdAt: toIso(order.createdAt),
        updatedAt: toIso(order.updatedAt),
      },
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
  }
}

type PatchBody = {
  order?: Partial<{
    supplierId: string;
    status: string;
    orderDate: string; // ISO
  }>;
  // line operations
  addLine?: { productId: string };
  deleteLineId?: string;
  updateLines?: Array<{ id: string; quantity: number; costPerItem: number; receivedQuantity: number }>;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const { id } = await ctx.params;
    const body = await readJson<PatchBody>(req);

    const order = await prisma.purchaseOrder.findFirst({ where: { id, barId } });
    if (!order) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    if (body.order) {
      await prisma.purchaseOrder.update({
        where: { id },
        data: {
          ...(body.order.supplierId ? { supplierId: body.order.supplierId } : {}),
          ...(body.order.status ? { status: body.order.status as any } : {}),
          ...(body.order.orderDate ? { orderDate: new Date(body.order.orderDate) } : {}),
        },
      });
    }

    if (body.addLine) {
      const product = await prisma.product.findUnique({ where: { id: body.addLine.productId } });
      await prisma.purchaseOrderLine.create({
        data: {
          purchaseOrderId: id,
          productId: body.addLine.productId,
          quantity: 1,
          costPerItem: product?.costPerBottle ?? 0,
          receivedQuantity: 0,
        },
      });
    }

    if (body.deleteLineId) {
      await prisma.purchaseOrderLine.delete({ where: { id: body.deleteLineId } });
    }

    if (body.updateLines && body.updateLines.length > 0) {
      await prisma.$transaction(
        body.updateLines.map((l) =>
          prisma.purchaseOrderLine.update({
            where: { id: l.id },
            data: {
              quantity: l.quantity,
              costPerItem: l.costPerItem,
              receivedQuantity: l.receivedQuantity,
            },
          })
        )
      );
    }

    const updated = await prisma.purchaseOrder.findFirst({
      where: { id, barId },
      include: { lines: true, supplier: true },
    });

    return jsonResponse({
      ok: true,
      order: updated
        ? {
            ...updated,
            orderDate: toIso(updated.orderDate),
            expectedDeliveryDate: toIso(updated.expectedDeliveryDate),
            createdAt: toIso(updated.createdAt),
            updatedAt: toIso(updated.updatedAt),
          }
        : null,
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const { id } = await ctx.params;

    const order = await prisma.purchaseOrder.findFirst({ where: { id, barId } });
    if (!order) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });

    await prisma.purchaseOrder.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

