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
    if (!firestore || !user) return;

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

/**
 * Initiates email sign-up, creates a user, updates their profile, and ensures
 * their necessary Firestore documents are created before resolving.
 * @returns A Promise that resolves on success or rejects on failure.
 */
export async function initiateEmailSignUpAndCreateUser(
  auth: Auth,
  firestore: Firestore,
  { name, email, password }: { name: string, email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // After creating the user, update their profile with the display name.
    await updateProfile(userCredential.user, { displayName: name });
    // Now that the profile is updated, ensure the documents are created.
    await ensureUserAndBarDocuments(firestore, userCredential.user);
    return userCredential;
  } catch (error) {
    console.error("Error during sign-up and document creation:", error);
    throw error; // Re-throw to be handled by the UI
  }
}

/**
 * Initiates email sign-in and ensures the user's documents exist.
 * @returns A Promise that resolves on success or rejects on failure.
 */
export async function initiateEmailSignIn(
  auth: Auth,
  firestore: Firestore,
  { email, password }: { email: string, password: string }
): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // After sign-in, ensure user documents are in place.
    await ensureUserAndBarDocuments(firestore, userCredential.user);
    return userCredential;
  } catch (error) {
    console.error("Error during sign-in:", error);
    throw error; // Re-throw to be handled by the UI
  }
}
