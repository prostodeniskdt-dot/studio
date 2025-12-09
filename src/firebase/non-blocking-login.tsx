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
async function ensureUserAndBarDocuments(firestore: Firestore, user: User, name?: string): Promise<void> {
  const userRef = doc(firestore, 'users', user.uid);
  const barId = `bar_${user.uid}`;
  const barRef = doc(firestore, 'bars', barId);

  // Use a transaction to be safe, but a batch is also fine here.
  const batch = writeBatch(firestore);

  try {
    const [userDoc, barDoc] = await Promise.all([getDoc(userRef), getDoc(barRef)]);
    
    let displayName = user.displayName || name;
    if (!displayName) {
      displayName = user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
    }

    // Create User document if it doesn't exist
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

    // Create Bar document if it doesn't exist
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
  const user = userCredential.user;

  // Explicitly update the profile and wait for it to complete.
  await updateProfile(user, { displayName });

  // IMPORTANT: The user object from the credential is NOT automatically updated.
  // We must now ensure the documents are created with the new display name.
  await ensureUserAndBarDocuments(firestore, user, displayName);
}


/** Initiate email/password sign-in and ensure documents exist. */
export async function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): Promise<void> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // After sign-in, ensure the user and bar documents are in place.
  await ensureUserAndBarDocuments(firestore, user);
}
