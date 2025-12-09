import type { User, Product, InventorySession, InventoryLine } from '@/lib/types';

export const mockUser: User = {
  id: 'user-1',
  displayName: 'Admin',
  email: 'admin@barboss.com',
  role: 'admin',
};

export const mockProducts: Product[] = [
  { id: 'prod-1', name: 'Jameson 0.7L', category: 'Whiskey', bottleVolumeMl: 700, costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1150, emptyBottleWeightG: 450, bottleHeightCm: 30 },
  { id: 'prod-2', name: 'Havana Club 3 Anos 0.7L', category: 'Rum', bottleVolumeMl: 700, costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1120, emptyBottleWeightG: 420, bottleHeightCm: 29 },
  { id: 'prod-3', name: 'Absolut Vodka 1L', category: 'Vodka', bottleVolumeMl: 1000, costPerBottle: 1600, sellingPricePerPortion: 280, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1500, emptyBottleWeightG: 500, bottleHeightCm: 32 },
  { id: 'prod-4', name: 'Beefeater Gin 0.7L', category: 'Gin', bottleVolumeMl: 700, costPerBottle: 1700, sellingPricePerPortion: 320, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1180, emptyBottleWeightG: 480, bottleHeightCm: 28 },
  { id: 'prod-5', name: 'Olmeca Blanco 0.7L', category: 'Tequila', bottleVolumeMl: 700, costPerBottle: 2000, sellingPricePerPortion: 400, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1200, emptyBottleWeightG: 500, bottleHeightCm: 27 },
  { id: 'prod-6', name: 'Campari 1L', category: 'Liqueur', bottleVolumeMl: 1000, costPerBottle: 1900, sellingPricePerPortion: 250, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1650, emptyBottleWeightG: 650, bottleHeightCm: 31 },
  { id: 'prod-7', name: 'Jack Daniel\'s 1L', category: 'Whiskey', bottleVolumeMl: 1000, costPerBottle: 2500, sellingPricePerPortion: 450, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1550, emptyBottleWeightG: 550, bottleHeightCm: 31 },
  { id: 'prod-8', name: 'Sauza Silver 1L', category: 'Tequila', bottleVolumeMl: 1000, costPerBottle: 2100, sellingPricePerPortion: 380, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1510, emptyBottleWeightG: 510, bottleHeightCm: 33 },
  { id: 'prod-9', name: 'Baileys Original 0.7L', category: 'Liqueur', bottleVolumeMl: 700, costPerBottle: 1600, sellingPricePerPortion: 300, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 1250, emptyBottleWeightG: 550, bottleHeightCm: 26 },
  { id: 'prod-10', name: 'Beluga Noble 0.5L', category: 'Vodka', bottleVolumeMl: 500, costPerBottle: 1200, sellingPricePerPortion: 350, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date(), fullBottleWeightG: 950, emptyBottleWeightG: 450, bottleHeightCm: 28 },
  { id: 'prod-11', name: 'Coca-Cola 0.2L', category: 'Other', bottleVolumeMl: 200, costPerBottle: 40, sellingPricePerPortion: 100, portionVolumeMl: 200, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-12', name: 'Архивный продукт', category: 'Other', bottleVolumeMl: 500, costPerBottle: 500, sellingPricePerPortion: 150, portionVolumeMl: 50, isActive: false, createdAt: new Date(), updatedAt: new Date() }
];

const generateMockLines = (): InventoryLine[] => {
    return mockProducts.filter(p => p.isActive).map(p => {
        const startStock = Math.random() * p.bottleVolumeMl * 3; // 0 to 3 bottles
        const purchases = Math.random() > 0.7 ? p.bottleVolumeMl * Math.ceil(Math.random() * 2) : 0;
        const sales = Math.floor(Math.random() * 30); // 0 to 30 portions sold
        const theoreticalEndStock = startStock + purchases - (sales * p.portionVolumeMl);
        // Introduce some variance
        const variance = (Math.random() - 0.5) * p.portionVolumeMl; // +/- half a portion
        const endStock = Math.max(0, theoreticalEndStock + variance);

        return {
            id: `line-${p.id}`,
            productId: p.id,
            product: p,
            startStock: Math.round(startStock),
            purchases: Math.round(purchases),
            sales: sales,
            endStock: Math.round(endStock),
        };
    });
}

export const mockInventorySessions: InventorySession[] = [
  {
    id: 'session-1',
    name: 'Nightly Count - Main Bar',
    status: 'completed',
    createdByUserId: 'user-1',
    createdAt: new Date('2024-07-20T23:00:00Z'),
    closedAt: new Date('2024-07-21T01:00:00Z'),
    lines: generateMockLines()
  },
  {
    id: 'session-2',
    name: 'Weekly Stocktake - July W3',
    status: 'in_progress',
    createdByUserId: 'user-1',
    createdAt: new Date('2024-07-21T10:00:00Z'),
    lines: generateMockLines()
  },
  {
    id: 'session-3',
    name: 'End of Month - June',
    status: 'completed',
    createdByUserId: 'user-1',
    createdAt: new Date('2024-06-30T23:00:00Z'),
    closedAt: new Date('2024-07-01T02:30:00Z'),
    lines: generateMockLines()
  },
  {
    id: 'session-4',
    name: 'Emergency Check - Spillage',
    status: 'draft',
    createdByUserId: 'user-1',
    createdAt: new Date(),
    lines: []
  },
];
