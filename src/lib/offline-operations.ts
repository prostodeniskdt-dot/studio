/**
 * Types and utilities for offline operations
 */

import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { logger } from './logger';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  path: string;
  data?: unknown;
  timestamp: number;
  retryCount?: number;
}

export interface ParsedPath {
  collection: string;
  documentId?: string;
  subcollection?: string;
  subdocumentId?: string;
  nestedSubcollection?: string;
  nestedDocumentId?: string;
}

/**
 * Parse Firestore path into structured components
 * Examples:
 * - "bars/bar_123/inventorySessions/session_456" -> { collection: 'bars', documentId: 'bar_123', subcollection: 'inventorySessions', subdocumentId: 'session_456' }
 * - "products/prod_123" -> { collection: 'products', documentId: 'prod_123' }
 */
export function parseFirestorePath(path: string): ParsedPath {
  const parts = path.split('/').filter(p => p.length > 0);
  
  if (parts.length === 0) {
    throw new Error(`Invalid Firestore path: ${path}`);
  }

  const result: ParsedPath = {
    collection: parts[0],
  };

  if (parts.length >= 2) {
    result.documentId = parts[1];
  }

  if (parts.length >= 3) {
    result.subcollection = parts[2];
  }

  if (parts.length >= 4) {
    result.subdocumentId = parts[3];
  }

  if (parts.length >= 5) {
    result.nestedSubcollection = parts[4];
  }

  if (parts.length >= 6) {
    result.nestedDocumentId = parts[5];
  }

  return result;
}

/**
 * Build Firestore document reference from parsed path
 */
export function buildDocumentRef(firestore: Firestore, parsed: ParsedPath) {
  if (!parsed.documentId) {
    throw new Error(`Cannot build document reference without documentId: ${parsed.collection}`);
  }

  let ref = doc(firestore, parsed.collection, parsed.documentId);

  if (parsed.subcollection && parsed.subdocumentId) {
    ref = doc(ref, parsed.subcollection, parsed.subdocumentId);
  }

  if (parsed.nestedSubcollection && parsed.nestedDocumentId) {
    ref = doc(ref, parsed.nestedSubcollection, parsed.nestedDocumentId);
  }

  return ref;
}

/**
 * Execute a Firestore create operation
 */
export async function executeCreate(
  firestore: Firestore,
  parsed: ParsedPath,
  data: unknown
): Promise<void> {
  if (!parsed.documentId) {
    throw new Error('Create operation requires documentId');
  }

  const ref = buildDocumentRef(firestore, parsed);
  await setDoc(ref, data as any);
  logger.log(`Created document at ${parsed.collection}/${parsed.documentId}${parsed.subcollection ? `/${parsed.subcollection}/${parsed.subdocumentId}` : ''}`);
}

/**
 * Execute a Firestore update operation
 */
export async function executeUpdate(
  firestore: Firestore,
  parsed: ParsedPath,
  data: unknown
): Promise<void> {
  if (!parsed.documentId) {
    throw new Error('Update operation requires documentId');
  }

  const ref = buildDocumentRef(firestore, parsed);
  
  // Check if document exists before updating
  const docSnapshot = await getDoc(ref);
  if (!docSnapshot.exists()) {
    const pathStr = `${parsed.collection}/${parsed.documentId}${parsed.subcollection ? `/${parsed.subcollection}/${parsed.subdocumentId}` : ''}`;
    throw new Error(`Document does not exist: ${pathStr}`);
  }

  await updateDoc(ref, data as any);
  logger.log(`Updated document at ${parsed.collection}/${parsed.documentId}${parsed.subcollection ? `/${parsed.subcollection}/${parsed.subdocumentId}` : ''}`);
}

/**
 * Execute a Firestore delete operation
 */
export async function executeDelete(
  firestore: Firestore,
  parsed: ParsedPath
): Promise<void> {
  if (!parsed.documentId) {
    throw new Error('Delete operation requires documentId');
  }

  const ref = buildDocumentRef(firestore, parsed);
  await deleteDoc(ref);
  logger.log(`Deleted document at ${parsed.collection}/${parsed.documentId}${parsed.subcollection ? `/${parsed.subcollection}/${parsed.subdocumentId}` : ''}`);
}

/**
 * Execute a queued operation
 */
export async function executeOperation(
  firestore: Firestore,
  operation: QueuedOperation
): Promise<void> {
  const parsed = parseFirestorePath(operation.path);

  try {
    switch (operation.type) {
      case 'create':
        if (!operation.data) {
          throw new Error('Create operation requires data');
        }
        await executeCreate(firestore, parsed, operation.data);
        break;
      
      case 'update':
        if (!operation.data) {
          throw new Error('Update operation requires data');
        }
        await executeUpdate(firestore, parsed, operation.data);
        break;
      
      case 'delete':
        await executeDelete(firestore, parsed);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  } catch (error) {
    logger.error(`Failed to execute operation ${operation.id} at path ${operation.path}:`, error);
    throw error;
  }
}

/**
 * Validate operation data before execution
 */
export function validateOperation(operation: QueuedOperation): { valid: boolean; error?: string } {
  if (!operation.path || operation.path.trim().length === 0) {
    return { valid: false, error: 'Operation path is required' };
  }

  if (!operation.type || !['create', 'update', 'delete'].includes(operation.type)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if ((operation.type === 'create' || operation.type === 'update') && !operation.data) {
    return { valid: false, error: `${operation.type} operation requires data` };
  }

  // Validate path format
  try {
    parseFirestorePath(operation.path);
  } catch (error) {
    return { valid: false, error: `Invalid path format: ${error instanceof Error ? error.message : String(error)}` };
  }

  return { valid: true };
}

