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
import { doc, setDoc, serverTimestamp, writeBatch, getDoc, getDocs, collection } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/**
 * Ensures user and bar documents exist, creating them if necessary.
 * This function is now robust and waits for profile updates.
 */
export async function ensureUserAndBarDocuments(firestore: Firestore, user: User): Promise<void> {
  const userRef = doc(firestore, 'users', user.uid);
  const barId = `bar_${user.uid}`;
  const barRef = doc(firestore, 'bars', barId);

  const batch = writeBatch(firestore);

  try {
    const userDoc = await getDoc(userRef);
    const barDoc = await getDoc(barRef);
    
    let shouldCommit = false;

    if (!userDoc.exists()) {
        const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
        const newUser = {
            id: user.uid,
            displayName: displayName,
            email: user.email,
            role: 'manager',
            createdAt: serverTimestamp(),
        };
        batch.set(userRef, newUser);
        shouldCommit = true;
    }

    if (!barDoc.exists()) {
        const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
        const newBar = {
            id: barId,
            name: `Бар ${displayName}`,
            location: 'Не указано',
            ownerUserId: user.uid,
        };
        batch.set(barRef, newBar);
        shouldCommit = true;
    }
    
    if (shouldCommit) {
        await batch.commit();
    }

  } catch (error) {
    console.error("Error ensuring user and bar documents:", error);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
}


/** Initiate email/password sign-up and create user/bar documents reliably. */
export async function initiateEmailSignUpAndCreateUser(
  auth: Auth,
  firestore: Firestore,
  email: string,
  password: string,
  displayName: string
): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    // This function is now called from the layout, so no need to call it here.
}


/** Initiate email/password sign-in and ensure documents exist. */
export async function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
    // This function is now called from the layout, so no need to call it here.
}
