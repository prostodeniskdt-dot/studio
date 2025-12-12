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

type ProductSeedData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

function getInitialProductData(): ProductSeedData[] {
    const defaultImage = PlaceHolderImages.find(p => p.id === 'other')?.imageUrl ?? '';
    const getImage = (id: string) => PlaceHolderImages.find(p => p.id.toLowerCase() === id.toLowerCase())?.imageUrl ?? defaultImage;

    return [
        { name: 'Jameson', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('whiskey') },
        { name: 'Jack Daniel\'s', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2000, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('whiskey') },
        { name: 'Havana Club 3', category: 'Rum', subCategory: 'White', costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1120, emptyBottleWeightG: 420, isActive: true, imageUrl: getImage('rum') },
        { name: 'Captain Morgan Spiced', category: 'Rum', subCategory: 'Spiced', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true, imageUrl: getImage('rum') },
        { name: 'Beefeater', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true, imageUrl: getImage('gin') },
        { name: 'Olmeca Blanco', category: 'Tequila', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true, imageUrl: getImage('tequila') },
        { name: 'Aperol', category: 'Liqueur', costPerBottle: 1300, sellingPricePerPortion: 280, portionVolumeMl: 50, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
        { name: 'Monin Grenadine', category: 'Syrup', costPerBottle: 800, sellingPricePerPortion: 50, portionVolumeMl: 10, bottleVolumeMl: 1000, fullBottleWeightG: 1800, emptyBottleWeightG: 800, isActive: true, imageUrl: getImage('syrup') },
        { name: 'Вино красное (дом)', category: 'Wine', subCategory: 'Red', costPerBottle: 900, sellingPricePerPortion: 250, portionVolumeMl: 150, bottleVolumeMl: 750, fullBottleWeightG: 1250, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('wine') },
        { name: 'Пиво светлое (кран)', category: 'Beer', subCategory: 'Lager', costPerBottle: 150, sellingPricePerPortion: 300, portionVolumeMl: 500, bottleVolumeMl: 1000, fullBottleWeightG: 1550, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('beer') },
        { name: 'Русский Стандарт', category: 'Vodka', costPerBottle: 1000, sellingPricePerPortion: 250, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1100, emptyBottleWeightG: 400, isActive: true, imageUrl: getImage('vodka') },
        { name: 'Beluga Noble', category: 'Vodka', costPerBottle: 1800, sellingPricePerPortion: 400, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1250, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('vodka') },
        { name: 'Арарат 5 звезд', category: 'Brandy', costPerBottle: 1500, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 500, fullBottleWeightG: 950, emptyBottleWeightG: 450, isActive: true, imageUrl: getImage('brandy') },
        { name: 'Hendrick\'s', category: 'Gin', costPerBottle: 3000, sellingPricePerPortion: 500, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1300, emptyBottleWeightG: 600, isActive: true, imageUrl: getImage('gin') },
        { name: 'Martini Bianco', category: 'Vermouth', costPerBottle: 1100, sellingPricePerPortion: 200, portionVolumeMl: 50, bottleVolumeMl: 1000, fullBottleWeightG: 1500, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('vermouth') },
        { name: 'Baileys Original', category: 'Liqueur', costPerBottle: 2200, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('liqueur') },
        { name: 'Jägermeister', category: 'Liqueur', costPerBottle: 2100, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true, imageUrl: getImage('liqueur') },
        { name: 'Hoegaarden Witbier', category: 'Beer', subCategory: 'Ale', costPerBottle: 250, sellingPricePerPortion: 400, portionVolumeMl: 500, bottleVolumeMl: 500, fullBottleWeightG: 850, emptyBottleWeightG: 350, isActive: true, imageUrl: getImage('beer') },
        { name: 'Macallan 12 Double Cask', category: 'Whiskey', subCategory: 'Scotch', costPerBottle: 7000, sellingPricePerPortion: 1000, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true, imageUrl: getImage('whiskey') },
        { name: 'Patron Silver', category: 'Tequila', costPerBottle: 4000, sellingPricePerPortion: 600, portionVolumeMl: 40, bottleVolumeMl: 750, fullBottleWeightG: 1300, emptyBottleWeightG: 550, isActive: true, imageUrl: getImage('tequila') }
    ];
}

/**
 * Seeds the product catalog if it's missing products.
 * This is an idempotent operation; it only adds products that don't already exist by name.
 */
async function seedInitialProducts(firestore: Firestore): Promise<void> {
    const productsCollectionRef = collection(firestore, 'products');
    
    // Get all existing products from Firestore
    const existingProductsSnapshot = await getDocs(productsCollectionRef);
    const existingProductNames = new Set(existingProductsSnapshot.docs.map(doc => doc.data().name));

    // Get the list of products that should exist
    const productsToSeed = getInitialProductData();

    // Filter out products that already exist
    const productsToCreate = productsToSeed.filter(prod => !existingProductNames.has(prod.name));

    if (productsToCreate.length === 0) {
        return; // All products already exist.
    }

    const batch = writeBatch(firestore);
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
}


/**
 * Seeds a few completed inventory sessions for demonstration purposes.
 */
async function seedDemoInventorySessions(firestore: Firestore, barId: string, userId: string): Promise<void> {
    const sessionsCollectionRef = collection(firestore, 'bars', barId, 'inventorySessions');
    const sessionsQuery = query(sessionsCollectionRef, limit(1)); // Check if ANY session exists

    const sessionsSnapshot = await getDocs(sessionsQuery);
    if (!sessionsSnapshot.empty) {
        return; // Sessions (or at least one) already exist.
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

            // Generate plausible random data
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
 * Ensures user and bar documents exist, creating them if necessary.
 * Also seeds initial data for a better first-run experience.
 * This is a critical setup step for any authenticated user.
 */
export async function ensureUserAndBarDocuments(firestore: Firestore, user: User): Promise<void> {
    if (!firestore || !user) return;

    const userRef = doc(firestore, 'users', user.uid);
    const barId = `bar_${user.uid}`;
    const barRef = doc(firestore, 'bars', barId);

    try {
        const userDoc = await getDoc(userRef);
        const barDoc = await getDoc(barRef);

        // Create user and bar docs if they don't exist
        if (!userDoc.exists() || !barDoc.exists()) {
            const batch = writeBatch(firestore);
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            
            if (!userDoc.exists()) {
                batch.set(userRef, {
                    id: user.uid,
                    displayName: displayName,
                    email: user.email,
                    role: 'manager',
                    createdAt: serverTimestamp(),
                });
            }

            if (!barDoc.exists()) {
                batch.set(barRef, {
                    id: barId,
                    name: `Бар ${displayName}`,
                    location: 'Не указано',
                    ownerUserId: user.uid,
                });
            }
            await batch.commit();
        }

        // Seed initial data in parallel. These functions have internal checks to prevent re-seeding.
        await Promise.all([
            seedInitialProducts(firestore),
            seedDemoInventorySessions(firestore, barId, user.uid),
        ]);

    } catch (serverError: any) {
        // Create a more specific error for the developer console
        const permissionError = new FirestorePermissionError({ 
            path: `users/${user.uid} or bars/${barId}`,
            operation: 'write',
            requestResourceData: { userId: user.uid, barId: barId }
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
