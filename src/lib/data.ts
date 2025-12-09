import type { User, Product, InventorySession, InventorySessionStatus, ProductCategory, InventoryLine } from '@/lib/types';

export const mockUser: User = {
  id: 'user-1',
  displayName: 'Admin',
  email: 'admin@barboss.com',
  role: 'admin',
};

export const mockProducts: Product[] = [
  { id: 'prod-1', name: 'Jameson 0.7L', category: 'Whiskey', bottleVolumeMl: 700, costPerBottle: 25, sellingPricePerPortion: 7, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-2', name: 'Havana Club 3 Anos 0.7L', category: 'Rum', bottleVolumeMl: 700, costPerBottle: 18, sellingPricePerPortion: 6, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-3', name: 'Absolut Vodka 1L', category: 'Vodka', bottleVolumeMl: 1000, costPerBottle: 22, sellingPricePerPortion: 6.5, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-4', name: 'Beefeater Gin 0.7L', category: 'Gin', bottleVolumeMl: 700, costPerBottle: 20, sellingPricePerPortion: 6, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-5', name: 'Olmeca Blanco 0.7L', category: 'Tequila', bottleVolumeMl: 700, costPerBottle: 23, sellingPricePerPortion: 7, portionVolumeMl: 40, isActive: false, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-6', name: 'Campari 1L', category: 'Liqueur', bottleVolumeMl: 1000, costPerBottle: 19, sellingPricePerPortion: 5, portionVolumeMl: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-7', name: 'Coca-Cola 0.2L', category: 'Other', bottleVolumeMl: 200, costPerBottle: 0.5, sellingPricePerPortion: 2, portionVolumeMl: 200, isActive: true, createdAt: new Date(), updatedAt: new Date() },
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
