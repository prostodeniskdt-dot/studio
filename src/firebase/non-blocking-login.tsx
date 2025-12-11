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
        // Re-throw the error to be caught by the caller
        throw serverError;
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
            await seedInitialData(firestore);
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
