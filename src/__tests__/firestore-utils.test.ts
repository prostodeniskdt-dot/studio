import { deleteSessionWithLinesClient } from '@/lib/firestore-utils';
import type { Firestore } from 'firebase/firestore';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => {
  const mockDocs: any[] = [];
  let mockDocCounter = 0;

  return {
    collection: jest.fn((ref: any, ...path: string[]) => ({
      id: path[path.length - 1] || 'collection',
      parent: ref,
      path: ref ? `${ref.path}/${path.join('/')}` : path.join('/'),
    })),
    doc: jest.fn((ref: any, ...path: string[]) => ({
      id: path[path.length - 1] || `doc_${mockDocCounter++}`,
      parent: ref,
      path: ref ? `${ref.path}/${path.join('/')}` : path.join('/'),
    })),
    getDocs: jest.fn(async (query: any) => ({
      docs: mockDocs,
      empty: mockDocs.length === 0,
    })),
    query: jest.fn((ref: any, ...constraints: any[]) => ref),
    orderBy: jest.fn((field: string) => ({ type: 'orderBy', field })),
    startAfter: jest.fn((doc: any) => ({ type: 'startAfter', doc })),
    limit: jest.fn((count: number) => ({ type: 'limit', count })),
    writeBatch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(async () => {
        // Simulate batch commit
        mockDocs.length = 0;
      }),
    })),
    deleteDoc: jest.fn(async () => {}),
  };
});

describe('firestore-utils', () => {
  let mockFirestore: Firestore;
  const mockBarId = 'bar_test123';
  const mockSessionId = 'session_test123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore = {} as Firestore;
  });

  describe('deleteSessionWithLinesClient', () => {
    it('should delete session when no lines exist', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({ docs: [], empty: true });

      const onProgress = jest.fn();
      await deleteSessionWithLinesClient(mockFirestore, mockBarId, mockSessionId, onProgress);

      const { deleteDoc } = require('firebase/firestore');
      expect(deleteDoc).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should delete session and lines in batches', async () => {
      const { getDocs, writeBatch } = require('firebase/firestore');
      
      // Mock 500 documents (one batch)
      const mockDocs = Array.from({ length: 500 }, (_, i) => ({
        id: `line_${i}`,
        ref: { id: `line_${i}` },
      }));

      // First call for counting
      getDocs.mockResolvedValueOnce({ docs: mockDocs, empty: false });
      // Second call for deletion (empty after deletion)
      getDocs.mockResolvedValueOnce({ docs: [], empty: true });

      const onProgress = jest.fn();
      await deleteSessionWithLinesClient(mockFirestore, mockBarId, mockSessionId, onProgress);

      expect(writeBatch).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle large number of lines (multiple batches)', async () => {
      const { getDocs, writeBatch } = require('firebase/firestore');
      
      // Mock 1000 documents (requires multiple batches)
      const firstBatch = Array.from({ length: 450 }, (_, i) => ({
        id: `line_${i}`,
        ref: { id: `line_${i}` },
      }));
      const secondBatch = Array.from({ length: 450 }, (_, i) => ({
        id: `line_${i + 450}`,
        ref: { id: `line_${i + 450}` },
      }));
      const thirdBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `line_${i + 900}`,
        ref: { id: `line_${i + 900}` },
      }));

      // First call for counting
      getDocs.mockResolvedValueOnce({ 
        docs: [...firstBatch, ...secondBatch, ...thirdBatch], 
        empty: false 
      });
      // Subsequent calls for pagination
      getDocs
        .mockResolvedValueOnce({ docs: firstBatch, empty: false })
        .mockResolvedValueOnce({ docs: secondBatch, empty: false })
        .mockResolvedValueOnce({ docs: thirdBatch, empty: false })
        .mockResolvedValueOnce({ docs: [], empty: true });

      const onProgress = jest.fn();
      await deleteSessionWithLinesClient(mockFirestore, mockBarId, mockSessionId, onProgress);

      expect(writeBatch).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should call onProgress with correct values', async () => {
      const { getDocs } = require('firebase/firestore');
      
      const mockDocs = Array.from({ length: 200 }, (_, i) => ({
        id: `line_${i}`,
        ref: { id: `line_${i}` },
      }));

      getDocs
        .mockResolvedValueOnce({ docs: mockDocs, empty: false })
        .mockResolvedValueOnce({ docs: mockDocs.slice(0, 200), empty: false })
        .mockResolvedValueOnce({ docs: [], empty: true });

      const onProgress = jest.fn();
      await deleteSessionWithLinesClient(mockFirestore, mockBarId, mockSessionId, onProgress);

      // Should be called multiple times with increasing progress
      expect(onProgress).toHaveBeenCalled();
      const progressCalls = onProgress.mock.calls.map(call => call[0]);
      expect(progressCalls[progressCalls.length - 1]).toBe(100);
    });

    it('should handle errors in onProgress callback gracefully', async () => {
      const { getDocs } = require('firebase/firestore');
      
      getDocs.mockResolvedValueOnce({ docs: [], empty: true });

      const onProgress = jest.fn(() => {
        throw new Error('Progress callback error');
      });

      // Should not throw
      await expect(
        deleteSessionWithLinesClient(mockFirestore, mockBarId, mockSessionId, onProgress)
      ).resolves.not.toThrow();
    });
  });
});
