import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InventorySessionStatus, ProductCategory, ProductSubCategory, WhiskeySubCategory, RumSubCategory, GinSubCategory, WineSubCategory, BeerSubCategory } from "./types";

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

export function translateStatus(status: InventorySessionStatus): string {
    switch (status) {
        case 'completed':
            return 'Завершено';
        case 'in_progress':
            return 'В процессе';
        case 'draft':
            return 'Черновик';
        default:
            return status;
    }
}

export const productCategories: ProductCategory[] = ['Whiskey', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Liqueur', 'Wine', 'Beer', 'Syrup', 'Other'];

export const productSubCategories: Record<ProductCategory, ProductSubCategory[]> = {
    Whiskey: ['Scotch', 'Irish', 'Bourbon', 'Japanese', 'Other'],
    Rum: ['White', 'Gold', 'Dark', 'Spiced', 'Other'],
    Gin: ['London Dry', 'Old Tom', 'Plymouth', 'Other'],
    Wine: ['Red', 'White', 'Rose', 'Sparkling', 'Other'],
    Beer: ['Lager', 'Ale', 'Stout', 'IPA', 'Other'],
    Vodka: [],
    Tequila: [],
    Liqueur: [],
    Syrup: [],
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
        case 'Dark': 'Темный';
        case 'Spiced': return 'Пряный';
        
        // Gin
        case 'London Dry': return 'London Dry';
        case 'Old Tom': return 'Old Tom';
        case 'Plymouth': return 'Plymouth';

        // Wine
        case 'Red': return 'Красное';
        case 'White': return 'Белое';
        case 'Rose': return 'Розовое';
        case 'Sparkling': return 'Игристое';

        // Beer
        case 'Lager': return 'Лагер';
        case 'Ale': return 'Эль';
        case 'Stout': return 'Стаут';
        case 'IPA': return 'IPA';

        case 'Other': return 'Другое';
        default: return subCategory;
    }
}
