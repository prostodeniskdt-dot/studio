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
export async function deleteSessionWithLinesClient(
  firestore: Firestore,
  barId: string,
  sessionId: string
) {
  console.time("deleteSessionWithLinesClient");
  const sessionRef = doc(firestore, "bars", barId, "inventorySessions", sessionId);
  const linesCol = collection(sessionRef, "lines");

  let lastDoc: any = null;

  while (true) {
    // Create a query to fetch a batch of line documents.
    // We order by document ID (`__name__`) for stable pagination.
    const q = lastDoc
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

    // Yield to the main thread to prevent UI freezing on large deletions
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set the last document from this batch to be the starting point for the next query.
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  // After all lines are deleted, delete the main session document itself.
  await deleteDoc(sessionRef);
  console.timeEnd("deleteSessionWithLinesClient");
}
