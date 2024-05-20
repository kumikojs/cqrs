import { Cache } from '../../infrastructure/cache/cache';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { JsonSerializer } from '../../utilities/serializer/json_serializer';
import { SubscriptionManager } from '../../utilities/subscription/subscription_manager';

import type { CacheEvent } from '../../infrastructure/cache/cache';
import type { Query, QueryCacheOptions } from '../../types/core/query';
import type { DurationUnit } from '../../types/helpers';
import type {
  AsyncStorageDriver,
  SyncStorageDriver,
} from '../../types/infrastructure/storage';

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

  constructor(options: QueryCacheOptions) {
    this.#l1 = createCache({
      ttl: options?.l1?.ttl ?? '1m',
      driver: new MemoryStorageDriver(),
      gcInterval: options?.l1?.gcInterval ?? '5m',
    });

    this.#l2 = createCache({
      ttl: options?.l2?.ttl ?? '1m',
      driver: options.l2.driver,
      gcInterval: options?.l2?.gcInterval ?? '5m',
    });

    this.#subscriptionManager
      .subscribe(
        this.#l1.on('invalidated', (key) => {
          this.#l1.delete(key);
        })
      )
      .subscribe(
        this.#l2.on('invalidated', (key) => {
          this.#l2.delete(key);
        })
      )
      .subscribe(
        this.#l1.on('expired', (key) => {
          this.#l1.invalidate(key);
        })
      )
      .subscribe(
        this.#l2.on('expired', (key) => {
          this.#l2.invalidate(key);
        })
      );

    this.getCacheKey = this.getCacheKey.bind(this);
  }

  get l1(): Cache {
    return this.#l1;
  }

  get l2(): Cache {
    return this.#l2;
  }

  async get<TValue>(query: Query | string): Promise<TValue | null> {
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

  set<TValue>(query: Query, value: TValue, ttl?: DurationUnit) {
    const key = this.getCacheKey(query);

    this.#l1.set(key, value, ttl);
    this.#l2.set(key, value, ttl);
  }

  async delete(query: Query) {
    const key = this.getCacheKey(query);

    await Promise.all([this.#l1.delete(key), this.#l2.delete(key)]);
  }

  async clear() {
    await Promise.all([this.#l1.clear(), this.#l2.clear()]);
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

  invalidateQueries(...queries: (Query | Query['queryName'])[]): void {
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

  getCacheKey({ queryName, payload }: Query): string {
    const serializedPayload = this.#serializer.serialize(payload);

    if (serializedPayload.isSuccess() && serializedPayload.value) {
      return `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}${
        this.#QUERY_CACHE_KEY_SUFFIX
      }${serializedPayload.value}`;
    }

    return `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}`;
  }

  async optimisticUpdate(previousQuery: Query, value: unknown) {
    const key = this.getCacheKey(previousQuery);

    this.#l1.optimisticUpdate(key, value);
  }

  #invalidate(cache: Cache, { queryName, payload }: Query): void {
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

  disconnect() {
    this.#l1.disconnect();
    this.#l2.disconnect();
    this.#subscriptionManager.disconnect();
  }
}

function createCache(
  options: QueryCacheOptions['l1'] & {
    driver: SyncStorageDriver | AsyncStorageDriver;
  }
) {
  const ttl = options?.ttl ?? '1m';
  const gcInterval = options?.gcInterval ?? '1m';

  return new Cache(options.driver, ttl, gcInterval);
}
