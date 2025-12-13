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
    ["jameson", "Джемесон"],
    ["jack daniel's", "Джек Дэниэлс"],
    ["macallan 12 double cask", "Макаллан 12 Дабл Каск"],
    ["chivas regal 12", "Чивас Ригал 12"],
    ["maker's mark", "Мэйкерс Марк"],
    ["havana club 3 anos", "Гавана Клуб 3 года"],
    ["captain morgan spiced gold", "Капитан Морган Спайсд Голд"],
    ["bacardi carta blanca", "Бакарди Карта Бланка"],
    ["the kraken black spiced", "Кракен Блэк Спайсд"],
    ["zacapa 23", "Закапа 23"],
    ["russian standard", "Русский Стандарт"],
    ["beluga noble", "Белуга Нобл"],
    ["absolut", "Абсолют"],
    ["finlandia", "Финляндия"],
    ["grey goose", "Грей Гус"],
    ["beefeater london dry", "Бифитер Лондон Драй"],
    ["hendrick's", "Хендрикс"],
    ["bombay sapphire", "Бомбей Сапфир"],
    ["tanqueray london dry", "Танкерей Лондон Драй"],
    ["roku", "Року"],
    ["olmeca blanco", "Ольмека Бланко"],
    ["patron silver", "Патрон Сильвер"],
    ["sauza silver", "Сауза Сильвер"],
    ["jose cuervo especial silver", "Хосе Куэрво Эспесиаль Сильвер"],
    ["don julio blanco", "Дон Хулио Бланко"],
    ["aperol", "Апероль"],
    ["baileys original", "Бейлис Ориджинал"],
    ["jagermeister", "Егермейстер"],
    ["cointreau", "Куантро"],
    ["campari", "Кампари"],
    ["house red wine", "Вино красное (дом)"],
    ["house white wine", "Вино белое (дом)"],
    ["prosecco (basic)", "Просекко (базовое)"],
    ["draft light beer", "Пиво светлое (кран)"],
    ["hoegaarden witbier", "Хугарден Витбир"],
    ["guinness draught", "Гиннесс Драфт"],
    ["ararat 5 stars", "Арарат 5 звезд"],
    ["hennessy v.s", "Хеннесси V.S"],
    ["martini bianco", "Мартини Бьянко"],
    ["martini rosso", "Мартини Россо"],
    ["grenadine syrup", "Сироп Гренадин"],
    ["sugar syrup", "Сахарный сироп"],
    ["angostura bitters", "Ангостура Биттер"],
    ["xenta absenta", "Ксента Абсента"],
    ["monkey shoulder", "Манки Шолдер"],
    ["suntory toki", "Сантори Токи"],
    ["the balvenie 12 doublewood", "Зе Балвени 12 ДаблВуд"],
    ["glenfiddich 12", "Гленфиддик 12"],
    ["nikka from the barrel", "Никка Фром зе Баррел"],
    ["connemara peated", "Коннемара Питед"],
]);

export function translateProductName(name: string): string {
    const normalizedName = name.trim().toLowerCase();
    return productNameTranslations.get(normalizedName) || name;
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
        'Gold': 'Золотой',
        'Dark': 'Темный',
        'Spiced': 'Пряный',
        
        // Gin
        'London Dry': 'Лондонский сухой',
        'Old Tom': 'Старый Том',
        'Plymouth': 'Плимут',

        // Wine
        'Red': 'Красное',
        'White': 'Белое',
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
