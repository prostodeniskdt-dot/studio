'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getAuth,
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
      updateProfile(user, { displayName: displayName });

      return batch.commit();
    })
    .catch(error => {
      console.error("Error during sign-up and data creation:", error);
    });
}


/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): void {
  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
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

            return batch.commit();
        }
    })
    .catch(error => {
        // The onAuthStateChanged listener will handle redirects on success.
        // We only need to handle errors here, perhaps by showing a toast.
        // The global error handler should catch permission errors on write if they occur.
        console.error("Error during sign-in:", error);
    });
}