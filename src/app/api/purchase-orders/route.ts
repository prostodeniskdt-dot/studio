import { prisma } from '@/lib/db';
import { requireFirebaseUserId } from '@/lib/firebase-admin';
import { jsonResponse, readJson } from '@/lib/http';

function barIdFromUid(uid: string) {
  return `bar_${uid}`;
}

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET(req: Request) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const orders = await prisma.purchaseOrder.findMany({
      where: { barId },
      include: { lines: true, supplier: true },
      orderBy: { orderDate: 'desc' },
    });

    return jsonResponse({
      ok: true,
      orders: orders.map((o) => ({
        ...o,
        orderDate: toIso(o.orderDate),
        expectedDeliveryDate: toIso(o.expectedDeliveryDate),
        createdAt: toIso(o.createdAt),
        updatedAt: toIso(o.updatedAt),
      })),
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 401 }
    );
  }
}

type UpsertBody = {
  order: {
    id?: string;
    supplierId: string;
    status: string;
    orderDate: string; // ISO
  };
};

export async function POST(req: Request) {
  try {
    const uid = await requireFirebaseUserId(req);
    const barId = barIdFromUid(uid);
    const body = await readJson<UpsertBody>(req);

    const created = await prisma.purchaseOrder.create({
      data: {
        id: body.order.id ?? undefined,
        barId,
        supplierId: body.order.supplierId,
        status: body.order.status as any,
        orderDate: new Date(body.order.orderDate),
        createdByUserId: uid,
      },
    });

    return jsonResponse({ ok: true, order: created });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

