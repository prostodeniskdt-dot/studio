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
import { doc, setDoc, serverTimestamp, writeBatch, getDoc, getDocs, collection, query, limit, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Product, InventorySession, InventoryLine } from '@/lib/types';


/**
 * Seeds initial data (products and sessions) for a new bar if it's empty.
 */
async function seedInitialData(firestore: Firestore, barId: string): Promise<void> {
    const productsCollectionRef = collection(firestore, 'bars', barId, 'products');
    const productsQuery = query(productsCollectionRef, limit(1));
    const productsSnapshot = await getDocs(productsQuery);

    // Only seed if there are no products
    if (!productsSnapshot.empty) {
        console.log("Products already exist, skipping seed.");
        return;
    }

    const batch = writeBatch(firestore);

    // --- 1. Create Products ---
    const productsToCreate: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
        { barId, name: 'Jameson', category: 'Whiskey', subCategory: 'Irish', costPerBottle: 1800, sellingPricePerPortion: 350, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1150, emptyBottleWeightG: 450, isActive: true },
        { barId, name: 'Jack Daniel\'s', category: 'Whiskey', subCategory: 'Bourbon', costPerBottle: 2000, sellingPricePerPortion: 380, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1180, emptyBottleWeightG: 480, isActive: true },
        { barId, name: 'Havana Club 3', category: 'Rum', subCategory: 'White', costPerBottle: 1500, sellingPricePerPortion: 300, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1120, emptyBottleWeightG: 420, isActive: true },
        { barId, name: 'Captain Morgan Spiced', category: 'Rum', subCategory: 'Spiced', costPerBottle: 1600, sellingPricePerPortion: 320, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1130, emptyBottleWeightG: 430, isActive: true },
        { barId, name: 'Beefeater', category: 'Gin', subCategory: 'London Dry', costPerBottle: 1700, sellingPricePerPortion: 340, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1140, emptyBottleWeightG: 440, isActive: true },
        { barId, name: 'Olmeca Blanco', category: 'Tequila', costPerBottle: 1900, sellingPricePerPortion: 360, portionVolumeMl: 40, bottleVolumeMl: 700, fullBottleWeightG: 1160, emptyBottleWeightG: 460, isActive: true },
        { barId, name: 'Aperol', category: 'Liqueur', costPerBottle: 1300, sellingPricePerPortion: 280, portionVolumeMl: 50, bottleVolumeMl: 700, fullBottleWeightG: 1200, emptyBottleWeightG: 500, isActive: true },
        { barId, name: 'Monin Grenadine', category: 'Syrup', costPerBottle: 800, sellingPricePerPortion: 50, portionVolumeMl: 10, bottleVolumeMl: 1000, isActive: true },
        { barId, name: 'Вино красное (дом)', category: 'Wine', subCategory: 'Red', costPerBottle: 900, sellingPricePerPortion: 250, portionVolumeMl: 150, bottleVolumeMl: 750, isActive: true },
        { barId, name: 'Пиво светлое (кран)', category: 'Beer', subCategory: 'Lager', costPerBottle: 150, sellingPricePerPortion: 300, portionVolumeMl: 500, bottleVolumeMl: 1000, isActive: true }
    ];

    const productRefs = new Map<string, DocumentReference>();
    productsToCreate.forEach(prodData => {
        const prodRef = doc(productsCollectionRef);
        batch.set(prodRef, {
            ...prodData,
            id: prodRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        productRefs.set(prodData.name, prodRef);
    });

    // --- 2. Create Inventory Sessions and Lines ---
    const sessionsCollectionRef = collection(firestore, 'bars', barId, 'inventorySessions');

    // --- Session 1: November (with some variance) ---
    const session1Ref = doc(sessionsCollectionRef, 'seed_session_1');
    const closedAt1 = new Date();
    closedAt1.setMonth(closedAt1.getMonth() - 1);
    batch.set(session1Ref, {
        id: session1Ref.id,
        barId: barId,
        name: 'Инвентаризация (Ноябрь)',
        status: 'completed',
        createdByUserId: barId.replace('bar_', ''),
        createdAt: Timestamp.fromDate(closedAt1),
        closedAt: Timestamp.fromDate(closedAt1),
    });
    
    const lines1Ref = collection(session1Ref, 'lines');
    // Jameson: sold 10, counted 250ml (shortage)
    const line1_1 = { id: doc(lines1Ref).id, productId: productRefs.get('Jameson')!.id, inventorySessionId: session1Ref.id, startStock: 700, purchases: 0, sales: 10, endStock: 250, theoreticalEndStock: 300, differenceVolume: -50, differenceMoney: -128.57, differencePercent: -12.5 };
    batch.set(doc(lines1Ref, line1_1.id), line1_1);
    // Aperol: sold 5, counted 470ml (surplus)
    const line1_2 = { id: doc(lines1Ref).id, productId: productRefs.get('Aperol')!.id, inventorySessionId: session1Ref.id, startStock: 700, purchases: 0, sales: 5, endStock: 470, theoreticalEndStock: 450, differenceVolume: 20, differenceMoney: 37.14, differencePercent: 4.44 };
    batch.set(doc(lines1Ref, line1_2.id), line1_2);


    // --- Session 2: October (almost perfect) ---
    const session2Ref = doc(sessionsCollectionRef, 'seed_session_2');
    const closedAt2 = new Date();
    closedAt2.setMonth(closedAt2.getMonth() - 2);
    batch.set(session2Ref, {
        id: session2Ref.id,
        barId: barId,
        name: 'Инвентаризация (Октябрь)',
        status: 'completed',
        createdByUserId: barId.replace('bar_', ''),
        createdAt: Timestamp.fromDate(closedAt2),
        closedAt: Timestamp.fromDate(closedAt2),
    });

    const lines2Ref = collection(session2Ref, 'lines');
    // Jack Daniel's: sold 12, counted 215ml (minor shortage)
    const line2_1 = { id: doc(lines2Ref).id, productId: productRefs.get('Jack Daniel\'s')!.id, inventorySessionId: session2Ref.id, startStock: 700, purchases: 700, sales: 22, endStock: 430, theoreticalEndStock: 520, differenceVolume: -90, differenceMoney: -257.14, differencePercent: -10.22 };
    batch.set(doc(lines2Ref, line2_1.id), line2_1);
    // Beefeater: sold 8, counted 380ml (perfect)
    const line2_2 = { id: doc(lines2Ref).id, productId: productRefs.get('Beefeater')!.id, inventorySessionId: session2Ref.id, startStock: 700, purchases: 0, sales: 8, endStock: 380, theoreticalEndStock: 380, differenceVolume: 0, differenceMoney: 0, differencePercent: 0 };
    batch.set(doc(lines2Ref, line2_2.id), line2_2);
    

    try {
        await batch.commit();
        console.log("Successfully seeded initial data.");
    } catch (error) {
        console.error("Error seeding data:", error);
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
        const userDoc = await getDoc(userRef);
        let barDoc = await getDoc(barRef);
        let barExists = barDoc.exists();

        // Only write if one of the documents is missing.
        if (!userDoc.exists() || !barExists) {
            const batch = writeBatch(firestore);
            
            // Use a fallback for displayName if it's not available
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

            if (!barExists) {
                const newBar = {
                    id: barId,
                    name: `Бар ${displayName}`,
                    location: 'Не указано',
                    ownerUserId: user.uid,
                };
                batch.set(barRef, newBar);
            }
            
            await batch.commit();
            
            // Re-fetch bar doc if it was just created
            if (!barExists) {
                 barDoc = await getDoc(barRef);
                 barExists = barDoc.exists();
            }
        }
        
        // After ensuring the bar exists, try to seed initial data
        if (barExists) {
           await seedInitialData(firestore, barId);
        }

    } catch (error) {
        console.error("Error ensuring user and bar documents:", error);
        // Re-throw the error to be caught by the calling function, which should handle UI feedback.
        throw new Error("Не удалось инициализировать данные пользователя и бара.");
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
    // After creating the user, update their profile with the display name.
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential;
  } catch (error) {
    console.error("Error during email sign-up:", error);
    throw error; // Re-throw to be handled by the UI
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
    throw error; // Re-throw to be handled by the UI
  }
}
