import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, readJson, statusFromApiError } from '@/lib/http';
import { assertCanWriteBar, resolveWorkingBarContext } from '@/lib/bar-access';

type UpsertBody = {
  supplier: {
    id?: string;
    name: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
};

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    await assertCanWriteBar(uid, barId);
    const body = await readJson<UpsertBody>(req);

    const created = await prisma.supplier.create({
      data: {
        id: body.supplier.id ?? undefined,
        barId,
        name: body.supplier.name,
        contactPerson: body.supplier.contactName ?? null,
        phone: body.supplier.phone ?? null,
        email: body.supplier.email ?? null,
      },
    });
    return jsonResponse({ ok: true, supplier: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

type PatchBody = {
  supplier: Partial<{
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
  }>;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { id } = await ctx.params;
    const body = await readJson<PatchBody>(req);

    const existing = await prisma.supplier.findFirst({ where: { id } });
    if (!existing) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
    await assertCanWriteBar(uid, existing.barId);

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(body.supplier.name !== undefined ? { name: body.supplier.name } : {}),
        ...(body.supplier.contactName !== undefined ? { contactPerson: body.supplier.contactName } : {}),
        ...(body.supplier.phone !== undefined ? { phone: body.supplier.phone } : {}),
        ...(body.supplier.email !== undefined ? { email: body.supplier.email } : {}),
      },
    });

    return jsonResponse({ ok: true, supplier: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const uid = await requireUserId(req);
    const { id } = await ctx.params;

    const existing = await prisma.supplier.findFirst({ where: { id } });
    if (!existing) return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
    await assertCanWriteBar(uid, existing.barId);

    await prisma.supplier.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
