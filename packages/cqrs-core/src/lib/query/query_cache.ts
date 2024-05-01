import { CACHE_EVENT_TYPES, Cache, CacheEvent } from '../internal/cache/cache';
import { JsonSerializer } from '../internal/serializer/json_serializer';
import { SubscriptionManager } from '../internal/subscription/subscription_manager';

import { IndexedDBAdapter } from '../internal/storage/adapters/indexed_db';
import { MemoryStorageDriver } from '../internal/storage/drivers/memory_storage';
import type { AsyncStorage } from '../internal/storage/facades/async_storage';
import type { SyncStorage } from '../internal/storage/facades/sync_storage';
import type { DurationUnit } from '../types';
import type { QueryContract } from './query_contracts';

type CacheOptions = {
  ttl?: DurationUnit;
  gcInterval?: DurationUnit;
};

export type QueryCacheOptions = {
  l1?: CacheOptions;
  l2?: CacheOptions & {
    type?: 'local_storage' | 'indexed_db';
    driver?: SyncStorage | AsyncStorage;
  };
};

/**
 * A cache for storing query results.
 *
 * The cache is divided into two layers:
 * - The memory cache (L1) is used for fast access to the most recent query results.
 * - The persisted cache (L2) is used for long-term storage of query results.
 *
 * The cache is also responsible for invalidating query results when necessary.
 *
 */
export class QueryCache {
  #QUERY_CACHE_KEY_PREFIX = '__k__';
  #QUERY_CACHE_KEY_SUFFIX = '__v__';

  /**
   * The memory cache.
   * It's the first layer of the cache. It's used for fast access to the most recent query results.
   */
  #l1: Cache;

  /**
   * The persisted cache.
   * It's the second layer of the cache. It's used for long-term storage of query results.
   */
  #l2: Cache;

  /**
   * The subscription manager for managing cache subscriptions.
   * It's used for invalidating cache entries when necessary.
   */
  #subscriptionManager = new SubscriptionManager();

  /**
   * The serializer used for serializing query payloads.
   */
  #serializer: JsonSerializer = new JsonSerializer();

  constructor(options?: QueryCacheOptions) {
    this.#l1 = createCache({
      type: 'memory',
      ttl: options?.l1?.ttl ?? '1m',
      gcInterval: options?.l1?.gcInterval ?? '5m',
    });

    this.#l2 = createCache({
      type: options?.l2?.type ?? 'indexed_db',
      driver: options?.l2?.driver,
      ttl: options?.l2?.ttl ?? '1m',
      gcInterval: options?.l2?.gcInterval ?? '5m',
    });

    this.#subscriptionManager
      .subscribe(
        this.#l1.on(CACHE_EVENT_TYPES.INVALIDATED, (key) => {
          this.#l1.delete(key);
        })
      )
      .subscribe(
        this.#l2.on(CACHE_EVENT_TYPES.INVALIDATED, (key) => {
          this.#l2.delete(key);
        })
      )
      .subscribe(
        this.#l1.on(CACHE_EVENT_TYPES.EXPIRED, (key) => {
          this.#l1.invalidate(key);
        })
      )
      .subscribe(
        this.#l2.on(CACHE_EVENT_TYPES.EXPIRED, (key) => {
          this.#l2.invalidate(key);
        })
      );

    this.getCacheKey = this.getCacheKey.bind(this);
  }

  dispose() {
    this.#l1.dispose();
    this.#l2.dispose();
    this.#subscriptionManager.unsubscribeAll();
  }

  get l1(): Cache {
    return this.#l1;
  }

  get l2(): Cache {
    return this.#l2;
  }

  async get<TValue>(query: QueryContract | string): Promise<TValue | null> {
    const key = typeof query === 'string' ? query : this.getCacheKey(query);

    /**
     * Check the l1 cache first,
     * because it's faster than the l2 cache.
     */
    const cachedValue = await this.#l1.get<TValue>(key);

    if (cachedValue) {
      return cachedValue;
    }

    const persistedValue = await this.#l2.get<TValue>(key);

    /**
     * If the value is found in the l2 cache,
     * we store it in the l1 cache for faster access next time. (cache promotion)
     */
    if (persistedValue) {
      this.#l1.set(key, persistedValue);
    }

    return persistedValue;
  }

  set<TValue>(
    query: QueryContract | string,
    value: TValue,
    {
      ttl,
      l1 = true,
      l2 = true,
    }: {
      ttl?: DurationUnit;
      l1?: boolean;
      l2?: boolean;
    } = {}
  ) {
    const key = typeof query === 'string' ? query : this.getCacheKey(query);

    if (l1) this.#l1.set(key, value, ttl);

    if (l2) l2 && this.#l2.set(key, value, ttl);
  }

  delete(query: QueryContract) {
    const key = this.getCacheKey(query);
    this.#l1.delete(key);
    this.#l2.delete(key);
  }

  clear() {
    this.#l1.clear();
    this.#l2.clear();
  }

  on(event: CacheEvent, handler: (key: string) => void) {
    const subscriptions = [
      this.#l1.on(event, handler),
      this.#l2.on(event, handler),
    ];

    return () => {
      for (const subscription of subscriptions) {
        subscription();
      }
    };
  }

  invalidateQueries(
    ...queries: (QueryContract | QueryContract['queryName'])[]
  ): void {
    for (const query of queries) {
      this.#invalidate(
        this.#l1,
        typeof query === 'string' ? { queryName: query } : query
      );
      this.#invalidate(
        this.#l2,
        typeof query === 'string' ? { queryName: query } : query
      );
    }
  }

  getCacheKey({ queryName, payload }: QueryContract): string {
    const serializedPayload = this.#serializer.serialize(payload);

    if (serializedPayload.isSuccess() && serializedPayload.value) {
      return `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}${
        this.#QUERY_CACHE_KEY_SUFFIX
      }${serializedPayload.value}`;
    }

    return `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}`;
  }

  async optimisticUpdate(previousQuery: QueryContract, value: unknown) {
    const key = this.getCacheKey(previousQuery);

    this.#l1.optimisticUpdate(key, value);
    await this.#l2.optimisticUpdate(key, value);
  }

  #invalidate(cache: Cache, { queryName, payload }: QueryContract): void {
    if (!payload) {
      this.#invalidateAll(cache, queryName);
      return;
    }

    const key = this.getCacheKey({ queryName, payload });
    cache.invalidate(key);
  }

  async #invalidateAll(cache: Cache, queryName: string): Promise<void> {
    const prefix = `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}`;
    const length = await cache.length();

    for (let i = 0; i < length; i++) {
      const key = await cache.key(i);
      if (!key) continue;

      if (key.startsWith(prefix)) {
        cache.invalidate(key);
      }
    }
  }
}

function createCache(
  options: CacheOptions & {
    type: 'local_storage' | 'indexed_db' | 'memory';
    driver?: SyncStorage | AsyncStorage;
  }
) {
  const driver = options?.driver ?? driverFromType(options.type);

  const ttl = options?.ttl ?? '1m';
  const gcInterval = options?.gcInterval ?? '1m';

  return new Cache(driver, ttl, gcInterval);
}

function driverFromType(type: 'indexed_db' | 'local_storage' | 'memory') {
  if (type === 'indexed_db' && typeof window !== 'undefined') {
    return new IndexedDBAdapter('stoik', 'cache');
  }

  if (type === 'local_storage' && typeof window !== 'undefined') {
    return window.localStorage;
  }

  return new MemoryStorageDriver();
}
