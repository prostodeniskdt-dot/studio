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
    ["cinzano rosso", "Чинзано Россо"],
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

const translitMap: { [key: string]: string } = {
    'a': 'а', 'b': 'б', 'c': 'к', 'd': 'д', 'e': 'е', 'f': 'ф', 'g': 'г',
    'h': 'х', 'i': 'и', 'j': 'дж', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н',
    'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
    'v': 'в', 'w': 'в', 'x': 'кс', 'y': 'й', 'z': 'з',
    'ch': 'ч', 'sh': 'ш', 'sch': 'щ', 'yo': 'ё', 'zh': 'ж', 'ju': 'ю', 'ja': 'я',
    'kh': 'х', 'ts': 'ц', 'yu': 'ю', 'ya': 'я', 'ie': 'ие',
};

function fallbackTransliterate(text: string): string {
    let result = '';
    text = text.toLowerCase();
    let i = 0;
    while (i < text.length) {
        const threeChar = text.substring(i, i + 3);
        const twoChar = text.substring(i, i + 2);
        
        if (translitMap[threeChar]) {
            result += translitMap[threeChar];
            i += 3;
        } else if (translitMap[twoChar]) {
            result += translitMap[twoChar];
            i += 2;
        } 
        else if (translitMap[text[i]]) {
            result += translitMap[text[i]];
            i += 1;
        } 
        else {
            result += text[i];
            i += 1;
        }
    }
    // Capitalize first letter of each word
    return result.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");

export function translateProductName(name: string, volume?: number): string {
    if (!name) return '';

    // Remove volume from name if it exists, to normalize it for dictionary lookup
    const nameWithoutVolume = name.replace(/\s*\d+\s?(мл|ml)\s*$/i, '').trim();

    // First, try to get a direct translation from the dictionary
    const normalizedName = normalize(nameWithoutVolume);
    let translated = productNameTranslations.get(normalizedName);

    // If no translation found, use fallback transliteration
    if (!translated) {
        translated = fallbackTransliterate(nameWithoutVolume);
    }
    
    // Now, handle the volume part
    if (volume) {
        const volumeString = `${volume}мл`;
        // Check if the translated name *already* contains a volume string that matches.
        // This is a simple check and might not cover all edge cases but handles the primary issue.
        if (!translated.includes(volumeString)) {
             return `${translated} ${volumeString}`;
        }
    }

    // If volume is not provided, or if it's already in the name, return the translated name
    // This might also mean returning just the name if the original input had the volume.
    // A better approach is to rely on the passed `volume` parameter.
    const hasVolumeInOriginal = /\s*\d+\s?(мл|ml)\s*$/i.test(name);
    if(hasVolumeInOriginal && !volume) {
        return translated + " " + name.match(/\s*\d+\s?(мл|ml)\s*$/i)?.[0].trim();
    }
    
    if(!volume) return translated;

    return `${translated} ${volume}мл`;
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
        'White': 'Белый',
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
    
    if (subCategory === 'White') {
       // This is ambiguous, can be for Wine or Rum. Assuming context is handled elsewhere.
       // For now, a generic translation.
       return 'Белое/Белый';
    }

    return translations[subCategory] || subCategory;
}

export function dedupeProductsByName(products: Product[]): Product[] {
  const map = new Map<string, Product>();

  const normalizeForDedupe = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/мл/g, 'ml');

  for (const item of products) {
    // Use a composite key of normalized name and bottle volume to determine uniqueness.
    const key = `${normalizeForDedupe(item.name)}:${item.bottleVolumeMl}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    // If an item with the same name and volume exists, prefer the active one.
    if (item.isActive && !existing.isActive) {
      map.set(key, item);
    }
    // If both are active or both inactive, prefer the one most recently updated.
    else if (item.isActive === existing.isActive) {
        const existingTime = existing.updatedAt?.toMillis?.() ?? 0;
        const itemTime = item.updatedAt?.toMillis?.() ?? 0;
        if (itemTime > existingTime) {
            map.set(key, item);
        }
    }
  }

  return Array.from(map.values());
}
