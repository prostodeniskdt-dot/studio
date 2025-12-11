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
import { doc, setDoc, serverTimestamp, writeBatch, getDoc, getDocs, collection, query, limit, Timestamp, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Product, InventorySession, InventoryLine } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { errorEmitter, FirestorePermissionError } from '@/firebase';


async function seedInitialData(firestore: Firestore): Promise<void> {
    const productsCollectionRef = collection(firestore, 'products');
    const productsQuery = query(productsCollectionRef, limit(1));
    
    try {
        const productsSnapshot = await getDocs(productsQuery);
        if (!productsSnapshot.empty) {
            return;
        }

        const batch = writeBatch(firestore);

        const productsToCreate: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { name: 'Jameson', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'whiskey')?.imageUrl },
            { name: 'Jack Daniel\'s', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2000, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'whiskey')?.imageUrl },
            { name: 'Havana Club 3', category: 'Rum', subCategory: 'White', costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1120, emptyBottleWeightG: 420, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'rum')?.imageUrl },
            { name: 'Captain Morgan Spiced', category: 'Rum', subCategory: 'Spiced', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'rum')?.imageUrl },
            { name: 'Beefeater', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'gin')?.imageUrl },
            { name: 'Olmeca Blanco', category: 'Tequila', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'tequila')?.imageUrl },
            { name: 'Aperol', category: 'Liqueur', costPerBottle: 1300, sellingPricePerPortion: 280, portionVolumeMl: 50, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'liqueur')?.imageUrl },
            { name: 'Monin Grenadine', category: 'Syrup', costPerBottle: 800, sellingPricePerPortion: 50, portionVolumeMl: 10, bottleVolumeMl: 1000, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'syrup')?.imageUrl },
            { name: 'Вино красное (дом)', category: 'Wine', subCategory: 'Red', costPerBottle: 900, sellingPricePerPortion: 250, portionVolumeMl: 150, bottleVolumeMl: 750, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'wine')?.imageUrl },
            { name: 'Пиво светлое (кран)', category: 'Beer', subCategory: 'Lager', costPerBottle: 150, sellingPricePerPortion: 300, portionVolumeMl: 500, bottleVolumeMl: 1000, isActive: true, imageUrl: PlaceHolderImages.find(p => p.id === 'beer')?.imageUrl }
        ];

        productsToCreate.forEach(prodData => {
            const prodRef = doc(productsCollectionRef);
            batch.set(prodRef, {
                ...prodData,
                id: prodRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });
        
        await batch.commit();

    } catch (serverError) {
        const permissionError = new FirestorePermissionError({ path: productsCollectionRef.path, operation: 'list'});
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
}

async function seedMissingVodka(firestore: Firestore): Promise<void> {
    const productsCollectionRef = collection(firestore, 'products');
    const firstVodkaQuery = query(productsCollectionRef, where('name', '==', 'Русский Стандарт Original'), limit(1));

    try {
        const vodkaSnapshot = await getDocs(firstVodkaQuery);
        if (!vodkaSnapshot.empty) {
            // Водка уже есть, ничего не делаем
            return;
        }

        const batch = writeBatch(firestore);
        const vodkaImage = PlaceHolderImages.find(p => p.id === 'vodka')?.imageUrl;
        const vodkasToAdd: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { name: 'Русский Стандарт Original', category: 'Vodka', costPerBottle: 700, sellingPricePerPortion: 250, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Русский Стандарт Platinum', category: 'Vodka', costPerBottle: 1000, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Beluga Noble', category: 'Vodka', costPerBottle: 1500, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Beluga Gold Line', category: 'Vodka', costPerBottle: 5000, sellingPricePerPortion: 1500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Царская Оригинальная', category: 'Vodka', costPerBottle: 800, sellingPricePerPortion: 280, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Царская Золотая', category: 'Vodka', costPerBottle: 1200, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Пять Озёр', category: 'Vodka', costPerBottle: 450, sellingPricePerPortion: 180, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Хаски', category: 'Vodka', costPerBottle: 500, sellingPricePerPortion: 200, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Талка', category: 'Vodka', costPerBottle: 480, sellingPricePerPortion: 190, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Зеленая Марка', category: 'Vodka', costPerBottle: 400, sellingPricePerPortion: 160, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Байкал', category: 'Vodka', costPerBottle: 550, sellingPricePerPortion: 220, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Мамонт', category: 'Vodka', costPerBottle: 2500, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Kremlin Award', category: 'Vodka', costPerBottle: 2000, sellingPricePerPortion: 700, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Absolut', category: 'Vodka', costPerBottle: 1300, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Finlandia', category: 'Vodka', costPerBottle: 1200, sellingPricePerPortion: 420, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Grey Goose', category: 'Vodka', costPerBottle: 3000, sellingPricePerPortion: 1000, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Smirnoff No. 21', category: 'Vodka', costPerBottle: 900, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Stolichnaya', category: 'Vodka', costPerBottle: 850, sellingPricePerPortion: 290, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Чистые Росы', category: 'Vodka', costPerBottle: 1100, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Архангельская Северная Выдержка', category: 'Vodka', costPerBottle: 600, sellingPricePerPortion: 240, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Воздух', category: 'Vodka', costPerBottle: 520, sellingPricePerPortion: 210, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Белая Березка', category: 'Vodka', costPerBottle: 580, sellingPricePerPortion: 230, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Хортиця', category: 'Vodka', costPerBottle: 530, sellingPricePerPortion: 215, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Мягков', category: 'Vodka', costPerBottle: 470, sellingPricePerPortion: 185, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Журавли', category: 'Vodka', costPerBottle: 490, sellingPricePerPortion: 195, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Saimaa', category: 'Vodka', costPerBottle: 1400, sellingPricePerPortion: 480, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Organika', category: 'Vodka', costPerBottle: 1600, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Onegin', category: 'Vodka', costPerBottle: 2800, sellingPricePerPortion: 900, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Kauffman', category: 'Vodka', costPerBottle: 4500, sellingPricePerPortion: 1400, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Nerpa', category: 'Vodka', costPerBottle: 1300, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Солодовая', category: 'Vodka', costPerBottle: 510, sellingPricePerPortion: 205, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Легенда Кремля', category: 'Vodka', costPerBottle: 2200, sellingPricePerPortion: 750, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Снежная Королева', category: 'Vodka', costPerBottle: 1100, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Diamond Ice', category: 'Vodka', costPerBottle: 460, sellingPricePerPortion: 180, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Алтай', category: 'Vodka', costPerBottle: 440, sellingPricePerPortion: 175, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Медведь', category: 'Vodka', costPerBottle: 480, sellingPricePerPortion: 190, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
            { name: 'Ciroc', category: 'Vodka', costPerBottle: 3200, sellingPricePerPortion: 1100, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Ketel One', category: 'Vodka', costPerBottle: 2400, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Belvedere', category: 'Vodka', costPerBottle: 2800, sellingPricePerPortion: 950, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: vodkaImage },
            { name: 'Morosha', category: 'Vodka', costPerBottle: 430, sellingPricePerPortion: 170, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: vodkaImage },
        ];

        vodkasToAdd.forEach(prodData => {
            const prodRef = doc(productsCollectionRef);
            batch.set(prodRef, {
                ...prodData,
                id: prodRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();

    } catch (serverError) {
        // Ошибки здесь не критичны для основного потока, просто логируем их
        console.error("Error seeding missing vodka:", serverError);
    }
}


async function seedMissingWhiskey(firestore: Firestore): Promise<void> {
    const productsCollectionRef = collection(firestore, 'products');
    const firstWhiskeyQuery = query(productsCollectionRef, where('name', '==', 'Jack Daniel\'s Old No. 7'), limit(1));

    try {
        const whiskeySnapshot = await getDocs(firstWhiskeyQuery);
        if (!whiskeySnapshot.empty) {
            return; // Виски уже есть
        }

        const batch = writeBatch(firestore);
        const whiskeyImage = PlaceHolderImages.find(p => p.id === 'whiskey')?.imageUrl;
        const whiskeysToAdd: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { name: 'Jack Daniel\'s Old No. 7', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2500, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Jameson', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 2200, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Johnnie Walker Red Label', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Johnnie Walker Black Label 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 3500, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Chivas Regal 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 3800, sellingPricePerPortion: 650, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Macallan 12 Sherry Oak', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 8000, sellingPricePerPortion: 1200, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Maker\'s Mark', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 3200, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Jim Beam White Label', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 1900, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Tullamore D.E.W.', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 2300, sellingPricePerPortion: 420, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Bushmills Original', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 2100, sellingPricePerPortion: 390, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Suntory Toki', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 4000, sellingPricePerPortion: 700, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Glenfiddich 12', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 5000, sellingPricePerPortion: 800, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'William Lawson\'s', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1300, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Ballantine\'s Finest', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Monkey Shoulder', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 4200, sellingPricePerPortion: 700, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Laphroaig 10', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 6000, sellingPricePerPortion: 900, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Ardbeg 10', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 6500, sellingPricePerPortion: 950, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Wild Turkey 101', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 3000, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Bulleit Bourbon', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 3300, sellingPricePerPortion: 580, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Proper No. Twelve', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 2800, sellingPricePerPortion: 480, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Nikka From The Barrel', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 6000, sellingPricePerPortion: 1000, portionVolumeMl: 40, bottleVolumeMl: 500, isActive: true, imageUrl: whiskeyImage },
            { name: 'Dewar\'s White Label', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1800, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Grant\'s Triple Wood', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'The Famous Grouse', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1750, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Glenmorangie The Original 10', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 5200, sellingPricePerPortion: 850, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Talisker 10', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 5800, sellingPricePerPortion: 900, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Four Roses', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2400, sellingPricePerPortion: 450, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Buffalo Trace', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 3100, sellingPricePerPortion: 540, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Redbreast 12', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 5500, sellingPricePerPortion: 880, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Connemara Peated', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 4000, sellingPricePerPortion: 680, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Yamazaki 12', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 15000, sellingPricePerPortion: 2500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Hibiki Harmony', category: 'Whiskey', subCategory: 'Japanese', costPerBottle: 9000, sellingPricePerPortion: 1500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Bell\'s Original', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1200, sellingPricePerPortion: 280, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'White Horse', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 1100, sellingPricePerPortion: 270, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Aberlour 12 Double Cask', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 5300, sellingPricePerPortion: 850, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'The Balvenie 12 DoubleWood', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 7500, sellingPricePerPortion: 1100, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Woodford Reserve', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 4500, sellingPricePerPortion: 750, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Knob Creek', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 4200, sellingPricePerPortion: 700, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'The Irishman Founder\'s Reserve', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 3000, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
            { name: 'Teeling Small Batch', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 3200, sellingPricePerPortion: 550, portionVolumeMl: 40, bottleVolumeMl: 700, isActive: true, imageUrl: whiskeyImage },
        ];
        
        whiskeysToAdd.forEach(prodData => {
            const prodRef = doc(productsCollectionRef);
            batch.set(prodRef, {
                ...prodData,
                id: prodRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();

    } catch (serverError) {
        console.error("Error seeding missing whiskey:", serverError);
    }
}


/**
 * Ensures user and bar documents exist, creating them if necessary.
 * This is a critical setup step for any authenticated user.
 */
export async function ensureUserAndBarDocuments(firestore: Firestore, user: User): Promise<void> {
    if (!firestore || !user) return;

    const userRef = doc(firestore, 'users', user.uid);
    const barId = `bar_${user.uid}`;
    const barRef = doc(firestore, 'bars', barId);

    try {
        const [userDoc, barDoc] = await Promise.all([getDoc(userRef), getDoc(barRef)]);
        
        if (userDoc.exists() && barDoc.exists()) {
            // Данные пользователя и бара уже есть, просто проверяем и до-заполняем
            await Promise.all([
                seedMissingVodka(firestore),
                seedMissingWhiskey(firestore)
            ]);
            return; 
        }

        const batch = writeBatch(firestore);
        
        const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
        
        if (!userDoc.exists()) {
            const newUser = {
                id: user.uid,
                displayName: displayName,
                email: user.email,
                role: 'manager',
                createdAt: serverTimestamp(),
            };
            batch.set(userRef, newUser);
        }

        if (!barDoc.exists()) {
            const newBar = {
                id: barId,
                name: `Бар ${displayName}`,
                location: 'Не указано',
                ownerUserId: user.uid,
            };
            batch.set(barRef, newBar);
        }
        
        await batch.commit();
        await seedInitialData(firestore);
        await Promise.all([
            seedMissingVodka(firestore),
            seedMissingWhiskey(firestore)
        ]);

    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({ 
            path: userRef.path,
            operation: 'write' 
        });
        errorEmitter.emit('permission-error', permissionError);
        
        // Re-throw a more user-friendly error to be displayed in the UI
        throw new Error(serverError.message || `Не удалось создать необходимые документы в базе данных. Возможно, у вас недостаточно прав. Пожалуйста, проверьте правила безопасности Firestore.`);
    }
}


/**
 * Initiates email sign-up and updates the user's profile.
 * Document creation is handled by the DashboardLayout.
 */
export async function initiateEmailSignUp(
  auth: Auth,
  { name, email, password }: { name: string, email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential;
  } catch (error) {
    console.error("Error during email sign-up:", error);
    throw error;
  }
}

/**
 * Initiates email sign-in.
 * Document creation is handled by the DashboardLayout.
 */
export async function initiateEmailSignIn(
  auth: Auth,
  { email, password }: { email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error("Error during email sign-in:", error);
    throw error;
  }
}
