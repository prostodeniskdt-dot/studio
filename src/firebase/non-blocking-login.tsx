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
import { doc, setDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
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

  const [userDoc, barDoc] = await Promise.all([getDoc(userRef), getDoc(barRef)]);

  if (userDoc.exists() && barDoc.exists()) {
    // Everything is already in place.
    return;
  }
  
  const batch = writeBatch(firestore);
  let displayName = user.displayName || name;

  // If displayName is still not available, create a default one from email.
  if (!displayName) {
    displayName = user.email?.split('@')[0] || 'Пользователь';
    // Update the auth profile and wait for it to complete.
    await updateProfile(user, { displayName });
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
}


/** Initiate email/password sign-up and create user/bar documents reliably. */
export async function initiateEmailSignUpAndCreateUser(
  auth: Auth,
  firestore: Firestore,
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Explicitly update the profile and wait for it to complete.
  await updateProfile(user, { displayName });

  // Now that the profile is updated, create the necessary documents.
  await ensureUserAndBarDocuments(firestore, user, displayName);
  
  return userCredential;
}


/** Initiate email/password sign-in and ensure documents exist. */
export async function initiateEmailSignIn(auth: Auth, firestore: Firestore, email: string, password: string): Promise<UserCredential> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // After sign-in, ensure the user and bar documents are in place.
  // This will handle creation for users who might have been created before this logic was in place.
  await ensureUserAndBarDocuments(firestore, user);
  
  return userCredential;
}
