import { renderHook, waitFor, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Should still be initial

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should cancel previous debounce on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'first', delay: 500 },
      }
    );

    rerender({ value: 'second', delay: 500 });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    rerender({ value: 'third', delay: 500 });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBe('first'); // Should still be first

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('third'); // Should be the last value
  });

  it('should handle zero delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 },
      }
    );

    rerender({ value: 'updated', delay: 0 });
    await waitFor(
      () => {
        expect(result.current).toBe('updated');
      },
      {
        advanceTimers: (ms: number) => {
          act(() => {
            jest.advanceTimersByTime(ms);
          });
        },
      } as any
    );
  });
});

