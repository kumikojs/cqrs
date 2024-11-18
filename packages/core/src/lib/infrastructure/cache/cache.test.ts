import { MemoryStorageDriver } from '../storage/drivers/memory_storage';
import { Cache, CACHE_EVENT_TYPES } from './cache';

describe('Cache', () => {
  let cache: Cache;
  let storage: MemoryStorageDriver;

  beforeEach(() => {
    storage = new MemoryStorageDriver();
    cache = new Cache({
      name: 'test',
      storage,
      validityPeriod: '1ms',
      cacheTime: '1ms',
      gcInterval: '5ms',
    });
  });

  afterEach(() => {
    cache.disconnect();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cache.set('key', 'value', {
        validityPeriod: '1h',
        cacheTime: '2h',
      });
      const result = await cache.get<string>('key');
      expect(result.data).toBe('value');
      expect(result.isStale).toBe(false);
    });

    it('should handle complex values', async () => {
      const complexValue = { test: 'value', nested: { data: [1, 2, 3] } };
      await cache.set('key', complexValue);
      const result = await cache.get<typeof complexValue>('key');
      expect(result.data).toEqual(complexValue);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result.data).toBeUndefined();
    });

    it('should handle null values', async () => {
      await cache.set('key', null);
      const result = await cache.get<null>('key');
      expect(result.data).toBeNull();
    });
  });

  describe('Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllTimers();
    });

    it('should handle stale entries', async () => {
      await cache.set('key', 'value', {
        validityPeriod: '1ms',
        cacheTime: '100ms',
      });
      vi.advanceTimersByTime(2);

      const result = await cache.get<string>('key');
      expect(result.data).toBe('value');
      expect(result.isStale).toBe(true);
    });

    it('should handle deleted entries', async () => {
      await cache.set('key', 'value', {
        validityPeriod: '1ms',
        cacheTime: '2ms',
      });
      vi.advanceTimersByTime(3);

      const result = await cache.get<string>('key');
      expect(result.data).toBeUndefined();
      expect(result.isStale).toBe(false);
    });

    it('should handle garbage collection', async () => {
      // Set up a cache with a short cache time and validity period
      cache = new Cache({
        name: 'test',
        storage,
        validityPeriod: '1ms',
        cacheTime: '1ms',
        gcInterval: '5ms',
      });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Advance time to trigger garbage collection
      vi.advanceTimersByTime(10);

      const results = await Promise.all([
        cache.get('key1'),
        cache.get('key2'),
        cache.get('key3'),
      ]);

      results.forEach((result) => {
        expect(result.data).toBeUndefined();
      });
    });
  });

  describe('Events', () => {
    it('should emit events for operations', async () => {
      const removedHandler = vi.fn();
      const invalidatedHandler = vi.fn();

      cache.on(CACHE_EVENT_TYPES.REMOVED, removedHandler);
      cache.on(CACHE_EVENT_TYPES.INVALIDATED, invalidatedHandler);

      await cache.set('key', 'value');
      await cache.set('key2', 'value');
      await cache.delete('key');
      await cache.invalidate('key2');

      expect(removedHandler).toHaveBeenCalledWith('key');
      expect(invalidatedHandler).toHaveBeenCalledWith('key2');
    });

    it('should allow handler removal', async () => {
      const handler = vi.fn();
      const unsubscribe = cache.on(CACHE_EVENT_TYPES.REMOVED, handler);

      unsubscribe();
      await cache.delete('key');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Lock Management', () => {
    it('should handle concurrent operations', async () => {
      const operations = [
        cache.set('key', 'value1'),
        cache.set('key', 'value2'),
        cache.get('key'),
        cache.delete('key'),
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });
});
