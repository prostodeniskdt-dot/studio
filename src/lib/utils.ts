import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InventorySessionStatus, ProductCategory } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD') {
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

export function translateCategory(category: ProductCategory): string {
    switch (category) {
        case 'Whiskey':
            return 'Виски';
        case 'Rum':
            return 'Ром';
        case 'Vodka':
            return 'Водка';
        case 'Gin':
            return 'Джин';
        case 'Tequila':
            return 'Текила';
        case 'Liqueur':
            return 'Ликер';
        case 'Wine':
            return 'Вино';
        case 'Beer':
            return 'Пиво';
        case 'Syrup':
            return 'Сироп';
        case 'Other':
            return 'Другое';
        default:
            return category;
    }
}
