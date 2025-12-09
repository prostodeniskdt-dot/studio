'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getAuth,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** Initiate email/password sign-up and create user/bar documents. */
export async function initiateEmailSignUpAndCreateUser(
  auth: Auth,
  firestore: Firestore,
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // First, update the auth profile to ensure displayName is set
    await updateProfile(user, { displayName });

    const batch = writeBatch(firestore);

    // 1. Create User document
    const userRef = doc(firestore, 'users', user.uid);
    const newUser = {
        id: user.uid,
        displayName: displayName,
        email: user.email,
        role: 'manager', 
        createdAt: serverTimestamp(),
    };
    batch.set(userRef, newUser);
    
    // 2. Create Bar document
    const barId = `bar_${user.uid}`;
    const barRef = doc(firestore, 'bars', barId);
    const newBar = {
      id: barId,
      name: `Бар ${displayName}`,
      location: 'Не указано',
      ownerUserId: user.uid,
    };
    batch.set(barRef, newBar);

    await batch.commit();
    return userCredential;
  } catch (error) {
    console.error("Error during sign-up and data creation:", error);
    throw error;
  }
}


/** Initiate email/password sign-in (non-blocking). */
export async function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if the user document exists.
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const barId = `bar_${user.uid}`;
    const barRef = doc(firestore, 'bars', barId);
    const barDoc = await getDoc(barRef);


    // If the user or bar document doesn't exist, create them.
    // This handles users created before the logic was in place or if something failed.
    if (!userDoc.exists() || !barDoc.exists()) {
        const batch = writeBatch(firestore);
        
        let displayName = user.displayName;
        
        // If displayName is missing in auth, update it first.
        if (!displayName) {
          displayName = user.email?.split('@')[0] || 'Пользователь';
          await updateProfile(user, { displayName: displayName });
        }

        // 1. Create User document if it doesn't exist
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
        
        // 2. Create Bar document if it doesn't exist
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
    }
    return userCredential;
  } catch (error) {
      console.error("Error during sign-in:", error);
      // Re-throw the error to be handled by the UI
      throw error;
  }
}
