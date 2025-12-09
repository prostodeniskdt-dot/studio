'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
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
      
      // We need to set the user's profile and create their first bar.
      // A batch write ensures both operations succeed or fail together.
      const batch = writeBatch(firestore);

      // 1. Create User document
      const userRef = doc(firestore, 'users', user.uid);
      const newUser = {
          id: user.uid,
          displayName: displayName,
          email: user.email,
          role: 'manager', // Default role for a new user
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

      // Commit the batch
      return batch.commit();
    })
    .catch(error => {
      // The onAuthStateChanged listener will handle redirects on success.
      // We only need to handle errors here, perhaps by showing a toast.
      // The global error handler should catch permission errors on write if they occur.
      console.error("Error during sign-up and data creation:", error);
    });
}


/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password);
}
