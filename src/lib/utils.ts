import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InventorySessionStatus, ProductCategory, ProductSubCategory, BrandySubCategory, VermouthSubCategory, UserRole, PurchaseOrderStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'RUB') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function translateStatus(status: InventorySessionStatus | PurchaseOrderStatus): string {
    switch (status) {
        // Inventory Session
        case 'completed':
            return 'Завершено';
        case 'in_progress':
            return 'В процессе';
        case 'draft':
            return 'Черновик';

        // Purchase Order
        case 'ordered':
            return 'Заказан';
        case 'partially_received':
            return 'Частично получен';
        case 'received':
            return 'Получен';
        case 'cancelled':
            return 'Отменен';
        default:
            return status;
    }
}

export function translateRole(role: UserRole): string {
    switch (role) {
        case 'admin':
            return 'Администратор';
        case 'manager':
            return 'Менеджер';
        case 'bartender':
            return 'Бармен';
        default:
            return role;
    }
}

export const productCategories: ProductCategory[] = ['Whiskey', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Liqueur', 'Wine', 'Beer', 'Brandy', 'Vermouth', 'Absinthe', 'Bitters', 'Syrup', 'Other'];

export const productSubCategories: Record<ProductCategory, ProductSubCategory[]> = {
    Whiskey: ['Scotch', 'Irish', 'Bourbon', 'Japanese', 'Other'],
    Rum: ['White', 'Gold', 'Dark', 'Spiced', 'Other'],
    Gin: ['London Dry', 'Old Tom', 'Plymouth', 'Other'],
    Wine: ['Red', 'White', 'Rose', 'Sparkling', 'Other'],
    Beer: ['Lager', 'Ale', 'Stout', 'IPA', 'Other'],
    Brandy: ['Cognac', 'Armagnac', 'Calvados', 'Other'],
    Vermouth: ['Dry', 'Sweet', 'Bianco', 'Other'],
    Vodka: [],
    Tequila: [],
    Liqueur: [],
    Syrup: [],
    Absinthe: [],
    Bitters: [],
    Other: []
};


export function translateCategory(category: ProductCategory): string {
    switch (category) {
        case 'Whiskey': return 'Виски';
        case 'Rum': return 'Ром';
        case 'Vodka': return 'Водка';
        case 'Gin': return 'Джин';
        case 'Tequila': return 'Текила';
        case 'Liqueur': return 'Ликер';
        case 'Wine': return 'Вино';
        case 'Beer': return 'Пиво';
        case 'Syrup': return 'Сироп';
        case 'Brandy': return 'Бренди';
        case 'Vermouth': return 'Вермут';
        case 'Absinthe': return 'Абсент';
        case 'Bitters': return 'Биттер';
        case 'Other': return 'Другое';
        default: return category;
    }
}

export function translateSubCategory(subCategory: ProductSubCategory): string {
    switch (subCategory) {
        // Whiskey
        case 'Scotch': return 'Шотландский';
        case 'Irish': return 'Ирландский';
        case 'Bourbon': return 'Бурбон';
        case 'Japanese': return 'Японский';
        
        // Rum
        case 'White': return 'Белый';
        case 'Gold': return 'Золотой';
        case 'Dark': return 'Темный';
        case 'Spiced': return 'Пряный';
        
        // Gin
        case 'London Dry': return 'London Dry';
        case 'Old Tom': return 'Old Tom';
        case 'Plymouth': return 'Plymouth';

        // Wine
        case 'Red': return 'Красное';
        // White is already a case for Rum
        // case 'White': return 'Белое';
        case 'Rose': return 'Розовое';
        case 'Sparkling': return 'Игристое';

        // Beer
        case 'Lager': return 'Лагер';
        case 'Ale': return 'Эль';
        case 'Stout': return 'Стаут';
        case 'IPA': return 'IPA';

        // Brandy
        case 'Cognac': return 'Коньяк';
        case 'Armagnac': return 'Арманьяк';
        case 'Calvados': return 'Кальвадос';

        // Vermouth
        case 'Dry': return 'Сухой';
        case 'Sweet': return 'Сладкий';
        case 'Bianco': return 'Бьянко';

        case 'Other': return 'Другое';
        default: return subCategory;
    }
}
