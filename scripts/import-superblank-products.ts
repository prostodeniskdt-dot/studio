import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(process.cwd(), '.env.local'), override: true });

/**
 * Импорт из INNVENTsuperblanc894S v.4.2.xlsx:
 * - «СУПЕР БЛАНК» — наименование, масса пустой (кол. 8), плотность (кол. 10)
 * - «Table 1» — код номенклатуры, уточнение объёма/плотности
 *
 * Полная масса бутылки (г) = пустая (г) + объём (мл) × плотность (г/мл).
 *
 *   npx tsx scripts/import-superblank-products.ts [--dry-run] [--bar-id=...]
 */
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/db';
import type { ProductCategory } from '@prisma/client';

const XLSX_FILENAME = 'INNVENTsuperblanc894S v.4.2.xlsx';
const SHEET_SUPER = 'СУПЕР БЛАНК';
const SHEET_TABLE1 = 'Table 1';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const barIdArg = args.find((a) => a.startsWith('--bar-id='))?.split('=')[1];

function findXlsxPath(): string {
  const cands = [
    path.join(process.cwd(), XLSX_FILENAME),
    path.join(process.cwd(), '..', XLSX_FILENAME),
  ];
  const hit = cands.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`Файл не найден: ${XLSX_FILENAME}`);
  return hit;
}

function parseFloatLoose(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(s: string): string {
  return s.replace(/©/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cleanDisplayName(s: string): string {
  return s.replace(/©/g, '').replace(/\s+/g, ' ').trim();
}

function parseVolumeMlFromName(name: string): number | null {
  const n = name.replace(/©/g, '').trim();
  const multi = n.match(/(\d+)\s*[×x]\s*(\d+)\s*мл/i);
  if (multi) return parseFloat(multi[1]) * parseFloat(multi[2]);
  // Десятичные литры (0,7 л): без \b после «л» — в JS \b не граница для кириллицы.
  const liter = n.match(/(\d+)[,.](\d+)\s*(?:л|l)/i);
  if (liter) {
    const whole = parseInt(liter[1], 10);
    const frac = liter[2];
    return (whole + parseInt(frac, 10) / 10 ** frac.length) * 1000;
  }
  // Целые литры: не брать последнюю цифру из «0,7 л» (иначе 7 л → 7000 мл).
  const literInt = n.match(/(?<![,.])(\d+)\s*(?:л|l)(?=[\s,)]|$)/i);
  if (literInt) return parseInt(literInt[1], 10) * 1000;
  const ml = n.match(/(\d+(?:[,.]\d+)?)\s*мл/i);
  if (ml) return parseFloat(ml[1].replace(',', '.'));
  const tailDec = n.match(/(\d+)[,.](\d+)\s*$/);
  if (tailDec && !/мл/i.test(n)) {
    const whole = parseInt(tailDec[1], 10);
    const frac = tailDec[2];
    if (whole <= 2 && frac.length <= 2) {
      return (whole + parseInt(frac, 10) / 10 ** frac.length) * 1000;
    }
  }
  return null;
}

function mapNameHintsToCategory(name: string): ProductCategory | null {
  const p = name.toLowerCase();
  if (/вермут|vermouth|долин|dolin|шамбери|chambery|forcalquier|кокки.*американо/i.test(p))
    return 'Vermouth';
  if (/карпано.*биттер|carpano.*bitter/i.test(p)) return 'Bitters';
  if (/мартини/i.test(p) && !/биттер|bitter/i.test(p)) return 'Vermouth';
  if (/карпано|carpano|драй де прованс/i.test(p)) return 'Vermouth';
  if (/джин\b/i.test(p)) return 'Gin';
  if (/водк/i.test(p)) return 'Vodka';
  if (/виски|whiskey|bourbon|скотч/i.test(p)) return 'Whiskey';
  if (/\bром\b|\brum\b/i.test(p)) return 'Rum';
  if (/текил|мескаль/i.test(p)) return 'Tequila';
  if (/биттер|bitter|амаро|campari/i.test(p)) return 'Bitters';
  if (/ликёр|ликер|liqueur|самбук|аперол/i.test(p)) return 'Liqueur';
  if (/коньяк|кальвадос|арманьяк/i.test(p)) return 'Brandy';
  if (/вино|wine|шампан|игрист|шардоне/i.test(p)) return 'Wine';
  if (/пиво|beer|cidre|сидр/i.test(p)) return 'Beer';
  if (/сироп|syrup/i.test(p)) return 'Syrup';
  if (/абсент/i.test(p)) return 'Absinthe';
  if (/премик|заготов/i.test(p)) return 'Premix';
  return null;
}

function parseDensity(v: unknown): number | null {
  const n = parseFloatLoose(v);
  if (n === null) return null;
  if (n > 0.5 && n < 2) return n;
  return null;
}

function parseEmptyWeightG(v: unknown): number | null {
  const n = parseFloatLoose(v);
  if (n === null) return null;
  if (n > 0 && n < 5) return Math.round(n * 1000);
  if (n >= 100 && n < 5000) return Math.round(n);
  return null;
}

function mapGroupToCategory(group: string): ProductCategory {
  const g = group.toLowerCase();
  if (/вермут/i.test(g)) return 'Vermouth';
  if (/биттер|амаро/i.test(g)) return 'Bitters';
  if (/аперитив/i.test(g)) return 'Liqueur';
  if (/джин/i.test(g)) return 'Gin';
  if (/водк/i.test(g)) return 'Vodka';
  if (/виски|виск|скотч|бурбон/i.test(g)) return 'Whiskey';
  if (/ром\b|rum/i.test(g)) return 'Rum';
  if (/текил/i.test(g)) return 'Tequila';
  if (/коньяк|бренди|кальвадос|арманьяк/i.test(g)) return 'Brandy';
  if (/ликер|лікёр|liqu/i.test(g)) return 'Liqueur';
  if (/вино|wine|шампан|игрист/i.test(g)) return 'Wine';
  if (/пиво|beer|cider|сидр/i.test(g)) return 'Beer';
  if (/сироп|syrup/i.test(g)) return 'Syrup';
  if (/абсент/i.test(g)) return 'Absinthe';
  if (/премик|premix|заготов/i.test(g)) return 'Premix';
  return 'Other';
}

type Table1Extra = {
  externalCode?: string;
  emptyG?: number | null;
  density?: number | null;
  volumeMl?: number | null;
};

function parseTable1Enrichment(wb: XLSX.WorkBook): Map<string, Table1Extra> {
  const m = new Map<string, Table1Extra>();
  const sh = wb.Sheets[SHEET_TABLE1];
  if (!sh) return m;

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sh, {
    header: 1,
    defval: '',
    raw: false,
  });

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const name = cleanDisplayName(String(r[1] ?? ''));
    if (!name || name.length < 2) continue;

    const key = normalizeName(name);
    const codeRaw = String(r[0] ?? '').trim();
    const externalCode = codeRaw.length > 0 ? codeRaw : undefined;

    const emptyG = parseEmptyWeightG(r[9]);
    const density = parseDensity(r[11]);
    const volStr = String(r[10] ?? '');

    let volumeMl = parseVolumeMlFromName(name);
    const lit = volStr.match(/(\d+)[,.](\d+)/);
    if (!volumeMl && lit) {
      volumeMl =
        (parseInt(lit[1], 10) + parseInt(lit[2], 10) / 10 ** lit[2].length) * 1000;
    }

    const prev = m.get(key) ?? {};
    m.set(key, {
      externalCode: externalCode ?? prev.externalCode,
      emptyG: emptyG ?? prev.emptyG,
      density: density ?? prev.density,
      volumeMl: volumeMl ?? prev.volumeMl,
    });
  }

  return m;
}

type ParsedRow = {
  categoryLabel: string;
  name: string;
  emptyRaw: number | null;
  density: number | null;
  externalCode?: string;
  volumeMlOverride?: number | null;
};

function parseSuperBlank(wb: XLSX.WorkBook): ParsedRow[] {
  const sh = wb.Sheets[SHEET_SUPER];
  if (!sh) throw new Error(`Лист «${SHEET_SUPER}» не найден`);
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sh, {
    header: 1,
    defval: '',
    raw: false,
  });
  const out: ParsedRow[] = [];
  let categoryLabel = '';

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const c0 = String(r[0] ?? '').trim();
    if (!c0) continue;

    const numsInRow = [2, 3, 4, 5, 6, 7, 8, 9].some((j) => {
      const v = r[j];
      return v !== '' && v !== null && String(v).match(/[0-9]/);
    });

    const emptyCell = parseFloatLoose(r[7]);
    const c2 = String(r[2] ?? '').trim();
    const c3 = String(r[3] ?? '').trim();

    const looksLikeSection =
      c0.length > 2 &&
      !numsInRow &&
      (emptyCell === null || emptyCell === 0) &&
      !c2 &&
      !c3;

    if (looksLikeSection) {
      categoryLabel = c0;
      continue;
    }

    if (c0.length < 2) continue;

    out.push({
      categoryLabel,
      name: cleanDisplayName(c0),
      emptyRaw: parseFloatLoose(r[7]),
      density: parseDensity(r[9]),
    });
  }

  return out;
}

function mergeTable1(rows: ParsedRow[], enrich: Map<string, Table1Extra>): ParsedRow[] {
  return rows.map((row) => {
    const ex = enrich.get(normalizeName(row.name));
    if (!ex) return row;

    let emptyRaw = row.emptyRaw;
    if (ex.emptyG != null) {
      emptyRaw = ex.emptyG / 1000;
    }

    return {
      ...row,
      externalCode: ex.externalCode ?? row.externalCode,
      emptyRaw,
      density: ex.density ?? row.density,
      volumeMlOverride: ex.volumeMl ?? row.volumeMlOverride,
    };
  });
}

function computeWeights(
  name: string,
  emptyRaw: number | null,
  density: number | null,
  volumeMlOverride: number | null | undefined
): { bottleVolumeMl: number; emptyG: number | null; fullG: number | null } {
  const bottleVolumeMl = volumeMlOverride ?? parseVolumeMlFromName(name) ?? 700;
  const emptyG = parseEmptyWeightG(emptyRaw);
  let fullG: number | null = null;
  if (emptyG !== null && density !== null && bottleVolumeMl > 0) {
    fullG = Math.round(emptyG + bottleVolumeMl * density);
  }
  return { bottleVolumeMl, emptyG, fullG };
}

function dedupeRows(rows: ParsedRow[]): ParsedRow[] {
  const m = new Map<string, ParsedRow>();
  for (const row of rows) {
    m.set(normalizeName(row.name), row);
  }
  return [...m.values()];
}

async function main() {
  const xlsxPath = findXlsxPath();
  console.log('Файл:', xlsxPath);

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const enrich = parseTable1Enrichment(wb);
  console.log('Ключей из «Table 1»:', enrich.size);

  let parsed = parseSuperBlank(wb);
  parsed = mergeTable1(parsed, enrich);
  parsed = dedupeRows(parsed);
  console.log('Уникальных продуктов:', parsed.length);

  let barId = barIdArg ?? null;
  if (!barId) {
    const bar = await prisma.bar.findFirst({ orderBy: { createdAt: 'asc' } });
    barId = bar?.id ?? null;
  }
  if (!barId) {
    console.error('Нет бара в БД. Создайте бара или укажите --bar-id=');
    process.exit(1);
  }
  console.log('barId:', barId);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let dryShown = 0;

  for (const row of parsed) {
    const category =
      mapNameHintsToCategory(row.name) ?? mapGroupToCategory(row.categoryLabel);
    const { bottleVolumeMl, emptyG, fullG } = computeWeights(
      row.name,
      row.emptyRaw,
      row.density,
      row.volumeMlOverride ?? undefined
    );

    const existing = await prisma.product.findFirst({
      where: {
        barId,
        isActive: true,
        name: { equals: row.name, mode: 'insensitive' },
      },
    });

    if (DRY) {
      if (dryShown < 12) {
        console.log('[dry]', row.name.slice(0, 52), {
          category,
          code: row.externalCode,
          bottleVolumeMl,
          emptyG,
          fullG,
        });
        dryShown++;
      }
      continue;
    }

    if (existing) {
      const patch: {
        emptyBottleWeightG?: number;
        fullBottleWeightG?: number;
        bottleVolumeMl?: number;
        category?: ProductCategory;
        externalCode?: string | null;
      } = {};

      if (emptyG !== null) patch.emptyBottleWeightG = emptyG;
      if (fullG !== null) patch.fullBottleWeightG = fullG;
      if (Math.abs(existing.bottleVolumeMl - bottleVolumeMl) > 0.5) {
        patch.bottleVolumeMl = bottleVolumeMl;
      }
      if (existing.category === 'Other' && category !== 'Other') patch.category = category;
      if (row.externalCode && !existing.externalCode) patch.externalCode = row.externalCode;

      if (Object.keys(patch).length > 0) {
        await prisma.product.update({ where: { id: existing.id }, data: patch });
        updated++;
      } else {
        skipped++;
      }
    } else {
      await prisma.product.create({
        data: {
          name: row.name,
          category,
          bottleVolumeMl,
          emptyBottleWeightG: emptyG ?? undefined,
          fullBottleWeightG: fullG ?? undefined,
          externalCode: row.externalCode ?? undefined,
          isActive: true,
          usesVolumeCalculator: true,
          isInLibrary: false,
          barId,
        },
      });
      created++;
    }
  }

  if (DRY) {
    console.log('Dry-run. Показано строк:', dryShown, 'из', parsed.length);
  } else {
    console.log(`Готово: создано ${created}, обновлено ${updated}, без изменений ${skipped}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
