import { renderHook, waitFor } from '@testing-library/react';
import { useRetry } from '@/hooks/use-retry';

describe('useRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should execute function successfully on first try', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(mockFn, { maxRetries: 3 }));

    const promise = result.current.execute();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const value = await promise;
    expect(value).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('should retry on failure', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockFn, { maxRetries: 3, delay: 100 }));

    const promise = result.current.execute();
    
    // Wait for first failure
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    // Wait for second failure
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    // Wait for success
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const value = await promise;
    expect(value).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should stop retrying after maxRetries', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));
    const { result } = renderHook(() => useRetry(mockFn, { maxRetries: 2, delay: 100 }));

    const promise = result.current.execute();
    
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const value = await promise;
    expect(value).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result.current.error).toBeTruthy();
  });

  it('should use exponential backoff when enabled', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetry(mockFn, { maxRetries: 2, delay: 100, exponentialBackoff: true })
    );

    const promise = result.current.execute();
    
    // First retry should be after 100ms
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const value = await promise;
    expect(value).toBe('success');
  });
});

