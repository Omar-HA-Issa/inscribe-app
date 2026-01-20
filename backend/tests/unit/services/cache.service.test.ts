import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../../../src/core/services/cache.service';

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CacheService', () => {
  let cache: CacheService<string>;

  beforeEach(() => {
    cache = new CacheService<string>(10);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key1', 'value2', 60000);
      expect(cache.get('key1')).toBe('value2');
    });

    it('should return null for expired entry', () => {
      cache.set('key1', 'value1', 1000); // 1 second TTL

      // Advance time past expiration
      vi.advanceTimersByTime(1500);

      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire entry before TTL', () => {
      cache.set('key1', 'value1', 5000); // 5 second TTL

      // Advance time but not past expiration
      vi.advanceTimersByTime(4000);

      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('has', () => {
    it('should return true for existing valid entry', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entry', () => {
      cache.set('key1', 'value1', 1000);
      vi.advanceTimersByTime(1500);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 60000);

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should reset size to 0', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct size and maxSize', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(10);
    });

    it('should update size when entries are added', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('size limit and eviction', () => {
    it('should evict oldest entry when max size is reached', () => {
      const smallCache = new CacheService<string>(3);

      smallCache.set('key1', 'value1', 60000);
      smallCache.set('key2', 'value2', 60000);
      smallCache.set('key3', 'value3', 60000);

      // Adding fourth entry should evict the first
      smallCache.set('key4', 'value4', 60000);

      expect(smallCache.get('key1')).toBeNull(); // Evicted
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');
    });

    it('should not evict when updating existing key at max size', () => {
      const smallCache = new CacheService<string>(3);

      smallCache.set('key1', 'value1', 60000);
      smallCache.set('key2', 'value2', 60000);
      smallCache.set('key3', 'value3', 60000);

      // Updating existing key should not trigger eviction
      smallCache.set('key2', 'updated', 60000);

      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBe('updated');
      expect(smallCache.get('key3')).toBe('value3');
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value if exists', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed');
      cache.set('key1', 'cached', 60000);

      const result = await cache.getOrCompute('key1', computeFn, 60000);

      expect(result).toBe('cached');
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed');

      const result = await cache.getOrCompute('key1', computeFn, 60000);

      expect(result).toBe('computed');
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toBe('computed');
    });

    it('should compute value if cached value is expired', async () => {
      const computeFn = vi.fn().mockResolvedValue('newValue');
      cache.set('key1', 'oldValue', 1000);

      vi.advanceTimersByTime(1500);

      const result = await cache.getOrCompute('key1', computeFn, 60000);

      expect(result).toBe('newValue');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('different value types', () => {
    it('should work with object values', () => {
      const objectCache = new CacheService<{ name: string }>(10);
      const obj = { name: 'test' };

      objectCache.set('key1', obj, 60000);

      expect(objectCache.get('key1')).toEqual(obj);
    });

    it('should work with array values', () => {
      const arrayCache = new CacheService<number[]>(10);
      const arr = [1, 2, 3];

      arrayCache.set('key1', arr, 60000);

      expect(arrayCache.get('key1')).toEqual(arr);
    });

    it('should work with null-ish false values', () => {
      const boolCache = new CacheService<boolean>(10);

      boolCache.set('key1', false, 60000);

      // Note: This tests that false is returned, not null
      expect(boolCache.get('key1')).toBe(false);
    });
  });
});
