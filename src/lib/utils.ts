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
    ["havana club 3 года", "Гавана Клуб 3 года"],
    ["captain morgan spiced gold", "Капитан Морган Спайсд Голд"],
    ["bacardi carta blanca", "Бакарди Карта Бланка"],
    ["the kraken black spiced", "Кракен Блэк Спайсд"],
    ["kraken black spiced", "Кракен Блэк Спайсд"],
    ["zacapa 23", "Закапа 23"],
    ["russian standard", "Русский Стандарт"],
    ["beluga noble", "Белуга Нобл"],
    ["absolut", "Абсолют"],
    ["finlandia", "Финляндия"],
    ["grey goose", "Грей Гус"],
    ["beefeater", "Бифитер"],
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
    ["balvenie 12 doublewood", "Балвени 12 ДаблВуд"],
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
    return result.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const normalizeKey = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");

function translateNameOnly(name: string): string {
  if (!name) return '';
  const normalized = normalizeKey(name);
  if (productNameTranslations.has(normalized)) {
      return productNameTranslations.get(normalized)!;
  }
  
  const hasLatin = (s: string) => /[A-Za-z]/.test(s);
  if (hasLatin(name)) {
      return fallbackTransliterate(name);
  }

  return name;
}


function normalizeInput(s: string) {
  return (s ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "") // zero-width
    .replace(/[\u00A0\u202F\u2007]/g, " ")       // NBSP/тонкие пробелы
    .trim();
}

// расширенный unit: мл|ml|мl|mл, и т.п.
const VOLUME_RE =
  /(?:^|[\s(])(\d+(?:[.,]\d+)?)\s*((?:мл|ml|[mм][lл])|(?:л|l)|(?:cl|[cс][lл]))(?=$|[\s)\],.])/giu;

export function extractVolume(original: string): { baseName: string; volumeMl?: number } {
  const s = normalizeInput(original);
  let lastMl: number | undefined;

  for (const m of s.matchAll(VOLUME_RE)) {
    const numRaw = (m[1] ?? "").replace(",", ".");
    const unitRaw = (m[2] ?? "").toLowerCase();
    const value = Number(numRaw);
    if (!Number.isFinite(value)) continue;

    const unit =
      /^(мл|ml|[mм][lл])$/.test(unitRaw) ? "ml" :
      /^(л|l)$/.test(unitRaw) ? "l" :
      "cl";

    if (unit === "ml") lastMl = Math.round(value);
    else if (unit === "l") lastMl = Math.round(value * 1000);
    else lastMl = Math.round(value * 10);
  }

  const baseName = s.replace(VOLUME_RE, " ").replace(/\s+/g, " ").trim();
  return { baseName, volumeMl: lastMl };
}


export function buildProductDisplayName(originalName: string, bottleVolumeMl?: number | null): string {
  const { baseName, volumeMl: fromName } = extractVolume(originalName);
  const translatedName = translateNameOnly(baseName);

  const volumeMl = bottleVolumeMl ?? fromName;
  
  return volumeMl ? `${translatedName} ${volumeMl} мл` : translatedName;
}

export const translateProductName = buildProductDisplayName;


export const productCategories: ProductCategory[] = ['Whiskey', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Liqueur', 'Wine', 'Beer', 'Brandy', 'Vermouth', 'Absinthe', 'Bitters', 'Premix', 'Syrup', 'Other'];

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
    Premix: [],
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
        case 'Premix': return 'Примиксы и заготовки';
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
    
    if (subCategory === 'White' && !translations[subCategory]) {
       return 'Белое/Белый';
    }

    return translations[subCategory] || subCategory;
}

export function dedupeProductsByName(products: Product[]): Product[] {
  const map = new Map<string, Product>();

  const normalizeForDedupe = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/мл/g, 'ml');

  for (const item of products) {
    const key = `${normalizeForDedupe(item.name)}:${item.bottleVolumeMl}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    if (item.isActive && !existing.isActive) {
      map.set(key, item);
      continue;
    }
    
    if (item.isActive === existing.isActive) {
        const existingTime = existing.updatedAt?.toMillis?.() ?? 0;
        const itemTime = item.updatedAt?.toMillis?.() ?? 0;
        if (itemTime > existingTime) {
            map.set(key, item);
        }
    }
  }

  return Array.from(map.values());
}
