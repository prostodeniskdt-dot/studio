import { deleteSessionWithLinesClient } from '@/lib/firestore-utils';
import { collection, doc, getDocs, query, orderBy, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  writeBatch: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
}));

describe('deleteSessionWithLinesClient', () => {
  let mockFirestore: jest.Mocked<Firestore>;
  let mockBatch: any;
  let mockOnProgress: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnProgress = jest.fn();
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
    (doc as jest.Mock).mockImplementation((...pathSegments) => ({
      id: pathSegments[pathSegments.length - 1],
      path: pathSegments.join('/'),
    }));
    (collection as jest.Mock).mockImplementation((parentRef, ...pathSegments) => ({
      id: pathSegments[pathSegments.length - 1],
      path: `${parentRef.path}/${pathSegments.join('/')}`,
    }));
  });

  it('should delete session and all lines', async () => {
    const mockLines = [
      { id: 'line1', ref: { id: 'line1' } },
      { id: 'line2', ref: { id: 'line2' } },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: mockLines,
    }).mockResolvedValueOnce({
      docs: [],
    });

    await deleteSessionWithLinesClient(mockFirestore, 'bar1', 'session1', mockOnProgress);

    expect(mockBatch.delete).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(mockOnProgress).toHaveBeenCalled();
  });

  it('should handle empty lines collection', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [],
    });

    await deleteSessionWithLinesClient(mockFirestore, 'bar1', 'session1', mockOnProgress);

    expect(mockBatch.delete).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('should call onProgress callback', async () => {
    const mockLines = Array.from({ length: 10 }, (_, i) => ({ id: `line${i}`, ref: { id: `line${i}` } }));

    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: mockLines,
    }).mockResolvedValueOnce({
      docs: [],
    });

    await deleteSessionWithLinesClient(mockFirestore, 'bar1', 'session1', mockOnProgress);

    expect(mockOnProgress).toHaveBeenCalled();
    const progressValues = mockOnProgress.mock.calls.map(call => call[0]);
    expect(progressValues.some(val => val === 100)).toBe(true);
  });
});

