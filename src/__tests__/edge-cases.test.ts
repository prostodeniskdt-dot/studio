import {
  safeParseNumber,
  safeGet,
  isEmptyArray,
  safeFormatDate,
  debounce,
  retryWithBackoff,
  validateRequired,
} from '@/lib/edge-cases';

describe('edge-cases', () => {
  describe('safeParseNumber', () => {
    it('should parse valid numbers', () => {
      expect(safeParseNumber(42)).toBe(42);
      expect(safeParseNumber(0)).toBe(0);
      expect(safeParseNumber(-10)).toBe(-10);
      expect(safeParseNumber(3.14)).toBe(3.14);
    });

    it('should parse string numbers', () => {
      expect(safeParseNumber('42')).toBe(42);
      expect(safeParseNumber('0')).toBe(0);
      expect(safeParseNumber('-10')).toBe(-10);
      expect(safeParseNumber('3.14')).toBe(3.14);
    });

    it('should return 0 for invalid values', () => {
      expect(safeParseNumber('invalid')).toBe(0);
      expect(safeParseNumber('')).toBe(0);
      expect(safeParseNumber(null)).toBe(0);
      expect(safeParseNumber(undefined)).toBe(0);
      expect(safeParseNumber({})).toBe(0);
      expect(safeParseNumber([])).toBe(0);
    });

    it('should handle NaN', () => {
      expect(safeParseNumber(NaN)).toBe(0);
      expect(safeParseNumber(Number.NaN)).toBe(0);
    });
  });

  describe('safeGet', () => {
    const testObj = {
      level1: {
        level2: {
          level3: 'value',
          number: 42,
        },
        array: [1, 2, 3],
      },
      nullValue: null,
      undefinedValue: undefined,
    };

    it('should get nested values', () => {
      expect(safeGet(testObj, 'level1.level2.level3', 'default')).toBe('value');
      expect(safeGet(testObj, 'level1.level2.number', 0)).toBe(42);
    });

    it('should return fallback for missing paths', () => {
      expect(safeGet(testObj, 'level1.missing', 'default')).toBe('default');
      expect(safeGet(testObj, 'missing.path', 'default')).toBe('default');
    });

    it('should return fallback for null values', () => {
      expect(safeGet(testObj, 'nullValue', 'default')).toBe('default');
    });

    it('should return fallback for undefined values', () => {
      expect(safeGet(testObj, 'undefinedValue', 'default')).toBe('default');
    });

    it('should return fallback for non-objects', () => {
      expect(safeGet(null, 'path', 'default')).toBe('default');
      expect(safeGet(undefined, 'path', 'default')).toBe('default');
      expect(safeGet('string', 'path', 'default')).toBe('default');
      expect(safeGet(42, 'path', 'default')).toBe('default');
    });

    it('should handle empty path', () => {
      expect(safeGet(testObj, '', 'default')).toBe('default');
    });
  });

  describe('isEmptyArray', () => {
    it('should return true for empty arrays', () => {
      expect(isEmptyArray([])).toBe(true);
    });

    it('should return true for null/undefined', () => {
      expect(isEmptyArray(null)).toBe(true);
      expect(isEmptyArray(undefined)).toBe(true);
    });

    it('should return false for non-empty arrays', () => {
      expect(isEmptyArray([1])).toBe(false);
      expect(isEmptyArray([1, 2, 3])).toBe(false);
      expect(isEmptyArray(['a'])).toBe(false);
    });
  });

  describe('safeFormatDate', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15');
      const result = safeFormatDate(date);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/01|1/);
      expect(result).toMatch(/2024/);
    });

    it('should handle Firestore Timestamps with toDate method', () => {
      const mockTimestamp = {
        toDate: () => new Date('2024-01-15'),
        seconds: 1705276800,
      };
      const result = safeFormatDate(mockTimestamp);
      expect(result).toMatch(/15/);
    });

    it('should handle Firestore Timestamps with seconds property', () => {
      const mockTimestamp = {
        seconds: 1705276800,
      };
      const result = safeFormatDate(mockTimestamp);
      expect(result).toBeTruthy();
    });

    it('should handle string dates', () => {
      const result = safeFormatDate('2024-01-15');
      expect(result).toBeTruthy();
    });

    it('should return empty string for invalid values', () => {
      expect(safeFormatDate(null)).toBe('');
      expect(safeFormatDate(undefined)).toBe('');
      expect(safeFormatDate('invalid')).toBe('');
      expect(safeFormatDate({})).toBe('');
    });

    it('should use custom locale', () => {
      const date = new Date('2024-01-15');
      const result = safeFormatDate(date, 'en-US');
      expect(result).toMatch(/1/); // US format
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      jest.advanceTimersByTime(50);
      debouncedFunc();
      jest.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, 3, 100);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      jest.useFakeTimers();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, 3, 100);
      
      // First retry after 100ms
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      
      // Second retry after 200ms
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      
      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle non-Error rejections', async () => {
      const fn = jest.fn().mockRejectedValue('string error');
      
      await expect(retryWithBackoff(fn, 1, 10)).rejects.toThrow();
    });
  });

  describe('validateRequired', () => {
    it('should validate all required fields present', () => {
      const obj = {
        name: 'Test',
        email: 'test@example.com',
        age: 25,
      };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing fields', () => {
      const obj = {
        name: 'Test',
        email: '',
        age: 25,
      };
      const result = validateRequired(obj, ['name', 'email', 'phone']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('email');
      expect(result.missing).toContain('phone');
    });

    it('should detect null values', () => {
      const obj = {
        name: 'Test',
        email: null,
      };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('email');
    });

    it('should detect undefined values', () => {
      const obj = {
        name: 'Test',
      };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('email');
    });

    it('should handle empty object', () => {
      const obj = {};
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name', 'email']);
    });

    it('should handle zero and false as valid values', () => {
      const obj = {
        count: 0,
        active: false,
      };
      const result = validateRequired(obj, ['count', 'active']);
      expect(result.valid).toBe(true);
    });
  });
});

