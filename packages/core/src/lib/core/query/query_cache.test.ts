import { Cache } from '../../infrastructure/cache/cache';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import type { QueryCacheOptions, QueryInput } from '../../types/core/query';
import { QueryCache } from './query_cache';

describe('QueryCache', () => {
  let queryCache: QueryCache;
  let l1Cache: Cache;
  let l2Cache: Cache;

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

    l2Cache.set(queryCache.getCacheKey(query), value);

    const cachedValue = await queryCache.get<typeof value>(query);
    expect(cachedValue).toEqual(value);

    const l1CachedValue = await l1Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );
    expect(l1CachedValue).toEqual(value);
  });

  it('should delete a value from both caches', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    queryCache.set(query, value);
    await queryCache.delete(query);

    const l1CachedValue = await l1Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      queryCache.getCacheKey(query)
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
      queryCache.getCacheKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );

    expect(l1CachedValue).toBeNull();
    expect(l2CachedValue).toBeNull();
  });

  it('should invalidate queries', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };

    await queryCache.set(query, value);

    queryCache.invalidateQueries(query);

    const l1CachedValue = await l1Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );

    expect(l1CachedValue).toBeNull();
    expect(l2CachedValue).toEqual(value);
  });

  it('should handle optimistic updates', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
    const value = { data: 'testData' };
    const newValue = { data: 'newData' };

    await queryCache.set(query, value);

    await queryCache.optimisticUpdate(query, newValue);

    const l1CachedValue = await l1Cache.get<typeof value>(
      queryCache.getCacheKey(query)
    );
    const l2CachedValue = await l2Cache.get<typeof value>(
      queryCache.getCacheKey(query)
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

    await l2Cache.set(queryCache.getCacheKey(query), value);

    const cachedEntry = await queryCache.getEntry<typeof value>(query);
    expect(cachedEntry?.value).toEqual(value);

    const l1CachedEntry = await l1Cache.getEntry<typeof value>(
      queryCache.getCacheKey(query)
    );
    expect(l1CachedEntry?.value).toEqual(value);
  });

  it('should return null if entry is not found in both caches', async () => {
    const query: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };

    const cachedEntry = await queryCache.getEntry<typeof query>(query);
    expect(cachedEntry).toBeNull();
  });
});
