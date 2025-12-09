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
import { doc, setDoc, serverTimestamp, collection, writeBatch, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { setDocumentNonBlocking } from './non-blocking-updates';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** Initiate email/password sign-up and create user/bar documents. */
export function initiateEmailSignUpAndCreateUser(
  auth: Auth,
  firestore: Firestore,
  email: string,
  password: string,
  displayName: string
): void {
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const user = userCredential.user;
      
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
        name: `Бар пользователя ${displayName}`,
        location: 'Не указано',
        ownerUserId: user.uid,
      };
      batch.set(barRef, newBar);

      // 3. Set display name on the auth user object itself
      batch.commit();
      return updateProfile(user, { displayName: displayName });
    })
    .catch(error => {
      // Let the UI handle showing the error toast.
      // This function shouldn't have UI side-effects.
      console.error("Error during sign-up and data creation:", error);
      throw error; // Re-throw to be caught by the form handler
    });
}


/** Initiate email/password sign-in (non-blocking). */
export async function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    // If the user document doesn't exist, it's likely a user from before the create logic was added.
    if (!userDoc.exists()) {
        const batch = writeBatch(firestore);
        
        const displayName = user.displayName || user.email?.split('@')[0] || 'Пользователь';

        // 1. Create User document
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
            name: `Бар пользователя ${displayName}`,
            location: 'Не указано',
            ownerUserId: user.uid,
        };
        batch.set(barRef, newBar);

        // 3. Update auth profile if needed
        if (!user.displayName) {
          updateProfile(user, { displayName: displayName });
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
