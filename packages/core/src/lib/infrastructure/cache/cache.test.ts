import type { DurationUnit } from '../../types/helpers';
import { MemoryStorageDriver } from '../storage/drivers/memory_storage';
import { Cache, CACHE_EVENT_TYPES } from './cache';

describe('Cache', () => {
  let cache: Cache;
  const defaultTTL: DurationUnit = 1000;
  const gcInterval: DurationUnit = 5000;

  beforeEach(() => {
    cache = new Cache('l1', new MemoryStorageDriver(), defaultTTL, gcInterval);
  });

  afterEach(() => {
    cache.disconnect();
  });

  it('should set and get a value in the cache', async () => {
    const key = 'testKey';
    const value = 'testValue';

    await cache.set(key, value);
    const result = await cache.get<string>(key);

    expect(result).toBe(value);
  });

  it('should return null for a non-existent key', async () => {
    const result = await cache.get<string>('nonExistentKey');
    expect(result).toBeNull();
  });

  it('should delete a value from the cache', async () => {
    const key = 'testKey';
    const value = 'testValue';

    await cache.set(key, value);
    await cache.delete(key);
    const result = await cache.get<string>(key);

    expect(result).toBeNull();
  });

  it('should clear all values from the cache', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    await cache.clear();

    const result1 = await cache.get<string>('key1');
    const result2 = await cache.get<string>('key2');

    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('should return the correct expiration timestamp', async () => {
    const key = 'testKey';
    const value = 'testValue';
    const ttl = 2000;

    await cache.set(key, value, ttl);
    const expiration = await cache.expiration(key);

    expect(expiration).toBeGreaterThan(Date.now());
  });

  it('should return the correct TTL', async () => {
    const key = 'testKey';
    const value = 'testValue';
    const ttl = 2000;

    await cache.set(key, value, ttl);
    const resultTTL = await cache.ttl(key);

    expect(resultTTL).toBe(ttl);
  });

  it('should emit events when items are invalidated or updated optimistically', async () => {
    const key = 'testKey';
    const newValue = 'newValue';

    const invalidatedHandler = vi.fn();
    const optimisticUpdateBeganHandler = vi.fn();
    const optimisticUpdateEndedHandler = vi.fn();

    cache.on(CACHE_EVENT_TYPES.INVALIDATED, invalidatedHandler);
    cache.on(
      CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_BEGAN,
      optimisticUpdateBeganHandler
    );
    cache.on(
      CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_ENDED,
      optimisticUpdateEndedHandler
    );

    await cache.invalidate(key);

    // set a value to test optimistic update
    await cache.set(key, 'testValue');

    await cache.optimisticUpdate(key, newValue);

    expect(invalidatedHandler).toHaveBeenCalled();
    expect(optimisticUpdateBeganHandler).toHaveBeenCalled();
    expect(optimisticUpdateEndedHandler).toHaveBeenCalled();
  });

  it('should clear expired items from the cache', async () => {
    const key = 'testKey';
    const value = 'testValue';
    const ttl = 1; // 1 ms TTL for quick expiration

    await cache.set(key, value, ttl);
    await new Promise((resolve) => setTimeout(resolve, 10)); // wait for item to expire

    await cache.clearExpired();
    const result = await cache.get<string>(key);

    expect(result).toBeNull();
  });

  describe('Garbage Collection', () => {
    it('should clear expired items on a regular interval', async () => {
      const key = 'testKey';
      const value = 'testValue';
      const ttl = 1; // 1 ms TTL for quick expiration

      await cache.set(key, value, ttl);
      await new Promise((resolve) => setTimeout(resolve, 10)); // wait for item to expire

      await new Promise((resolve) => setTimeout(resolve, 10)); // wait for GC to run

      const result = await cache.get<string>(key);

      expect(result).toBeNull();
    });
  });

  describe('Optimistic Updates', async () => {
    it('should update the cache optimistically', async () => {
      const key = 'testKey';
      const value = 'testValue';
      const newValue = 'newValue';

      await cache.set(key, value);
      await cache.optimisticUpdate(key, newValue);

      const result = await cache.get<string>(key);

      expect(result).toBe(newValue);
    });

    it('should not update the cache if the key does not exist', async () => {
      const key = 'nonExistentKey';
      const newValue = 'newValue';

      await cache.optimisticUpdate(key, newValue);

      const result = await cache.get<string>(key);

      expect(result).toBeNull();
    });
  });

  describe('Invalidation', () => {
    it('should remove the item from the cache if layer is l1', async () => {
      const key = 'testKey';
      const value = 'testValue';

      cache = new Cache(
        'l1',
        new MemoryStorageDriver(),
        defaultTTL,
        gcInterval
      );
      await cache.set(key, value);

      await cache.invalidate(key);

      const result = await cache.get<string>(key);
      expect(result).toBeNull();
    });

    it('should emit an invalidated event if layer is l2', async () => {
      const key = 'testKey';
      const value = 'testValue';

      cache = new Cache(
        'l2',
        new MemoryStorageDriver(),
        defaultTTL,
        gcInterval
      );
      await cache.set(key, value);

      const invalidatedHandler = vi.fn();
      cache.on(CACHE_EVENT_TYPES.INVALIDATED, invalidatedHandler);

      await cache.invalidate(key);

      expect(invalidatedHandler).toHaveBeenCalledWith(key);
    });
  });

  describe('Locking', () => {
    it('should lock access to the same key', async () => {
      const key = 'testKey';
      const value1 = 'value1';
      const value2 = 'value2';

      // Set a value in the cache
      await cache.set(key, value1);

      // Create two simultaneous operations that try to get and set the same key
      const firstOperation = cache.get<string>(key);
      const secondOperation = cache.set(key, value2);

      // Wait for the first operation to complete
      const result = await firstOperation;

      // Ensure the first operation gets the correct value
      expect(result).toBe(value1);

      // Ensure the second operation has completed
      await secondOperation;

      // Check if the new value has been set
      const newValue = await cache.get<string>(key);
      expect(newValue).toBe(value2);
    });

    it('should prevent simultaneous writes', async () => {
      const key = 'testKey';
      const value1 = 'value1';
      const value2 = 'value2';

      // Create two simultaneous operations that try to set the same key
      const firstSetOperation = cache.set(key, value1);
      const secondSetOperation = cache.set(key, value2);

      // Wait for both operations to complete
      await Promise.all([firstSetOperation, secondSetOperation]);

      // Ensure the key has the last value set
      const finalValue = await cache.get<string>(key);
      expect(finalValue).toBe(value2);
    });

    it('should handle nested locks correctly', async () => {
      const key = 'testKey';
      const value = 'value';

      // Start an operation that gets the key and then sets it
      const operation = async () => {
        const existingValue = await cache.get<string>(key);
        if (!existingValue) {
          await cache.set(key, value);
        }
      };

      // Execute the operation in parallel
      const operations = [operation(), operation()];

      // Wait for all operations to complete
      await Promise.all(operations);

      // Check that the key has the expected value
      const result = await cache.get<string>(key);
      expect(result).toBe(value);
    });

    it('should release locks even after an error', async () => {
      const key = 'testKey';
      const value1 = 'value1';

      // Set a value in the cache
      await cache.set(key, value1);

      // Create an operation that will throw an error
      const faultyOperation = async () => {
        await cache.get<string>(key);
        throw new Error('Test error');
      };

      await expect(faultyOperation()).rejects.toThrow('Test error');

      // Ensure the key still exists and has the original value
      const finalValue = await cache.get<string>(key);
      expect(finalValue).toBe(value1);
    });

    it('should handle multiple concurrent locks on different keys', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const value1 = 'value1';
      const value2 = 'value2';

      // Lock two different keys and set values concurrently
      const operation1 = cache.set(key1, value1);
      const operation2 = cache.set(key2, value2);

      await Promise.all([operation1, operation2]);

      // Ensure both keys have been set correctly
      const result1 = await cache.get<string>(key1);
      const result2 = await cache.get<string>(key2);

      expect(result1).toBe(value1);
      expect(result2).toBe(value2);
    });
  });
});
