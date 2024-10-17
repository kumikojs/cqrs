import { Cache, CACHE_EVENT_TYPES } from '../../infrastructure/cache/cache';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { KeyResolver } from '../../utilities/resolver/key_resolver';
import { JsonSerializer } from '../../utilities/serializer/json_serializer';
import { SubscriptionManager } from '../../utilities/subscription/subscription_manager';

import type { CacheEvent } from '../../infrastructure/cache/cache';
import type { QueryCacheOptions, QueryInput } from '../../types/core/query';
import type { DurationUnit } from '../../utilities/ms/types';

/*
 * ---------------------------------------------------------------------------
 * QueryCache Class
 * ---------------------------------------------------------------------------
 * A dual-layer caching mechanism designed to store and manage query results
 * efficiently. The QueryCache utilizes:
 *
 * - **L1 Memory Cache**: Provides fast access to the most recent query results
 *   for quick retrieval.
 * - **L2 Persisted Cache**: Offers long-term storage for query results, ensuring
 *   that data persists beyond the lifecycle of the application.
 *
 * The QueryCache automatically handles cache invalidation, ensuring that
 * outdated results are removed and fresh data is fetched when needed.
 *
 * Key Features:
 * - Optimistic updates for immediate UI responsiveness.
 * - Subscription management for monitoring cache state changes.
 * - Flexible configuration options for cache duration and garbage collection.
 *
 * ---------------------------------------------------------------------------
 */
/*
 * ---------------------------------------------------------------------------
 * QueryCache Class
 * ---------------------------------------------------------------------------
 * A dual-layer caching mechanism designed to store and manage query results
 * efficiently. The QueryCache utilizes:
 *
 * - **L1 Memory Cache**: Provides fast access to the most recent query results
 *   for quick retrieval.
 * - **L2 Persisted Cache**: Offers long-term storage for query results, ensuring
 *   that data persists beyond the lifecycle of the application.
 *
 * The QueryCache automatically handles cache invalidation, ensuring that
 * outdated results are removed and fresh data is fetched when needed.
 *
 * Key Features:
 * - Optimistic updates for immediate UI responsiveness.
 * - Subscription management for monitoring cache state changes.
 * - Flexible configuration options for cache duration and garbage collection.
 *
 * ---------------------------------------------------------------------------
 */
export class QueryCache {
  #l1: Cache;
  #l2: Cache;
  #subscriptionManager = new SubscriptionManager();
  #serializer: JsonSerializer = new JsonSerializer();
  #keyResolver: KeyResolver = new KeyResolver();

  constructor(options: QueryCacheOptions) {
    this.#l1 = new Cache({
      ...options.l1,
      layer: 'l1',
      storage: new MemoryStorageDriver(),
    });

    this.#l2 = new Cache({
      ...options.l2,
      layer: 'l2',
      storage: options.l2.driver,
    });

    this.#subscriptionManager
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
  }

  /*
   * ---------------------------------------------------------------------------
   * Public Methods
   * ---------------------------------------------------------------------------
   */

  // Public getters for accessing L1 and L2 caches
  get l1(): Cache {
    return this.#l1;
  }
  get l2(): Cache {
    return this.#l2;
  }

  /**
   * Retrieves a cached value for the provided query from the L1 or L2 cache.
   * If found in L2, promotes it to L1 for future faster access.
   */
  async get<TValue>(queryOrKey: QueryInput | string): Promise<TValue | null> {
    const key =
      typeof queryOrKey === 'string'
        ? queryOrKey
        : this.#keyResolver.generateKey({
            name: queryOrKey.queryName,
            payload: queryOrKey.payload,
          });

    const cachedValue = await this.#l1.get<TValue>(key);
    if (cachedValue) return cachedValue;

    const persistedValue = await this.#l2.get<TValue>(key);
    if (persistedValue) {
      await this.#l1.set(key, persistedValue); // Promote to L1
    }

    return persistedValue;
  }

  async getEntry<TValue>(queryOrKey: QueryInput | string) {
    const key =
      typeof queryOrKey === 'string'
        ? queryOrKey
        : this.#keyResolver.generateKey({
            name: queryOrKey.queryName,
            payload: queryOrKey.payload,
          });

    const cachedValue = await this.#l1.getEntry<TValue>(key);
    if (cachedValue) return cachedValue;

    const persistedValue = await this.#l2.getEntry<TValue>(key);
    if (persistedValue) {
      await this.#l1.set(key, persistedValue.value); // Promote to L1
    }

    return persistedValue;
  }

  /**
   * Sets a value in both L1 and L2 caches with optional TTL (time to live).
   */
  async set<TValue>(
    query: QueryInput,
    value: TValue,
    validityPeriod?: DurationUnit
  ) {
    const key = this.#keyResolver.generateKey({
      name: query.queryName,
      payload: query.payload,
    });

    await Promise.all([
      this.#l1.set(key, value, validityPeriod),
      this.#l2.set(key, value, validityPeriod),
    ]);
  }

  /**
   * Deletes a query result from both L1 and L2 caches.
   */
  async delete(query: QueryInput) {
    const key = this.#keyResolver.generateKey({
      name: query.queryName,
      payload: query.payload,
    });

    await Promise.all([this.#l1.delete(key), this.#l2.delete(key)]);
  }

  /**
   * Clears all entries in both L1 and L2 caches.
   */
  async clear() {
    await Promise.all([this.#l1.clear(), this.#l2.clear()]);
  }

  /**
   * Subscribes to cache events (e.g., expiration) for both L1 and L2 caches.
   */
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

  /**
   * Invalidates specified queries across both L1 and L2 caches.
   */
  async invalidateQueries(
    ...queries: (QueryInput | QueryInput['queryName'])[]
  ): Promise<void> {
    for (const query of queries) {
      const queryInput =
        typeof query === 'string'
          ? {
              queryName: query,
            }
          : query;

      await this.#invalidate(this.#l1, queryInput);
      await this.#invalidate(this.#l2, queryInput);
    }
  }

  /**
   * Performs an optimistic update of a cached value for a given query in the L1 cache.
   */
  async optimisticUpdate(previousQuery: QueryInput, value: unknown) {
    const key = this.#keyResolver.generateKey({
      name: previousQuery.queryName,
      payload: previousQuery.payload,
    });

    await this.#l1.optimisticUpdate(key, value);
  }

  /**
   * Disconnects caches and subscription manager, ensuring proper cleanup.
   */
  disconnect() {
    this.#l1.disconnect();
    this.#l2.disconnect();
    this.#subscriptionManager.disconnect();
  }

  /*
   * ---------------------------------------------------------------------------
   * Private Methods
   * ---------------------------------------------------------------------------
   */

  /**
   * Invalidates a cache entry based on the query's cache key.
   */
  async #invalidate(
    cache: Cache,
    { queryName, payload }: QueryInput
  ): Promise<void> {
    if (!payload) {
      await this.#invalidateAll(cache, queryName);
      return;
    }

    const key = this.#keyResolver.generateKey({ name: queryName, payload });
    await cache.invalidate(key);
  }

  /**
   * Invalidates all entries for a given query in the specified cache.
   */
  async #invalidateAll(cache: Cache, queryName: string): Promise<void> {
    const length = await cache.length();
    const allKeys = [];

    // Fix: State of the cache is not consistent when iterating over the keys
    // and invalidating them in the same loop. Instead, we first collect all
    // keys and then invalidate them in a separate loop.
    // This ensures that the cache state remains consistent during iteration.
    for (let i = 0; i < length; i++) {
      const iteratorKey = await cache.key(i);
      if (iteratorKey) {
        allKeys.push(iteratorKey);
      }
    }

    for (const iteratorKey of allKeys) {
      const cacheKeyQueryName = this.#keyResolver.extractName(iteratorKey);

      if (cacheKeyQueryName === queryName) {
        await cache.invalidate(iteratorKey);
      }
    }
  }
}
