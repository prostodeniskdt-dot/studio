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
        const barDoc = await getDoc(barRef);

        // Only write if one of the documents is missing.
        if (!userDoc.exists() || !barDoc.exists()) {
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
