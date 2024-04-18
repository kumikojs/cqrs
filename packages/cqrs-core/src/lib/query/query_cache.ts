import { CACHE_EVENT_TYPES, Cache, CacheEvent } from '../internal/cache/cache';
import { Scheduler } from '../internal/scheduler/scheduler';
import { JsonSerializer } from '../internal/serializer/json_serializer';
import { SubscriptionManager } from '../internal/subscription/subscription_manager';

import type { QueryContract } from './query_contracts';

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

  #scheduler: Scheduler;

  #subscriptionManager = new SubscriptionManager();

  #serializer: JsonSerializer = new JsonSerializer();

  constructor(l1: Cache, l2: Cache) {
    this.#l1 = l1;
    this.#l2 = l2;

    this.#scheduler = new Scheduler('10m');

    this.#scheduler
      .schedule(() => {
        this.#l1.clearExpired();
        this.#l2.clearExpired();
      })
      .start();

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

  cleanup() {
    this.#scheduler.stop();
    this.#subscriptionManager.unsubscribe();
  }

  get l1(): Cache {
    return this.#l1;
  }

  get l2(): Cache {
    return this.#l2;
  }

  get<TValue>(query: QueryContract): TValue | null {
    const key = this.getCacheKey(query);

    if (this.#l1.expiration(key) > this.#l2.expiration(key)) {
      console.log('l1', key);
      return this.#l1.get<TValue>(key);
    }

    console.log('l2', key);
    return this.#l2.get<TValue>(key);
  }

  set<TValue>(query: QueryContract, value: TValue) {
    const key = this.getCacheKey(query);
    this.#l1.set(key, value);
    this.#l2.set(key, value);
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

  invalidate(query: QueryContract): void {
    console.log('invalidate', query);
    this.#invalidate(this.#l1, query);
    this.#invalidate(this.#l2, query);
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

  optimisticUpdate(previousQuery: QueryContract, value: unknown) {
    const key = this.getCacheKey(previousQuery);

    this.#l1.optimisticUpdate(key, value);
    this.#l2.optimisticUpdate(key, value);
  }

  #invalidate(cache: Cache, { queryName }: QueryContract): void {
    const prefix = `${this.#QUERY_CACHE_KEY_PREFIX}${queryName}`;

    for (let i = 0; i < cache.length; i++) {
      const key = cache.key(i);
      if (!key) continue;

      if (key.startsWith(prefix)) {
        cache.invalidate(key);
      }
    }
  }
}
