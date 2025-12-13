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
    ];
}

/**
 * Seeds the product catalog if it's missing products or updates existing ones.
 * This is an idempotent operation using hardcoded IDs.
 */
async function seedInitialProducts(firestore: Firestore): Promise<void> {
    const productsToSeed = getInitialProductData();
    const batch = writeBatch(firestore);

    for (const seedProd of productsToSeed) {
        const docRef = doc(firestore, 'products', seedProd.id);
        const productData = {
            ...seedProd,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        // Use set with merge to create or update, ensuring all fields are correct.
        batch.set(docRef, productData, { merge: true });
    }
    
    await batch.commit();
}


/**
 * Seeds a few completed inventory sessions for demonstration purposes.
 * This is NOT idempotent and will only run if no sessions exist for the bar.
 */
async function seedDemoInventorySessions(firestore: Firestore, barId: string, userId: string): Promise<void> {
    const sessionsCollectionRef = collection(firestore, 'bars', barId, 'inventorySessions');
    const sessionsQuery = query(sessionsCollectionRef, limit(1)); 

    const sessionsSnapshot = await getDocs(sessionsQuery);
    if (!sessionsSnapshot.empty) {
        return; // Sessions already exist, so we don't seed demo data.
    }

    // Fetch some products to use in the demo sessions
    const productsSnapshot = await getDocs(query(collection(firestore, 'products'), limit(10)));
    const products = productsSnapshot.docs.map(d => d.data() as Product);
    if (products.length === 0) return; // Can't seed sessions without products

    const batch = writeBatch(firestore);
    const now = new Date();
    const dates = [
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    ];

    for (const sessionDate of dates) {
        const sessionRef = doc(sessionsCollectionRef);
        const sessionData: Omit<InventorySession, 'id'> = {
            barId,
            name: `Инвентаризация от ${sessionDate.toLocaleDateString('ru-RU')}`,
            status: 'completed',
            createdByUserId: userId,
            createdAt: Timestamp.fromDate(sessionDate),
            closedAt: Timestamp.fromDate(new Date(sessionDate.getTime() + 86400000)), // +1 day
        };
        batch.set(sessionRef, { ...sessionData, id: sessionRef.id });

        for (const product of products) {
            const lineRef = doc(collection(sessionRef, 'lines'));

            const startStock = Math.floor(Math.random() * 1000) + product.bottleVolumeMl;
            const purchases = (Math.random() > 0.5) ? product.bottleVolumeMl : 0;
            const sales = Math.floor(Math.random() * 20) + 10;
            const theoreticalEndStock = startStock + purchases - (sales * product.portionVolumeMl);
            const variance = (Math.random() - 0.5) * (product.portionVolumeMl * 2); // +/- 2 portions
            const endStock = Math.max(0, Math.round(theoreticalEndStock + variance));

            const partialLine = { id: lineRef.id, productId: product.id, inventorySessionId: sessionRef.id, startStock, purchases, sales, endStock };
            const calculatedFields = calculateLineFields(partialLine, product);

            batch.set(lineRef, { ...partialLine, ...calculatedFields });
        }
    }

    await batch.commit();
}


/**
 * A combined seeding function to be called after user/bar documents are confirmed to exist.
 */
async function seedInitialData(firestore: Firestore, barId: string, userId: string): Promise<void> {
    try {
        // Run sequentially to ensure products exist before demo sessions are created.
        await seedInitialProducts(firestore);
        await seedDemoInventorySessions(firestore, barId, userId);
    } catch(e) {
        console.error("Error during initial data seeding:", e);
        // We don't rethrow here to avoid blocking the UI if seeding fails.
        // The core app can still function.
    }
}


/**
 * Ensures user and bar documents exist, creating them if necessary.
 * This is a critical setup step for any authenticated user.
 * It's idempotent and safe to call on every dashboard load.
 */
export async function ensureUserAndBarDocuments(firestore: Firestore, user: User): Promise<void> {
    if (!firestore || !user) return;

    try {
        // --- Step 1: Ensure User document exists ---
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let wasUserCreated = false;

        if (!userDoc.exists()) {
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            const userData = {
                id: user.uid,
                displayName: displayName,
                email: user.email,
                role: 'manager' as const, // Default role
                createdAt: serverTimestamp(),
            };
            await setDoc(userRef, userData);
            wasUserCreated = true;
        }
        
        // --- Step 1.5: Self-bootstrap Admin Role (non-blocking) ---
        // This attempts to create the admin role doc. If it fails due to rules (e.g., doc exists),
        // it will fail silently and not block the main flow.
        if (user.email === 'prostodeniskdt@gmail.com') {
            const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
            setDoc(adminRoleRef, { isAdmin: true }).catch(error => {
                // Log the error for debugging but don't throw, as it's not a critical failure for the user.
                // The most common error here would be "permission-denied" if the doc already exists, which is fine.
                console.warn("Could not self-bootstrap admin role (this is often normal if role already exists):", error.code);
            });
        }

        // --- Step 2: Ensure Bar document exists ---
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
        console.error("A non-recoverable error occurred during user/bar document check:", e);
        throw new Error(`Не удалось проверить или создать необходимые документы: ${e.message}`);
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
