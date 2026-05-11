import { prisma } from '../src/lib/db';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ProductCategory } from '@prisma/client';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(process.cwd(), '.env.local'), override: true });

async function main() {
  const candidates = [
    path.join(process.cwd(), 'Таблица.pdf'),
    path.join(process.cwd(), 'table.pdf'),
    path.join(process.cwd(), 'Таблица', 'Таблица.pdf'),
  ];

  let pdfPath: string | null = null;
  for (const p of candidates) {
    try {
      await fs.access(p);
      pdfPath = p;
      break;
    } catch {
      // ignore
    }
  }

  if (!pdfPath) {
    throw new Error(
      `Не найден файл с таблицей. Положите PDF в корень проекта как "Таблица.pdf" (или "table.pdf").`,
    );
  }

  const require = createRequire(import.meta.url);
  const pdfParse = require('pdf-parse') as unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = pdfParse as any;
  const PDFParseCtor = mod?.PDFParse;
  if (typeof PDFParseCtor !== 'function') {
    throw new Error('Не удалось инициализировать pdf-parse (не найден класс PDFParse).');
  }

  const verbosity = mod?.VerbosityLevel?.ERRORS ?? 0;
  const parser = new PDFParseCtor({ verbosity, url: pdfPath });
  await parser.load();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textResult: any = await parser.getText();
  const text: string =
    typeof textResult === 'string'
      ? textResult
      : typeof textResult?.text === 'string'
        ? textResult.text
        : '';
  if (!text) throw new Error('PDF прочитан, но текст извлечь не удалось.');

  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  type Row = {
    name: string;
    category: ProductCategory;
    bottleVolumeMl: number;
    emptyBottleWeightG: number | null;
  };

  const categoryMap: Array<{ ru: string; category: ProductCategory }> = [
    { ru: 'шотландский виски', category: ProductCategory.Whiskey },
    { ru: 'ирландский', category: ProductCategory.Whiskey },
    { ru: 'бурбон', category: ProductCategory.Whiskey },
    { ru: 'виски', category: ProductCategory.Whiskey },
    { ru: 'водка', category: ProductCategory.Vodka },
    { ru: 'ром', category: ProductCategory.Rum },
    { ru: 'джин', category: ProductCategory.Gin },
    { ru: 'текила', category: ProductCategory.Tequila },
    { ru: 'ликёр', category: ProductCategory.Liqueur },
    { ru: 'коньяк', category: ProductCategory.Brandy },
    { ru: 'бренди', category: ProductCategory.Brandy },
    { ru: 'вермут', category: ProductCategory.Vermouth },
    { ru: 'вино', category: ProductCategory.Wine },
    { ru: 'пиво', category: ProductCategory.Beer },
    { ru: 'сироп', category: ProductCategory.Syrup },
    { ru: 'биттер', category: ProductCategory.Bitters },
    { ru: 'абсент', category: ProductCategory.Absinthe },
  ].sort((a, b) => b.ru.length - a.ru.length);

  function parseIntSafe(s: string): number | null {
    const n = Number.parseInt(s.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }

  function parseRow(line: string): Row | null {
    if (
      line === 'Таблица' ||
      line.startsWith('Название напитка') ||
      /^--\s*\d+\s*of\s*\d+\s*--$/i.test(line)
    ) {
      return null;
    }

    // Expect "... <volume> мл <weight> г"
    const m = line.match(/^(.*)\s+(\d+)\s*мл\s+(\d+)\s*г$/i);
    if (!m) return null;

    const left = m[1].trim();
    const bottleVolumeMl = parseIntSafe(m[2]);
    const emptyBottleWeightG = parseIntSafe(m[3]);
    if (!bottleVolumeMl) return null;

    const lower = left.toLowerCase();
    let chosen: (typeof categoryMap)[number] | null = null;
    for (const c of categoryMap) {
      if (lower.endsWith(c.ru)) {
        chosen = c;
        break;
      }
    }

    if (!chosen) {
      // fallback: last token is category
      const parts = left.split(/\s+/g);
      if (parts.length < 2) return null;
      const fallbackCategory = parts.at(-1)!.toLowerCase();
      const matched = categoryMap.find((c) => c.ru === fallbackCategory);
      chosen = matched ?? { ru: fallbackCategory, category: ProductCategory.Other };
    }

    const name = left.slice(0, left.length - chosen.ru.length).trim();
    if (!name) return null;

    return {
      name,
      category: chosen.category,
      bottleVolumeMl,
      emptyBottleWeightG: emptyBottleWeightG ?? null,
    };
  }

  const rows: Row[] = [];
  for (const line of lines) {
    const r = parseRow(line);
    if (r) rows.push(r);
  }

  const dedup = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.name}__${r.category}__${r.bottleVolumeMl}`;
    if (!dedup.has(key)) dedup.set(key, r);
  }

  const want = [...dedup.values()];

  const existing = await prisma.product.findMany({
    where: { isInLibrary: true, barId: null },
    select: { name: true, category: true, bottleVolumeMl: true },
  });
  const existingSet = new Set(existing.map((p) => `${p.name}__${p.category}__${p.bottleVolumeMl}`));

  const toCreate = want.filter((r) => !existingSet.has(`${r.name}__${r.category}__${r.bottleVolumeMl}`));

  if (toCreate.length > 0) {
    await prisma.product.createMany({
      data: toCreate.map((r) => ({
        name: r.name,
        category: r.category,
        bottleVolumeMl: r.bottleVolumeMl,
        emptyBottleWeightG: r.emptyBottleWeightG,
        isInLibrary: true,
        barId: null,
        usesVolumeCalculator: true,
      })),
    });
  }

  console.log(
    `Импорт таблицы: распознано строк=${rows.length}, уникальных=${want.length}, добавлено=${toCreate.length}, уже было=${want.length - toCreate.length}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

