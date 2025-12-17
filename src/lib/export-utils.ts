import * as XLSX from 'xlsx';
import type { CalculatedInventoryLine, InventorySession } from './types';
import { translateProductName } from './utils';
import { Timestamp } from 'firebase/firestore';

type ExportTotals = {
  totalCost: number;
  totalRevenue: number;
  totalVariance: number;
  totalLoss: number;
  totalSurplus: number;
};

/**
 * Exports inventory report to Excel format
 */
export function exportToExcel(
  session: InventorySession,
  lines: CalculatedInventoryLine[],
  totals: ExportTotals
): void {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Prepare data for main sheet
  const mainData = [
    // Header row
    [
      'Продукт',
      'Начало (мл)',
      'Покупки (мл)',
      'Продажи (порции)',
      'Теор. конец (мл)',
      'Факт. конец (мл)',
      'Разница (мл)',
      'Разница (руб.)',
      'Разница (%)',
    ],
    // Data rows
    ...lines.map(line => [
      line.product ? translateProductName(line.product.name, line.product.bottleVolumeMl) : '',
      line.startStock,
      line.purchases,
      line.sales,
      Math.round(line.theoreticalEndStock),
      line.endStock,
      Math.round(line.differenceVolume),
      parseFloat(line.differenceMoney.toFixed(2)),
      parseFloat(line.differencePercent.toFixed(2)),
    ]),
    // Empty row
    [],
    // Totals row
    [
      'ИТОГО',
      '',
      '',
      '',
      '',
      '',
      '',
      parseFloat(totals.totalVariance.toFixed(2)),
      '',
    ],
  ];

  // Create main sheet
  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);

  // Set column widths
  mainSheet['!cols'] = [
    { wch: 30 }, // Product name
    { wch: 12 }, // Start stock
    { wch: 12 }, // Purchases
    { wch: 15 }, // Sales
    { wch: 15 }, // Theoretical end
    { wch: 12 }, // Actual end
    { wch: 12 }, // Difference volume
    { wch: 15 }, // Difference money
    { wch: 12 }, // Difference percent
  ];

  // Style header row (bold)
  const headerRange = XLSX.utils.decode_range(mainSheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!mainSheet[cellAddress]) continue;
    mainSheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E0E0E0' } },
    };
  }

  // Style totals row (bold)
  const totalsRowIndex = lines.length + 1;
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
    if (!mainSheet[cellAddress]) continue;
    mainSheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'F0F0F0' } },
    };
  }

  // Add main sheet to workbook
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Данные');

  // Create summary sheet
  const summaryData = [
    ['Сводка по инвентаризации'],
    [],
    ['Название сессии', session.name],
    ...(session.closedAt ? [[
      'Дата закрытия',
      (() => {
        const closedAt: any = session.closedAt!;
        try {
          if (closedAt && typeof closedAt === 'object' && 'toDate' in closedAt && typeof closedAt.toDate === 'function') {
            return closedAt.toDate().toLocaleDateString('ru-RU');
          }
          if (closedAt instanceof Date) {
            return closedAt.toLocaleDateString('ru-RU');
          }
          return String(closedAt);
        } catch {
          return String(closedAt);
        }
      })(),
    ]] : []),
    [],
    ['Показатель', 'Значение'],
    ['Общее отклонение', totals.totalVariance],
    ['Общая выручка', totals.totalRevenue],
    ['Общая себестоимость', totals.totalCost],
    [
      'Pour Cost %',
      totals.totalRevenue > 0
        ? parseFloat(((totals.totalCost / totals.totalRevenue) * 100).toFixed(2))
        : 0,
    ],
    ['Общие потери', totals.totalLoss],
    ['Общие излишки', totals.totalSurplus],
    ].filter((row): row is (string | number)[] => row !== undefined) as (string | number)[][];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

  // Style summary header
  summarySheet['A1'].s = { font: { bold: true, sz: 14 } };
  summarySheet['A6'].s = { font: { bold: true } };
  summarySheet['B6'].s = { font: { bold: true } };

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка');

  // Generate file name
  const fileName = `barboss_report_${session.name.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, fileName);
}
