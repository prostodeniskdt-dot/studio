import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { assertCanWriteBar, resolveWorkingBarContext } from '@/lib/bar-access';

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
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
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
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
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    await assertCanWriteBar(uid, barId);
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
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
