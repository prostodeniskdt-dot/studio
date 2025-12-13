import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InventorySessionStatus, ProductCategory, ProductSubCategory, BrandySubCategory, VermouthSubCategory, UserRole, PurchaseOrderStatus, Product } from "./types";

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

const productNameTranslations = new Map<string, string>([
    ["Jameson", "Джемесон"],
    ["Jack Daniel's", "Джек Дэниэлс"],
    ["Macallan 12 Double Cask", "Макаллан 12 Дабл Каск"],
    ["Chivas Regal 12", "Чивас Ригал 12"],
    ["Maker's Mark", "Мэйкерс Марк"],
    ["Havana Club 3 Anos", "Гавана Клуб 3 года"],
    ["Captain Morgan Spiced Gold", "Капитан Морган Спайсд Голд"],
    ["Bacardi Carta Blanca", "Бакарди Карта Бланка"],
    ["The Kraken Black Spiced", "Кракен Блэк Спайсд"],
    ["Zacapa 23", "Закапа 23"],
    ["Russian Standard", "Русский Стандарт"],
    ["Beluga Noble", "Белуга Нобл"],
    ["Absolut", "Абсолют"],
    ["Finlandia", "Финляндия"],
    ["Grey Goose", "Грей Гус"],
    ["Beefeater London Dry", "Бифитер Лондон Драй"],
    ["Hendrick's", "Хендрикс"],
    ["Bombay Sapphire", "Бомбей Сапфир"],
    ["Tanqueray London Dry", "Танкерей Лондон Драй"],
    ["Roku", "Року"],
    ["Olmeca Blanco", "Ольмека Бланко"],
    ["Patron Silver", "Патрон Сильвер"],
    ["Sauza Silver", "Сауза Сильвер"],
    ["Jose Cuervo Especial Silver", "Хосе Куэрво Эспесиаль Сильвер"],
    ["Don Julio Blanco", "Дон Хулио Бланко"],
    ["Aperol", "Апероль"],
    ["Baileys Original", "Бейлис Ориджинал"],
    ["Jagermeister", "Егермейстер"],
    ["Cointreau", "Куантро"],
    ["Campari", "Кампари"],
    ["House Red Wine", "Вино красное (дом)"],
    ["House White Wine", "Вино белое (дом)"],
    ["Prosecco (Basic)", "Просекко (базовое)"],
    ["Draft Light Beer", "Пиво светлое (кран)"],
    ["Hoegaarden Witbier", "Хугарден Витбир"],
    ["Guinness Draught", "Гиннесс Драфт"],
    ["Ararat 5 Stars", "Арарат 5 звезд"],
    ["Hennessy V.S", "Хеннесси V.S"],
    ["Martini Bianco", "Мартини Бьянко"],
    ["Martini Rosso", "Мартини Россо"],
    ["Grenadine Syrup", "Сироп Гренадин"],
    ["Sugar Syrup", "Сахарный сироп"],
    ["Angostura Bitters", "Ангостура Биттер"],
    ["Xenta Absenta", "Ксента Абсента"],
]);

export function translateProductName(name: string): string {
    return productNameTranslations.get(name) || name;
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
    const translations: Record<string, string> = {
        // Whiskey
        'Scotch': 'Шотландский',
        'Irish': 'Ирландский',
        'Bourbon': 'Бурбон',
        'Japanese': 'Японский',
        
        // Rum
        'White': 'Белый / Белое',
        'Gold': 'Золотой',
        'Dark': 'Темный',
        'Spiced': 'Пряный',
        
        // Gin
        'London Dry': 'Лондонский сухой',
        'Old Tom': 'Старый Том',
        'Plymouth': 'Плимут',

        // Wine
        'Red': 'Красное',
        'Rose': 'Розовое',
        'Sparkling': 'Игристое',

        // Beer
        'Lager': 'Лагер',
        'Ale': 'Эль',
        'Stout': 'Стаут',
        'IPA': 'IPA',

        // Brandy
        'Cognac': 'Коньяк',
        'Armagnac': 'Арманьяк',
        'Calvados': 'Кальвадос',

        // Vermouth
        'Dry': 'Сухой',
        'Sweet': 'Сладкий',
        'Bianco': 'Бьянко',

        'Other': 'Другое',
        'uncategorized': 'Без подкатегории',
    };

    return translations[subCategory] || subCategory;
}

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function dedupeProductsByName(products: Product[]): Product[] {
  const map = new Map<string, Product>();

  for (const item of products) {
    const key = normalize(item.name);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    // Strategy: active is better than inactive.
    const existingScore = (existing.isActive ? 10 : 0);
    const itemScore = (item.isActive ? 10 : 0);
    
    if (itemScore > existingScore) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}
