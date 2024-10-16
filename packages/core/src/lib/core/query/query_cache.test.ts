import { Cache } from '../../infrastructure/cache/cache';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import type { QueryCacheOptions, QueryInput } from '../../types/core/query';
import { QueryCache } from './query_cache';
import { QueryKeyResolver } from './query_key_resolver';

describe('QueryCache', () => {
  let queryCache: QueryCache;
  let l1Cache: Cache;
  let l2Cache: Cache;
  const resolver = new QueryKeyResolver();

  beforeEach(() => {
    const options: QueryCacheOptions = {
      l1: {},
      l2: { driver: new MemoryStorageDriver() },
    };

    queryCache = new QueryCache(options);
    l1Cache = queryCache.l1;
    l2Cache = queryCache.l2;
  });

  it('should store and retrieve a value from the cache', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    queryCache.set(query, value);

    const cachedValue = await queryCache.get<typeof value>(query);
    expect(cachedValue).toEqual(value);
  });

  it('should promote a value from l2 to l1 cache', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    l2Cache.set(resolver.generateKey(query), value);

    const cachedValue = await queryCache.get<typeof value>(query);
    expect(cachedValue).toEqual(value);

    const l1CachedValue = await l1Cache.get<typeof value>(
      resolver.generateKey(query)
    );
    expect(l1CachedValue).toEqual(value);
  });

  it('should delete a value from both caches', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    queryCache.set(query, value);
    await queryCache.delete(query);

    const l1CachedValue = await l1Cache.get<typeof value>(
      resolver.generateKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      resolver.generateKey(query)
    );

    expect(l1CachedValue).toBeNull();
    expect(l2CachedValue).toBeNull();
  });

  it('should clear both caches', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    await queryCache.set(query, value);
    await queryCache.clear();

    const l1CachedValue = await l1Cache.get<typeof value>(
      resolver.generateKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      resolver.generateKey(query)
    );

    expect(l1CachedValue).toBeNull();
    expect(l2CachedValue).toBeNull();
  });

  it('should handle optimistic updates', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };
    const newValue = { data: 'newData' };

    await queryCache.set(query, value);

    await queryCache.optimisticUpdate(query, newValue);

    const l1CachedValue = await l1Cache.get<typeof value>(
      resolver.generateKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      resolver.generateKey(query)
    );

    expect(l1CachedValue).toEqual(newValue);
    expect(l2CachedValue).toEqual(value);
  });

  it('should disconnect caches and subscription manager', () => {
    const l1DisconnectSpy = vi.spyOn(l1Cache, 'disconnect');
    const l2DisconnectSpy = vi.spyOn(l2Cache, 'disconnect');

    queryCache.disconnect();

    expect(l1DisconnectSpy).toHaveBeenCalled();
    expect(l2DisconnectSpy).toHaveBeenCalled();
  });

  it('should retrieve an entry from the cache', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    await queryCache.set(query, value);

    const cachedEntry = await queryCache.getEntry<typeof value>(query);
    expect(cachedEntry?.value).toEqual(value);
  });

  it('should promote an entry from l2 to l1 cache', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    await l2Cache.set(resolver.generateKey(query), value);

    const cachedEntry = await queryCache.getEntry<typeof value>(query);
    expect(cachedEntry?.value).toEqual(value);

    const l1CachedEntry = await l1Cache.getEntry<typeof value>(
      resolver.generateKey(query)
    );
    expect(l1CachedEntry?.value).toEqual(value);
  });

  it('should return null if entry is not found in both caches', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };

    const cachedEntry = await queryCache.getEntry<typeof query>(query);
    expect(cachedEntry).toBeNull();
  });

  it('should handle cache key generation correctly', () => {
    const query1: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const query2: QueryInput = { queryName: 'testQuery', payload: { id: 2 } };

    const key1 = resolver.generateKey(query1);
    const key2 = resolver.generateKey(query2);

    expect(key1).not.toEqual(key2); // Ensure keys are unique for different payloads
    expect(typeof key1).toBe('string'); // Check that the key is a string
  });

  it('should handle missing query parameters gracefully', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: {} }; // Missing ID

    const value = { data: 'testData' };
    await queryCache.set(
      {
        queryName: 'testQuery',
        payload: { id: 1 },
      },
      value
    );

    const cachedValue = await queryCache.get<typeof value>(query);
    expect(cachedValue).toBeNull();
  });

  it('should handle concurrent access', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    await Promise.all([
      queryCache.set(query, value),
      queryCache.set(query, { data: 'otherData' }),
    ]);

    const cachedValue = await queryCache.get<typeof value>(query);
    expect(cachedValue).toBeDefined(); // Ensure no race condition occurred
  });

  describe('Invalidation', () => {
    it('should invalidate target query', async () => {
      const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
      const value = { data: 'testData' };

      await queryCache.set(query, value);

      await queryCache.invalidateQueries(query);

      const l1CachedValue = await l1Cache.get<typeof value>(
        resolver.generateKey(query)
      );
      const l2CachedValue = await l2Cache.get<typeof value>(
        resolver.generateKey(query)
      );

      expect(l1CachedValue).toBeNull();
      expect(l2CachedValue).toEqual(value);
    });

    it('should invalidate all queries with the same query name', async () => {
      const query1: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
      const query2: QueryInput = { queryName: 'testQuery', payload: { id: 2 } };
      const value = { data: 'testData' };

      await queryCache.set(query1, value);
      await queryCache.set(query2, value);

      const spyOnL1CacheInvalidate = vi.spyOn(l1Cache, 'invalidate');

      await queryCache.invalidateQueries({ queryName: 'testQuery' });

      const l1CachedValue1 = await l1Cache.get<typeof value>(
        resolver.generateKey(query1)
      );
      const l1CachedValue2 = await l1Cache.get<typeof value>(
        resolver.generateKey(query2)
      );
      const l2CachedValue1 = await l2Cache.get<typeof value>(
        resolver.generateKey(query1)
      );
      const l2CachedValue2 = await l2Cache.get<typeof value>(
        resolver.generateKey(query2)
      );

      expect(l1CachedValue1).toBeNull();
      expect(l1CachedValue2).toBeNull();
      expect(l2CachedValue1).toEqual(value);
      expect(l2CachedValue2).toEqual(value);

      expect(spyOnL1CacheInvalidate).toHaveBeenCalledTimes(2);
      expect(spyOnL1CacheInvalidate).toHaveBeenCalledWith(
        resolver.generateKey(query1)
      );
      expect(spyOnL1CacheInvalidate).toHaveBeenCalledWith(
        resolver.generateKey(query2)
      );
    });
  });
});
