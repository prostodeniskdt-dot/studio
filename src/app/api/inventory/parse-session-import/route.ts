import { requireUserId } from '@/lib/auth-server';
import { jsonResponse } from '@/lib/http';
import { parseSessionUploadBuffer } from '@/lib/inventory-import/parse-session-upload';

export const runtime = 'nodejs';

const MAX_BYTES = 22 * 1024 * 1024;

/**
 * Разбор CSV / Excel / PDF для импорта в открытую сессию инвентаризации (без записи в БД).
 */
export async function POST(req: Request) {
  try {
    await requireUserId(req);

    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('multipart/form-data')) {
      return jsonResponse({ ok: false, error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return jsonResponse({ ok: false, error: 'file обязателен' }, { status: 400 });
    }

    const filename = (file as File).name || 'import.csv';
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return jsonResponse({ ok: false, error: 'Файл слишком большой' }, { status: 413 });
    }

    const parsed = await parseSessionUploadBuffer(buf, filename);
    return jsonResponse({ ok: true, parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'Not authenticated' || msg === 'Session expired') {
      return jsonResponse({ ok: false, error: msg }, { status: 401 });
    }
    if (msg === 'UNSUPPORTED_FORMAT') {
      return jsonResponse(
        {
          ok: false,
          error: 'UNSUPPORTED_FORMAT',
          hint: 'Поддерживаются файлы CSV, XLSX, XLS и PDF.',
        },
        { status: 400 }
      );
    }
    return jsonResponse({ ok: false, error: msg }, { status: 400 });
  }
}
