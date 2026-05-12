import { renderHook, act } from '@testing-library/react';
import { useRetry } from '@/hooks/use-retry';

describe('useRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should execute function successfully on first try', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry<string>(mockFn, { maxRetries: 3 }));

    let value: string | null = null;
    await act(async () => {
      value = await result.current.execute();
    });

    expect(value).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should retry on failure', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() =>
      useRetry<string>(mockFn, { maxRetries: 3, delay: 100 })
    );

    let value: string | null = null;
    await act(async () => {
      const p = result.current.execute();
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      value = await p;
    });

    expect(value).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should stop retrying after maxRetries', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));
    const { result } = renderHook(() =>
      useRetry<string>(mockFn, { maxRetries: 2, delay: 100 })
    );

    let value: string | null = 'pending';
    await act(async () => {
      const p = result.current.execute();
      await jest.runAllTimersAsync();
      value = await p;
    });

    expect(value).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use exponential backoff when enabled', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() =>
      useRetry<string>(mockFn, {
        maxRetries: 2,
        delay: 100,
        exponentialBackoff: true,
      })
    );

    let value: string | null = null;
    await act(async () => {
      const p = result.current.execute();
      await jest.advanceTimersByTimeAsync(100);
      value = await p;
    });

    expect(value).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
