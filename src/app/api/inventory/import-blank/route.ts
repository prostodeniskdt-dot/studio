import { prisma } from '@/lib/db';
import { BULK_INTERACTIVE_TRANSACTION } from '@/lib/db/transaction-defaults';
import { requireUserId } from '@/lib/auth-server';
import { jsonResponse, statusFromApiError } from '@/lib/http';
import { assertCanWriteBar, resolveWorkingBarContext } from '@/lib/bar-access';
import { listImportFingerprint } from '@/lib/inventory-import/fingerprint';
import { findBestProductMatch, type ProductMatchCandidate } from '@/lib/inventory-import/match';
import { parseInventoryBlankFile, isPremixBlankFilename } from '@/lib/inventory-import/parse-inventory-file';
import { resolveImportRowEconomics } from '@/lib/inventory-import/row-handling';
import { guessCategoryFromText } from '@/lib/inventory-import/category-guess';

export const runtime = 'nodejs';

const MAX_BYTES = 22 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const uid = await requireUserId(req);
    const { barId } = await resolveWorkingBarContext(uid);
    await assertCanWriteBar(uid, barId);

    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('multipart/form-data')) {
      return jsonResponse({ ok: false, error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const confirmRaw = form.get('confirmDuplicate');
    const confirmDuplicate = confirmRaw === 'true' || confirmRaw === '1';

    if (!(file instanceof Blob)) {
      return jsonResponse({ ok: false, error: 'file обязателен' }, { status: 400 });
    }

    const filename = (file as File).name || 'blank.csv';
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return jsonResponse({ ok: false, error: 'Файл слишком большой' }, { status: 413 });
    }

    const rows = await parseInventoryBlankFile(buf, filename);
    if (rows.length === 0) {
      return jsonResponse(
        {
          ok: false,
          error: 'NO_ROWS',
          hint:
            'Не удалось извлечь позиции. Для PDF попробуйте CSV или XLSX. Для CSV проверьте кодировку.',
        },
        { status: 400 }
      );
    }

    const importListHash = listImportFingerprint(rows);
    if (!confirmDuplicate) {
      const dup = await prisma.inventorySession.findFirst({
        where: { barId, importListHash },
        select: { id: true },
      });
      if (dup) {
        return jsonResponse({
          ok: false,
          duplicateList: true,
          importListHash,
          rowCount: rows.length,
        } as const);
      }
    }

    const wantPremix = isPremixBlankFilename(filename);

    const matchPoolRaw = await prisma.product.findMany({
      where: {
        barId,
        isInLibrary: false,
        isPremix: wantPremix,
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        externalCode: true,
        isPremix: true,
      },
    });

    const matchPool: ProductMatchCandidate[] = matchPoolRaw.map((p) => ({
      ...p,
      barcode: p.barcode,
      externalCode: p.externalCode,
    }));

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.create({
        data: {
          barId,
          name: `Импорт: ${filename.replace(/\.[^.]+$/u, '')} — ${new Date().toLocaleString('ru-RU')}`,
          status: 'in_progress',
          importListHash,
          createdByUserId: uid,
        },
      });

      let createdProducts = 0;

      for (const row of rows) {
        const econRow = resolveImportRowEconomics(row);
        const match = findBestProductMatch(row, matchPool, wantPremix);
        let productId = match?.productId ?? null;

        if (!productId) {
          const category = wantPremix ? 'Premix' : guessCategoryFromText(row.group, row.name);
          const created = await tx.product.create({
            data: {
              name: row.name,
              category: category as any,
              subCategory: null,
              bottleVolumeMl: econRow.defaultBottleMl,
              fullBottleWeightG: null,
              emptyBottleWeightG: null,
              reorderPointMl: null,
              reorderQuantity: null,
              defaultSupplierId: null,
              isPremix: wantPremix,
              costCalculationMode: wantPremix ? 'manual' : null,
              isInLibrary: false,
              usesVolumeCalculator: econRow.usesVolumeCalculator,
              createdByUserId: uid,
              barId,
              externalCode: row.code?.trim() || null,
              barcode: row.barcode?.trim().replace(/\s/g, '') || null,
              isActive: true,
            },
          });
          productId = created.id;
          createdProducts++;
          matchPool.push({
            id: created.id,
            name: created.name,
            barcode: created.barcode,
            externalCode: created.externalCode,
            isPremix: Boolean(created.isPremix),
          });
        }

        await tx.inventoryLine.create({
          data: {
            inventorySessionId: session.id,
            productId: productId!,
            stockMode: econRow.stockMode,
            startStock: 0,
            purchases: 0,
            sales: 0,
            endStock: econRow.endStock,
            theoreticalEndStock: 0,
            differenceVolume: 0,
            differenceMoney: 0,
            differencePercent: 0,
          },
        });
      }

      return { sessionId: session.id, createdProducts, lineCount: rows.length };
    }, BULK_INTERACTIVE_TRANSACTION);

    return jsonResponse({
      ok: true,
      ...result,
      wantPremix,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'UNSUPPORTED_FORMAT') {
      return jsonResponse({ ok: false, error: 'Поддерживаются файлы CSV, XLSX и PDF' }, { status: 400 });
    }
    return jsonResponse({ ok: false, error: msg }, { status: statusFromApiError(msg) });
  }
}
