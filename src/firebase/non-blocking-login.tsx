'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getAuth,
  UserCredential,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch, getDoc, getDocs, collection, query, limit, Timestamp, where, collectionGroup } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Product, InventorySession, InventoryLine, ProductCategory, ProductSubCategory } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { calculateLineFields } from '@/lib/calculations';
import { productCategories, productSubCategories } from '@/lib/utils';
import { logger } from '@/lib/logger';

type ProductSeedData = Omit<Product, 'createdAt' | 'updatedAt'>;

function getInitialProductData(): ProductSeedData[] {
    const getImage = (id: string) => PlaceHolderImages.find(p => p.id.toLowerCase() === id.toLowerCase())?.imageUrl ?? PlaceHolderImages.find(p => p.id === 'other')!.imageUrl;

    return [
      { id: 'prod_whiskey_01', name: 'Джемесон', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_02', name: 'Джек Дэниэлс', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2000, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_03', name: 'Макаллан 12 Дабл Каск', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 7000, sellingPricePerPortion: 1000, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_04', name: 'Чивас Ригал 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 3500, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_05', name: 'Мэйкерс Марк', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2800, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1250, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_rum_01', name: 'Гавана Клуб 3 года', category: 'Rum', subCategory: 'White', costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1120, emptyBottleWeightG: 420, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_02', name: 'Капитан Морган Спайсд Голд', category: 'Rum', subCategory: 'Spiced', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_03', name: 'Бакарди Карта Бланка', category: 'Rum', subCategory: 'White', costPerBottle: 1400, sellingPricePerPortion: 290, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1150, emptyBottleWeightG: 400, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_04', name: 'Кракен Блэк Спайсд', category: 'Rum', subCategory: 'Spiced', costPerBottle: 2500, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_05', name: 'Закапа 23', category: 'Rum', subCategory: 'Dark', costPerBottle: 5000, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_vodka_01', name: 'Русский Стандарт', category: 'Vodka', costPerBottle: 1000, sellingPricePerPortion: 250, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1100, emptyBottleWeightG: 400, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_02', name: 'Белуга Нобл', category: 'Vodka', costPerBottle: 1800, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1250, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_03', name: 'Абсолют', category: 'Vodka', costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_04', name: 'Финляндия', category: 'Vodka', costPerBottle: 1400, sellingPricePerPortion: 280, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_05', name: 'Грей Гус', category: 'Vodka', costPerBottle: 2500, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1200, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_gin_01', name: 'Бифитер Лондон Драй', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_02', name: 'Хендрикс', category: 'Gin', costPerBottle: 3000, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1300, emptyBottleWeightG: 600, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_03', name: 'Бомбей Сапфир', category: 'Gin', subCategory: 'London Dry', costPerBottle: 2200, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1200, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_04', name: 'Танкерей Лондон Драй', category: 'Gin', subCategory: 'London Dry', costPerBottle: 2100, sellingPricePerPortion: 390, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_05', name: 'Року', category: 'Gin', costPerBottle: 3200, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_tequila_01', name: 'Ольмека Бланко', category: 'Tequila', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_02', name: 'Патрон Сильвер', category: 'Tequila', costPerBottle: 4000, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1300, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_03', name: 'Сауза Сильвер', category: 'Tequila', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_04', name: 'Хосе Куэрво Эспесиаль Сильвер', category: 'Tequila', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_05', name: 'Дон Хулио Бланко', category: 'Tequila', costPerBottle: 3500, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1250, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_liqueur_01', name: 'Апероль', category: 'Liqueur', costPerBottle: 1300, sellingPricePerPortion: 280, portionVolumeMl: 50, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_02', name: 'Бейлис Ориджинал', category: 'Liqueur', costPerBottle: 2200, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_03', name: 'Егермейстер', category: 'Liqueur', costPerBottle: 2100, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_04', name: 'Куантро', category: 'Liqueur', costPerBottle: 2500, sellingPricePerPortion: 400, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1220, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_05', name: 'Кампари', category: 'Liqueur', costPerBottle: 1600, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 1000, fullBottleWeightG: 1600, emptyBottleWeightG: 600, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_wine_01', name: 'Вино красное (дом)', category: 'Wine', subCategory: 'Red', costPerBottle: 900, sellingPricePerPortion: 250, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1250, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_02', name: 'Вино белое (дом)', category: 'Wine', subCategory: 'White', costPerBottle: 900, sellingPricePerPortion: 250, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1250, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_03', name: 'Просекко (базовое)', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 1200, sellingPricePerPortion: 300, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1300, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_beer_01', name: 'Пиво светлое (кран)', category: 'Beer', subCategory: 'Lager', costPerBottle: 150, sellingPricePerPortion: 300, portionVolumeMl: 500, bottleVolumeMl: 1000, fullBottleWeightG: 1550, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_02', name: 'Хугарден Витбир', category: 'Beer', subCategory: 'Ale', costPerBottle: 250, sellingPricePerPortion: 400, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 850, emptyBottleWeightG: 350, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_03', name: 'Гиннесс Драфт', category: 'Beer', subCategory: 'Stout', costPerBottle: 300, sellingPricePerPortion: 450, portionVolumeMl: 440, bottleVolumeMl: 440, fullBottleWeightG: 780, emptyBottleWeightG: 340, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_brandy_01', name: 'Арарат 5 звезд', category: 'Brandy', costPerBottle: 1500, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 950, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_02', name: 'Хеннесси V.S', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 3500, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_vermouth_01', name: 'Мартини Бьянко', category: 'Vermouth', costPerBottle: 1100, sellingPricePerPortion: 200, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1500, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_02', name: 'Мартини Россо', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1100, sellingPricePerPortion: 200, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1550, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_syrup_01', name: 'Сироп Гренадин', category: 'Syrup', costPerBottle: 800, sellingPricePerPortion: 50, portionVolumeMl: 10, bottleVolumeMl: 1000, fullBottleWeightG: 1800, emptyBottleWeightG: 800, isActive: true, imageUrl: getImage('syrup') },
      { id: 'prod_syrup_02', name: 'Сахарный сироп', category: 'Syrup', costPerBottle: 700, sellingPricePerPortion: 30, portionVolumeMl: 10, bottleVolumeMl: 1000, fullBottleWeightG: 1800, emptyBottleWeightG: 800, isActive: true, imageUrl: getImage('syrup') },
      { id: 'prod_bitters_01', name: 'Ангостура Биттер', category: 'Bitters', costPerBottle: 1500, sellingPricePerPortion: 30, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 450, emptyBottleWeightG: 250, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_absinthe_01', name: 'Ксента Абсента', category: 'Absinthe', costPerBottle: 2800, sellingPricePerPortion: 450, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('absinthe') },
      
      // Whiskey новые (06-20)
      { id: 'prod_whiskey_06', name: 'Джонни Уокер Блэк Лейбл', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 4200, sellingPricePerPortion: 650, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_07', name: 'Джонни Уокер Ред Лейбл', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 2200, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_08', name: 'Гленфиддик 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 3800, sellingPricePerPortion: 580, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1175, emptyBottleWeightG: 475, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_09', name: 'Джеймсон Блэк Баррел', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 3200, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1185, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_10', name: 'Джим Бим', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 1500, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_11', name: 'Уайлд Тёрки 101', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2400, sellingPricePerPortion: 420, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1155, emptyBottleWeightG: 455, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_12', name: 'Ямазаки 12', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 12000, sellingPricePerPortion: 1500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1250, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_13', name: 'Нобл Рота', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 3500, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_14', name: 'Баллантайнс Файненст', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1145, emptyBottleWeightG: 445, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_15', name: 'Уильям Лоусонс', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1600, sellingPricePerPortion: 330, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1135, emptyBottleWeightG: 435, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_16', name: 'Джек Дэниэлс Хони', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2400, sellingPricePerPortion: 440, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_17', name: 'Буффало Трейс', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 3200, sellingPricePerPortion: 520, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1240, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_18', name: 'Далмор 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 5500, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_19', name: 'Краун Роял', category: 'Whiskey', subCategory: 'Other', costPerBottle: 2600, sellingPricePerPortion: 460, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('whiskey') },
      { id: 'prod_whiskey_20', name: 'Катти Сарк', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('whiskey') },
      
      // Rum новые (06-20)
      { id: 'prod_rum_06', name: 'Бакарди Голд', category: 'Rum', subCategory: 'Gold', costPerBottle: 1450, sellingPricePerPortion: 295, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_07', name: 'Малибу', category: 'Rum', subCategory: 'White', costPerBottle: 1300, sellingPricePerPortion: 280, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1125, emptyBottleWeightG: 425, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_08', name: 'Майерс Ром Ориджинал Дарк', category: 'Rum', subCategory: 'Dark', costPerBottle: 2200, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_09', name: 'Монте Альбан Бланко', category: 'Rum', subCategory: 'White', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_10', name: 'Дон Кихот', category: 'Rum', subCategory: 'White', costPerBottle: 1200, sellingPricePerPortion: 270, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1115, emptyBottleWeightG: 415, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_11', name: 'Морган Спайсд Ром', category: 'Rum', subCategory: 'Spiced', costPerBottle: 1650, sellingPricePerPortion: 325, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1135, emptyBottleWeightG: 435, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_12', name: 'Анехо', category: 'Rum', subCategory: 'Dark', costPerBottle: 2800, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_13', name: 'Рон Бругал Анехо', category: 'Rum', subCategory: 'Dark', costPerBottle: 3200, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_14', name: 'Гослингс Блэк Сил', category: 'Rum', subCategory: 'Dark', costPerBottle: 2900, sellingPricePerPortion: 460, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1230, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_15', name: 'Апплтон Эстейт', category: 'Rum', subCategory: 'Gold', costPerBottle: 2400, sellingPricePerPortion: 410, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1155, emptyBottleWeightG: 455, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_16', name: 'Ламбс Вайт', category: 'Rum', subCategory: 'White', costPerBottle: 1350, sellingPricePerPortion: 285, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1128, emptyBottleWeightG: 428, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_17', name: 'Барбадос Ром', category: 'Rum', subCategory: 'Gold', costPerBottle: 2100, sellingPricePerPortion: 370, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1145, emptyBottleWeightG: 445, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_18', name: 'Плантационерс', category: 'Rum', subCategory: 'Dark', costPerBottle: 3500, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_19', name: 'Фло Де Кана', category: 'Rum', subCategory: 'Gold', costPerBottle: 2600, sellingPricePerPortion: 430, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1165, emptyBottleWeightG: 465, isActive: true, imageUrl: getImage('rum') },
      { id: 'prod_rum_20', name: 'Эль Дорадо', category: 'Rum', subCategory: 'Dark', costPerBottle: 3800, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1215, emptyBottleWeightG: 515, isActive: true, imageUrl: getImage('rum') },
      
      // Vodka новые (06-20)
      { id: 'prod_vodka_06', name: 'Смирнофф', category: 'Vodka', costPerBottle: 1200, sellingPricePerPortion: 270, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1120, emptyBottleWeightG: 420, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_07', name: 'Столичная', category: 'Vodka', costPerBottle: 900, sellingPricePerPortion: 240, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 950, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_08', name: 'Белуга Голд', category: 'Vodka', costPerBottle: 2500, sellingPricePerPortion: 520, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1270, emptyBottleWeightG: 570, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_09', name: 'Хлебный Дар', category: 'Vodka', costPerBottle: 800, sellingPricePerPortion: 230, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 920, emptyBottleWeightG: 420, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_10', name: 'Белуга Аллюр', category: 'Vodka', costPerBottle: 3200, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1300, emptyBottleWeightG: 600, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_11', name: 'Русский Стандарт Платинум', category: 'Vodka', costPerBottle: 2200, sellingPricePerPortion: 420, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_12', name: 'Пять Озер', category: 'Vodka', costPerBottle: 1100, sellingPricePerPortion: 260, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_13', name: 'Царская', category: 'Vodka', costPerBottle: 1600, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_14', name: 'Столичная Премиум', category: 'Vodka', costPerBottle: 1300, sellingPricePerPortion: 290, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1145, emptyBottleWeightG: 445, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_15', name: 'Белуга', category: 'Vodka', costPerBottle: 2000, sellingPricePerPortion: 410, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1260, emptyBottleWeightG: 560, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_16', name: 'Русский Стандарт Голд', category: 'Vodka', costPerBottle: 1800, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_17', name: 'Столичная Особая', category: 'Vodka', costPerBottle: 950, sellingPricePerPortion: 245, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 960, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_18', name: 'Кристалл', category: 'Vodka', costPerBottle: 1050, sellingPricePerPortion: 265, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1125, emptyBottleWeightG: 425, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_19', name: 'Русский Стандарт Империал', category: 'Vodka', costPerBottle: 3500, sellingPricePerPortion: 650, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1280, emptyBottleWeightG: 580, isActive: true, imageUrl: getImage('vodka') },
      { id: 'prod_vodka_20', name: 'Белуга Кристалл', category: 'Vodka', costPerBottle: 2800, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1290, emptyBottleWeightG: 590, isActive: true, imageUrl: getImage('vodka') },
      
      // Gin новые (06-20)
      { id: 'prod_gin_06', name: 'Гордонс', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1500, sellingPricePerPortion: 310, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_07', name: 'Плимут Джин', category: 'Gin', subCategory: 'Plymouth', costPerBottle: 2800, sellingPricePerPortion: 480, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_08', name: 'Танкерей Рангер', category: 'Gin', costPerBottle: 2600, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1165, emptyBottleWeightG: 465, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_09', name: 'Монки 47', category: 'Gin', costPerBottle: 3500, sellingPricePerPortion: 580, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 1050, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_10', name: 'Бомбей Брамбл', category: 'Gin', subCategory: 'London Dry', costPerBottle: 2400, sellingPricePerPortion: 420, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1155, emptyBottleWeightG: 455, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_11', name: 'Танкерей Силкен', category: 'Gin', costPerBottle: 2900, sellingPricePerPortion: 490, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1185, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_12', name: 'Хендрикс Муглет', category: 'Gin', costPerBottle: 3800, sellingPricePerPortion: 620, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1310, emptyBottleWeightG: 610, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_13', name: 'Бифитер Премиум', category: 'Gin', subCategory: 'London Dry', costPerBottle: 2300, sellingPricePerPortion: 410, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1175, emptyBottleWeightG: 475, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_14', name: 'Танкерей Стар Оф Кейптаун', category: 'Gin', costPerBottle: 2700, sellingPricePerPortion: 470, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_15', name: 'Бомбей Сапфир Ист', category: 'Gin', subCategory: 'London Dry', costPerBottle: 2500, sellingPricePerPortion: 440, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1210, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_16', name: 'Гордонс Премиум Пинк', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1800, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1145, emptyBottleWeightG: 445, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_17', name: 'Хендрикс Орбитум', category: 'Gin', costPerBottle: 4200, sellingPricePerPortion: 680, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1320, emptyBottleWeightG: 620, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_18', name: 'Бифитер Бурл', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1900, sellingPricePerPortion: 370, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_19', name: 'Танкерей Но 10', category: 'Gin', subCategory: 'London Dry', costPerBottle: 3100, sellingPricePerPortion: 530, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('gin') },
      { id: 'prod_gin_20', name: 'Бомбей Сапфир Эстейт', category: 'Gin', subCategory: 'London Dry', costPerBottle: 3300, sellingPricePerPortion: 560, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('gin') },
      
      // Tequila новые (06-20)
      { id: 'prod_tequila_06', name: 'Хосе Куэрво Голд', category: 'Tequila', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_07', name: 'Эсполон Бланко', category: 'Tequila', costPerBottle: 2200, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_08', name: 'Касамигос Бланко', category: 'Tequila', costPerBottle: 4500, sellingPricePerPortion: 700, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1320, emptyBottleWeightG: 570, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_09', name: 'Дон Хулио Репосадо', category: 'Tequila', costPerBottle: 4200, sellingPricePerPortion: 650, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1270, emptyBottleWeightG: 570, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_10', name: 'Херрадура Сильвер', category: 'Tequila', costPerBottle: 2800, sellingPricePerPortion: 480, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_11', name: 'Анхело', category: 'Tequila', costPerBottle: 2400, sellingPricePerPortion: 430, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_12', name: 'Хосе Куэрво 1800', category: 'Tequila', costPerBottle: 3000, sellingPricePerPortion: 510, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_13', name: 'Миллагра Рохо', category: 'Tequila', costPerBottle: 2100, sellingPricePerPortion: 390, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1175, emptyBottleWeightG: 475, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_14', name: 'Сауза Репосадо', category: 'Tequila', costPerBottle: 1850, sellingPricePerPortion: 355, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1165, emptyBottleWeightG: 465, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_15', name: 'Дон Хулио Анехо', category: 'Tequila', costPerBottle: 5000, sellingPricePerPortion: 750, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1280, emptyBottleWeightG: 580, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_16', name: 'Патрон Репосадо', category: 'Tequila', costPerBottle: 4500, sellingPricePerPortion: 680, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1310, emptyBottleWeightG: 560, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_17', name: 'Эсполон Репосадо', category: 'Tequila', costPerBottle: 2500, sellingPricePerPortion: 440, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1185, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_18', name: 'Хосе Куэрво Традисиональ', category: 'Tequila', costPerBottle: 3200, sellingPricePerPortion: 540, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1220, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_19', name: 'Касамигос Репосадо', category: 'Tequila', costPerBottle: 4800, sellingPricePerPortion: 720, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1330, emptyBottleWeightG: 580, isActive: true, imageUrl: getImage('tequila') },
      { id: 'prod_tequila_20', name: 'Херрадура Анехо', category: 'Tequila', costPerBottle: 3600, sellingPricePerPortion: 580, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1230, emptyBottleWeightG: 530, isActive: true, imageUrl: getImage('tequila') },
      
      // Liqueur новые (06-20)
      { id: 'prod_liqueur_06', name: 'Кампари Биттер', category: 'Liqueur', costPerBottle: 1650, sellingPricePerPortion: 310, portionVolumeMl: 40, bottleVolumeMl: 1000, fullBottleWeightG: 1620, emptyBottleWeightG: 620, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_07', name: 'Амаретто Дисарронно', category: 'Liqueur', costPerBottle: 2300, sellingPricePerPortion: 390, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_08', name: 'Ликер Блю Кюрасао', category: 'Liqueur', costPerBottle: 1500, sellingPricePerPortion: 290, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_09', name: 'Шартрез Желтый', category: 'Liqueur', costPerBottle: 3500, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_10', name: 'Шартрез Зеленый', category: 'Liqueur', costPerBottle: 3800, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_11', name: 'Бенедиктин', category: 'Liqueur', costPerBottle: 3200, sellingPricePerPortion: 520, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_12', name: 'Гранд Марнье', category: 'Liqueur', costPerBottle: 2800, sellingPricePerPortion: 460, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_13', name: 'Коинтро', category: 'Liqueur', costPerBottle: 2600, sellingPricePerPortion: 440, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_14', name: 'Ликер Малибу', category: 'Liqueur', costPerBottle: 1400, sellingPricePerPortion: 285, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1125, emptyBottleWeightG: 425, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_15', name: 'Ликер Амаретто', category: 'Liqueur', costPerBottle: 1700, sellingPricePerPortion: 330, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1145, emptyBottleWeightG: 445, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_16', name: 'Ликер Самбука', category: 'Liqueur', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_17', name: 'Бейлис Стробери', category: 'Liqueur', costPerBottle: 2400, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_18', name: 'Апероль Спириц', category: 'Liqueur', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 50, bottleVolumeMl: 700, fullBottleWeightG: 1205, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_19', name: 'Ликер Трипл Сек', category: 'Liqueur', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('liqueur') },
      { id: 'prod_liqueur_20', name: 'Ликер Персико', category: 'Liqueur', costPerBottle: 2000, sellingPricePerPortion: 370, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1170, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('liqueur') },
      
      // Wine новые (04-20)
      { id: 'prod_wine_04', name: 'Шампанское Просекко', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 1500, sellingPricePerPortion: 350, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1320, emptyBottleWeightG: 570, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_05', name: 'Вино красное Каберне', category: 'Wine', subCategory: 'Red', costPerBottle: 1100, sellingPricePerPortion: 280, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1260, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_06', name: 'Вино белое Совиньон', category: 'Wine', subCategory: 'White', costPerBottle: 1050, sellingPricePerPortion: 270, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1255, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_07', name: 'Вино розовое', category: 'Wine', subCategory: 'Rose', costPerBottle: 1000, sellingPricePerPortion: 260, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1240, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_08', name: 'Шампанское Моэт', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 4000, sellingPricePerPortion: 700, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1400, emptyBottleWeightG: 650, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_09', name: 'Вино красное Мерло', category: 'Wine', subCategory: 'Red', costPerBottle: 1150, sellingPricePerPortion: 290, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1265, emptyBottleWeightG: 515, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_10', name: 'Вино белое Шардоне', category: 'Wine', subCategory: 'White', costPerBottle: 1080, sellingPricePerPortion: 275, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1260, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_11', name: 'Шампанское Дом Периньон', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 8000, sellingPricePerPortion: 1200, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1450, emptyBottleWeightG: 700, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_12', name: 'Вино красное Пино Нуар', category: 'Wine', subCategory: 'Red', costPerBottle: 1200, sellingPricePerPortion: 300, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1270, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_13', name: 'Вино белое Пино Гриджо', category: 'Wine', subCategory: 'White', costPerBottle: 1100, sellingPricePerPortion: 285, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1265, emptyBottleWeightG: 515, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_14', name: 'Просекко Асти', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 1300, sellingPricePerPortion: 320, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1310, emptyBottleWeightG: 560, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_15', name: 'Вино розовое Просекко', category: 'Wine', subCategory: 'Rose', costPerBottle: 1150, sellingPricePerPortion: 295, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1255, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_16', name: 'Вино красное Сира', category: 'Wine', subCategory: 'Red', costPerBottle: 1250, sellingPricePerPortion: 310, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1275, emptyBottleWeightG: 525, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_17', name: 'Вино белое Рислинг', category: 'Wine', subCategory: 'White', costPerBottle: 1120, sellingPricePerPortion: 290, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1268, emptyBottleWeightG: 518, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_18', name: 'Шампанское Вдова Клико', category: 'Wine', subCategory: 'Sparkling', costPerBottle: 3500, sellingPricePerPortion: 600, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1380, emptyBottleWeightG: 630, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_19', name: 'Вино красное Малабек', category: 'Wine', subCategory: 'Red', costPerBottle: 1180, sellingPricePerPortion: 295, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1263, emptyBottleWeightG: 513, isActive: true, imageUrl: getImage('wine') },
      { id: 'prod_wine_20', name: 'Вино белое Мюскат', category: 'Wine', subCategory: 'White', costPerBottle: 1090, sellingPricePerPortion: 280, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1258, emptyBottleWeightG: 508, isActive: true, imageUrl: getImage('wine') },
      
      // Beer новые (04-20)
      { id: 'prod_beer_04', name: 'Корона Экстра', category: 'Beer', subCategory: 'Lager', costPerBottle: 180, sellingPricePerPortion: 320, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 820, emptyBottleWeightG: 320, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_05', name: 'Хайнекен', category: 'Beer', subCategory: 'Lager', costPerBottle: 200, sellingPricePerPortion: 350, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 830, emptyBottleWeightG: 330, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_06', name: 'Старый Мельник', category: 'Beer', subCategory: 'Lager', costPerBottle: 120, sellingPricePerPortion: 280, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 810, emptyBottleWeightG: 310, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_07', name: 'Стелла Артуа', category: 'Beer', subCategory: 'Lager', costPerBottle: 220, sellingPricePerPortion: 370, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 835, emptyBottleWeightG: 335, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_08', name: 'Балтика 7', category: 'Beer', subCategory: 'Lager', costPerBottle: 130, sellingPricePerPortion: 290, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 815, emptyBottleWeightG: 315, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_09', name: 'Хуппенбрау', category: 'Beer', subCategory: 'Lager', costPerBottle: 240, sellingPricePerPortion: 390, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 840, emptyBottleWeightG: 340, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_10', name: 'Саммигуэль', category: 'Beer', subCategory: 'Lager', costPerBottle: 190, sellingPricePerPortion: 340, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 825, emptyBottleWeightG: 325, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_11', name: 'Леффе Блонд', category: 'Beer', subCategory: 'Ale', costPerBottle: 280, sellingPricePerPortion: 420, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 860, emptyBottleWeightG: 360, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_12', name: 'Килкенни Айриш Ред', category: 'Beer', subCategory: 'Ale', costPerBottle: 260, sellingPricePerPortion: 410, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 850, emptyBottleWeightG: 350, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_13', name: 'Гиннесс Экспорт Стаут', category: 'Beer', subCategory: 'Stout', costPerBottle: 320, sellingPricePerPortion: 470, portionVolumeMl: 440, bottleVolumeMl: 440, fullBottleWeightG: 785, emptyBottleWeightG: 345, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_14', name: 'Корон Айпа', category: 'Beer', subCategory: 'IPA', costPerBottle: 300, sellingPricePerPortion: 460, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 855, emptyBottleWeightG: 355, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_15', name: 'Стелла Артуа Унфилтерд', category: 'Beer', subCategory: 'Lager', costPerBottle: 250, sellingPricePerPortion: 400, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 845, emptyBottleWeightG: 345, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_16', name: 'Балтика 9', category: 'Beer', subCategory: 'Lager', costPerBottle: 140, sellingPricePerPortion: 295, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 820, emptyBottleWeightG: 320, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_17', name: 'Хайнекен Лагер', category: 'Beer', subCategory: 'Lager', costPerBottle: 210, sellingPricePerPortion: 360, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 832, emptyBottleWeightG: 332, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_18', name: 'Блю Мун', category: 'Beer', subCategory: 'Ale', costPerBottle: 270, sellingPricePerPortion: 415, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 852, emptyBottleWeightG: 352, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_19', name: 'Хуппенбрау Ориджинал', category: 'Beer', subCategory: 'Lager', costPerBottle: 230, sellingPricePerPortion: 380, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 837, emptyBottleWeightG: 337, isActive: true, imageUrl: getImage('beer') },
      { id: 'prod_beer_20', name: 'Гиннесс Драфт в банке', category: 'Beer', subCategory: 'Stout', costPerBottle: 310, sellingPricePerPortion: 465, portionVolumeMl: 440, bottleVolumeMl: 440, fullBottleWeightG: 782, emptyBottleWeightG: 342, isActive: true, imageUrl: getImage('beer') },
      
      // Brandy новые (03-20)
      { id: 'prod_brandy_03', name: 'Мартель VS', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 3800, sellingPricePerPortion: 580, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_04', name: 'Реми Мартен VSOP', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 5000, sellingPricePerPortion: 750, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1230, emptyBottleWeightG: 530, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_05', name: 'Арарат 3 звезды', category: 'Brandy', costPerBottle: 1200, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 930, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_06', name: 'Хеннесси VSOP', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 5500, sellingPricePerPortion: 850, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1240, emptyBottleWeightG: 540, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_07', name: 'Мартель VSOP', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 5200, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1225, emptyBottleWeightG: 525, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_08', name: 'Арарат 7 звезд', category: 'Brandy', costPerBottle: 2800, sellingPricePerPortion: 480, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 980, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_09', name: 'Реми Мартен XO', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 12000, sellingPricePerPortion: 1500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1300, emptyBottleWeightG: 600, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_10', name: 'Хеннесси XO', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 15000, sellingPricePerPortion: 1800, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1320, emptyBottleWeightG: 620, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_11', name: 'Арманьяк Жан Кавьер', category: 'Brandy', subCategory: 'Armagnac', costPerBottle: 4200, sellingPricePerPortion: 650, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_12', name: 'Кальвадос Бускье', category: 'Brandy', subCategory: 'Calvados', costPerBottle: 3800, sellingPricePerPortion: 590, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1185, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_13', name: 'Мартель XO', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 14000, sellingPricePerPortion: 1700, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1310, emptyBottleWeightG: 610, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_14', name: 'Арарат Ахтамар', category: 'Brandy', costPerBottle: 3500, sellingPricePerPortion: 560, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 1000, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_15', name: 'Реми Мартен 1738', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 6500, sellingPricePerPortion: 950, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1250, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_16', name: 'Хеннесси Паради', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 20000, sellingPricePerPortion: 2200, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1350, emptyBottleWeightG: 650, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_17', name: 'Арарат Наири', category: 'Brandy', costPerBottle: 4500, sellingPricePerPortion: 680, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 1020, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_18', name: 'Кальвадос Дюбукле', category: 'Brandy', subCategory: 'Calvados', costPerBottle: 4000, sellingPricePerPortion: 620, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1195, emptyBottleWeightG: 495, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_19', name: 'Арманьяк Лабарда', category: 'Brandy', subCategory: 'Armagnac', costPerBottle: 4500, sellingPricePerPortion: 690, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('brandy') },
      { id: 'prod_brandy_20', name: 'Мартель Кордон Блю', category: 'Brandy', subCategory: 'Cognac', costPerBottle: 18000, sellingPricePerPortion: 2000, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1330, emptyBottleWeightG: 630, isActive: true, imageUrl: getImage('brandy') },
      
      // Vermouth новые (03-20)
      { id: 'prod_vermouth_03', name: 'Мартини Экстра Драй', category: 'Vermouth', subCategory: 'Dry', costPerBottle: 1200, sellingPricePerPortion: 210, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1480, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_04', name: 'Чинзано Россо', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1000, sellingPricePerPortion: 190, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1540, emptyBottleWeightG: 540, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_05', name: 'Чинзано Бьянко', category: 'Vermouth', costPerBottle: 1000, sellingPricePerPortion: 190, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1490, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_06', name: 'Чинзано Драй', category: 'Vermouth', subCategory: 'Dry', costPerBottle: 1050, sellingPricePerPortion: 195, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1470, emptyBottleWeightG: 470, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_07', name: 'Мартини Розе', category: 'Vermouth', subCategory: 'Bianco', costPerBottle: 1150, sellingPricePerPortion: 205, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1510, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_08', name: 'Ноилли Прат', category: 'Vermouth', subCategory: 'Dry', costPerBottle: 1300, sellingPricePerPortion: 220, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1490, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_09', name: 'Долин Блан', category: 'Vermouth', costPerBottle: 1400, sellingPricePerPortion: 230, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1505, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_10', name: 'Карпано Анчикато', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1600, sellingPricePerPortion: 250, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1560, emptyBottleWeightG: 560, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_11', name: 'Карпано Бьянко', category: 'Vermouth', costPerBottle: 1500, sellingPricePerPortion: 240, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1515, emptyBottleWeightG: 515, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_12', name: 'Карпано Драй', category: 'Vermouth', subCategory: 'Dry', costPerBottle: 1550, sellingPricePerPortion: 245, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1485, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_13', name: 'Мартини Амати', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1800, sellingPricePerPortion: 270, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1570, emptyBottleWeightG: 570, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_14', name: 'Чинзано Розе', category: 'Vermouth', subCategory: 'Bianco', costPerBottle: 1080, sellingPricePerPortion: 192, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1505, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_15', name: 'Мартини Фиоро Д\'Оро', category: 'Vermouth', costPerBottle: 1700, sellingPricePerPortion: 260, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1520, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_16', name: 'Долин Руж', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1450, sellingPricePerPortion: 235, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1555, emptyBottleWeightG: 555, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_17', name: 'Ноилли Прат Экстра Драй', category: 'Vermouth', subCategory: 'Dry', costPerBottle: 1350, sellingPricePerPortion: 225, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1475, emptyBottleWeightG: 475, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_18', name: 'Карпано Антика', category: 'Vermouth', subCategory: 'Sweet', costPerBottle: 1650, sellingPricePerPortion: 255, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1565, emptyBottleWeightG: 565, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_19', name: 'Долин Блан Вер', category: 'Vermouth', costPerBottle: 1420, sellingPricePerPortion: 232, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1510, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('vermouth') },
      { id: 'prod_vermouth_20', name: 'Мартини Флеро', category: 'Vermouth', costPerBottle: 1750, sellingPricePerPortion: 265, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1525, emptyBottleWeightG: 525, isActive: true, imageUrl: getImage('vermouth') },
      
      // Absinthe новые (02-20)
      { id: 'prod_absinthe_02', name: 'Абсент Верте', category: 'Absinthe', costPerBottle: 3000, sellingPricePerPortion: 480, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1190, emptyBottleWeightG: 490, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_03', name: 'Абсент Руж', category: 'Absinthe', costPerBottle: 3200, sellingPricePerPortion: 500, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_04', name: 'Люксардо Абсент', category: 'Absinthe', costPerBottle: 3500, sellingPricePerPortion: 520, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_05', name: 'Перно Абсент', category: 'Absinthe', costPerBottle: 2900, sellingPricePerPortion: 470, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1185, emptyBottleWeightG: 485, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_06', name: 'Абсент Премиум', category: 'Absinthe', costPerBottle: 4000, sellingPricePerPortion: 600, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1220, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_07', name: 'Абсент Классик', category: 'Absinthe', costPerBottle: 2700, sellingPricePerPortion: 460, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1175, emptyBottleWeightG: 475, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_08', name: 'Абсент Супериор', category: 'Absinthe', costPerBottle: 3800, sellingPricePerPortion: 580, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1215, emptyBottleWeightG: 515, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_09', name: 'Абсент Ориджинал', category: 'Absinthe', costPerBottle: 3100, sellingPricePerPortion: 490, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1195, emptyBottleWeightG: 495, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_10', name: 'Абсент Де Люкс', category: 'Absinthe', costPerBottle: 4200, sellingPricePerPortion: 620, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1225, emptyBottleWeightG: 525, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_11', name: 'Абсент Эксклюзив', category: 'Absinthe', costPerBottle: 4500, sellingPricePerPortion: 650, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1230, emptyBottleWeightG: 530, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_12', name: 'Абсент Традисьон', category: 'Absinthe', costPerBottle: 3300, sellingPricePerPortion: 510, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1205, emptyBottleWeightG: 505, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_13', name: 'Абсент Престиж', category: 'Absinthe', costPerBottle: 3900, sellingPricePerPortion: 590, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1220, emptyBottleWeightG: 520, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_14', name: 'Абсент Ноубл', category: 'Absinthe', costPerBottle: 3600, sellingPricePerPortion: 560, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1210, emptyBottleWeightG: 510, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_15', name: 'Абсент Роял', category: 'Absinthe', costPerBottle: 4100, sellingPricePerPortion: 610, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1222, emptyBottleWeightG: 522, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_16', name: 'Абсент Гранд', category: 'Absinthe', costPerBottle: 3700, sellingPricePerPortion: 570, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1212, emptyBottleWeightG: 512, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_17', name: 'Абсент Мастер', category: 'Absinthe', costPerBottle: 3400, sellingPricePerPortion: 540, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1202, emptyBottleWeightG: 502, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_18', name: 'Абсент Легенд', category: 'Absinthe', costPerBottle: 4400, sellingPricePerPortion: 640, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1235, emptyBottleWeightG: 535, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_19', name: 'Абсент Империал', category: 'Absinthe', costPerBottle: 4600, sellingPricePerPortion: 660, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1240, emptyBottleWeightG: 540, isActive: true, imageUrl: getImage('absinthe') },
      { id: 'prod_absinthe_20', name: 'Абсент Винтаж', category: 'Absinthe', costPerBottle: 4800, sellingPricePerPortion: 680, portionVolumeMl: 30, bottleVolumeMl: 700, fullBottleWeightG: 1245, emptyBottleWeightG: 545, isActive: true, imageUrl: getImage('absinthe') },
      
      // Bitters новые (02-20)
      { id: 'prod_bitters_02', name: 'Пейшо Биттер', category: 'Bitters', costPerBottle: 1400, sellingPricePerPortion: 28, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 440, emptyBottleWeightG: 240, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_03', name: 'Реганс Оранж Биттер', category: 'Bitters', costPerBottle: 1600, sellingPricePerPortion: 32, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 445, emptyBottleWeightG: 245, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_04', name: 'Фили Аудер Биттер', category: 'Bitters', costPerBottle: 1800, sellingPricePerPortion: 35, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 450, emptyBottleWeightG: 250, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_05', name: 'Биттер Трипл Сек', category: 'Bitters', costPerBottle: 1300, sellingPricePerPortion: 27, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 438, emptyBottleWeightG: 238, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_06', name: 'Биттер Чоколат', category: 'Bitters', costPerBottle: 1700, sellingPricePerPortion: 33, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 447, emptyBottleWeightG: 247, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_07', name: 'Биттер Лимон', category: 'Bitters', costPerBottle: 1450, sellingPricePerPortion: 29, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 442, emptyBottleWeightG: 242, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_08', name: 'Биттер Мятный', category: 'Bitters', costPerBottle: 1550, sellingPricePerPortion: 31, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 443, emptyBottleWeightG: 243, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_09', name: 'Биттер Корица', category: 'Bitters', costPerBottle: 1650, sellingPricePerPortion: 33, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 446, emptyBottleWeightG: 246, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_10', name: 'Биттер Апельсин', category: 'Bitters', costPerBottle: 1420, sellingPricePerPortion: 28, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 441, emptyBottleWeightG: 241, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_11', name: 'Биттер Ваниль', category: 'Bitters', costPerBottle: 1750, sellingPricePerPortion: 34, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 448, emptyBottleWeightG: 248, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_12', name: 'Биттер Клюква', category: 'Bitters', costPerBottle: 1480, sellingPricePerPortion: 29, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 442, emptyBottleWeightG: 242, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_13', name: 'Биттер Гранат', category: 'Bitters', costPerBottle: 1520, sellingPricePerPortion: 30, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 444, emptyBottleWeightG: 244, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_14', name: 'Биттер Черная Смородина', category: 'Bitters', costPerBottle: 1580, sellingPricePerPortion: 31, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 445, emptyBottleWeightG: 245, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_15', name: 'Биттер Малина', category: 'Bitters', costPerBottle: 1620, sellingPricePerPortion: 32, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 446, emptyBottleWeightG: 246, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_16', name: 'Биттер Вишня', category: 'Bitters', costPerBottle: 1680, sellingPricePerPortion: 33, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 447, emptyBottleWeightG: 247, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_17', name: 'Биттер Персик', category: 'Bitters', costPerBottle: 1720, sellingPricePerPortion: 34, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 448, emptyBottleWeightG: 248, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_18', name: 'Биттер Клубника', category: 'Bitters', costPerBottle: 1780, sellingPricePerPortion: 35, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 449, emptyBottleWeightG: 249, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_19', name: 'Биттер Грейпфрут', category: 'Bitters', costPerBottle: 1380, sellingPricePerPortion: 27, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 439, emptyBottleWeightG: 239, isActive: true, imageUrl: getImage('bitters') },
      { id: 'prod_bitters_20', name: 'Биттер Лайм', category: 'Bitters', costPerBottle: 1400, sellingPricePerPortion: 28, portionVolumeMl: 2, bottleVolumeMl: 200, fullBottleWeightG: 440, emptyBottleWeightG: 240, isActive: true, imageUrl: getImage('bitters') },
    ];
}

async function seedInitialProducts(firestore: Firestore): Promise<void> {
    const productsCheckQuery = query(collection(firestore, "products"), limit(1));
    const productsSnapshot = await getDocs(productsCheckQuery);
    if (!productsSnapshot.empty) {
        return;
    }

    const productsToSeed = getInitialProductData();
    const batch = writeBatch(firestore);

    for (const seedProd of productsToSeed) {
        const docRef = doc(firestore, 'products', seedProd.id);
        const productData = {
            ...seedProd,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(docRef, productData, { merge: true });
    }
    
    await batch.commit();
}

async function addMissingProducts(firestore: Firestore): Promise<void> {
    try {
        const allProducts = getInitialProductData();
        const batch = writeBatch(firestore);
        let hasChanges = false;

        for (const product of allProducts) {
            const docRef = doc(firestore, 'products', product.id);
            const productDoc = await getDoc(docRef);
            
            if (!productDoc.exists()) {
                const productData = {
                    ...product,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                batch.set(docRef, productData, { merge: true });
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await batch.commit();
        }
    } catch (e) {
        logger.error("Error during adding missing products:", e);
    }
}

async function seedInitialData(firestore: Firestore, barId: string, userId: string): Promise<void> {
    try {
        await seedInitialProducts(firestore);
        await addMissingProducts(firestore);
    } catch(e) {
        logger.error("Error during initial data seeding:", e);
    }
}

async function ensureEmailIndex(firestore: Firestore, user: User): Promise<void> {
    if (!user || !user.email) return;

    const emailLower = user.email.toLowerCase();
    const indexRef = doc(firestore, 'email_to_uid', emailLower);

    try {
        const indexDoc = await getDoc(indexRef);
        if (!indexDoc.exists()) {
            await setDoc(indexRef, {
                uid: user.uid,
                createdAt: serverTimestamp()
            });
        }
    } catch (e: any) {
        // Log the error but don't block the login flow
        // The email index is optional and used for lookups, but not critical for authentication
        logger.warn(`Failed to ensure email index for ${emailLower}:`, e);
        // Don't emit permission-error here as it would block the login flow
        // This is a non-critical operation that can fail without affecting user authentication
    }
}


export async function ensureUserAndBarDocuments(firestore: Firestore, user: User): Promise<void> {
    if (!firestore || !user) return;

    try {
        // Ensure email index is created or exists
        await ensureEmailIndex(firestore, user);

        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let wasUserCreated = false;
        
        // 1. Always try to read from sessionStorage
        let extraDetails = {};
        if (typeof window !== 'undefined') {
            const detailsJson = sessionStorage.getItem('new_user_details');
            if (detailsJson) {
                try {
                    extraDetails = JSON.parse(detailsJson);
                } catch(e) {
                    logger.error("Could not parse new user details from session storage", e);
                    sessionStorage.removeItem('new_user_details'); // Clear corrupted data
                }
            }
        }
        const hasExtraDetails = Object.keys(extraDetails).length > 0;

        // 2. User document creation/update logic
        if (!userDoc.exists()) {
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            const userData = {
                id: user.uid,
                displayName: displayName,
                email: user.email,
                role: 'manager' as const,
                createdAt: serverTimestamp(),
                ...extraDetails // Add survey data
            };
            await setDoc(userRef, userData);
            wasUserCreated = true;
            if (hasExtraDetails && typeof window !== 'undefined') {
                 sessionStorage.removeItem('new_user_details'); // Clear after successful write
            }
        } else if (hasExtraDetails) {
            // 3. If doc exists but there is data in storage, merge it
            await setDoc(userRef, extraDetails, { merge: true });
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('new_user_details'); // Clear after successful write
            }
        }


        // 4. Bar creation logic (remains unchanged)
        const barId = `bar_${user.uid}`;
        const barRef = doc(firestore, 'bars', barId);
        const barDoc = await getDoc(barRef);

        if (!barDoc.exists()) {
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            const barData = {
                id: barId,
                name: `Бар ${displayName}`,
                location: 'Не указано',
                ownerUserId: user.uid,
            };
            await setDoc(barRef, barData);
            
            if (wasUserCreated) {
                await seedInitialData(firestore, barId, user.uid);
            }
        }
    } catch (e: any) {
        // This is a critical failure, we re-throw to let the UI handle it (e.g., show an error page)
        logger.error("A non-recoverable error occurred during user/bar document check:", e);
        throw new Error(`Не удалось проверить или создать необходимые документы: ${e.message}`);
    }
}


export async function initiateEmailSignUp(
  auth: Auth,
  { name, email, password }: { name: string, email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential;
  } catch (error) {
    logger.error("Error during email sign-up:", error);
    throw error;
  }
}

export async function initiateEmailSignIn(
  auth: Auth,
  { email, password }: { email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    logger.error("Error during email sign-in:", error);
    throw error;
  }
}
