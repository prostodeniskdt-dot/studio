// This file does not have 'use server'. It's a client-side utility.

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  startAfter,
  limit,
  writeBatch,
  deleteDoc,
  type Firestore,
  type DocumentSnapshot,
  type DocumentData,
  type Query,
} from "firebase/firestore";

/**
 * Deletes an inventory session and all its subcollection 'lines' documents in batches.
 * This is a safe way to delete a large number of subcollection documents on the client
 * without hitting Firestore's 500-operation limit per batch and without freezing the client.
 *
 * @param firestore - The Firestore instance (passed from client).
 * @param barId - The ID of the bar.
 * @param sessionId - The ID of the inventory session to delete.
 */
/**
 * Deletes an inventory session and all its subcollection 'lines' documents in batches.
 * This is a safe way to delete a large number of subcollection documents on the client
 * without hitting Firestore's 500-operation limit per batch and without freezing the client.
 *
 * @param firestore - The Firestore instance (passed from client).
 * @param barId - The ID of the bar.
 * @param sessionId - The ID of the inventory session to delete.
 * @param onProgress - Optional callback to track deletion progress (0-100).
 */
export async function deleteSessionWithLinesClient(
  firestore: Firestore,
  barId: string,
  sessionId: string,
  onProgress?: (progress: number) => void
) {
  const sessionRef = doc(firestore, "bars", barId, "inventorySessions", sessionId);
  const linesCol = collection(sessionRef, "lines");

  // First, count total documents to track progress
  let totalCount = 0;
  let lastDoc: DocumentSnapshot<DocumentData> | null = null;
  const countSnapshot = await getDocs(query(linesCol, orderBy("__name__")));
  totalCount = countSnapshot.docs.length;

  if (totalCount === 0) {
    // No lines to delete, just delete the session
    await deleteDoc(sessionRef);
    onProgress?.(100);
    return;
  }

  let deletedCount = 0;
  lastDoc = null;

  while (true) {
    // Create a query to fetch a batch of line documents.
    // We order by document ID (`__name__`) for stable pagination.
    const q: Query<DocumentData> = lastDoc
      ? query(linesCol, orderBy("__name__"), startAfter(lastDoc), limit(450))
      : query(linesCol, orderBy("__name__"), limit(450));

    const snapshot = await getDocs(q);
    
    // If no documents are returned, we're done deleting the subcollection.
    if (snapshot.empty) {
      break;
    }

    // Create a new batch and delete the documents from the current snapshot.
    const batch = writeBatch(firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    deletedCount += snapshot.docs.length;
    const progress = Math.round((deletedCount / totalCount) * 100);
    onProgress?.(progress);

    // Yield to the main thread to prevent UI freezing on large deletions
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set the last document from this batch to be the starting point for the next query.
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  // After all lines are deleted, delete the main session document itself.
  await deleteDoc(sessionRef);
  onProgress?.(100);
}
