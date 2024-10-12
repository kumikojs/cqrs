import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { CacheEntry } from './cache_entry/cache_entry';
import { CacheScheduler } from './cache_scheduler';
import { AsyncCache } from './facades/async_cache';
import { SyncCache } from './facades/sync_cache';
import { LockManager } from '../lock/lock_manager';

import type { DurationUnit } from '../../types/helpers';
import type {
  AsyncStorageDriver,
  SyncStorageDriver,
} from '../../types/infrastructure/storage';
import type { CacheOptions } from '../../types/infrastructure/cache';

type CacheProps = {
  layer: 'l1' | 'l2';
  storage: SyncStorageDriver | AsyncStorageDriver;
} & CacheOptions;

/**
 * Defines the event types for the cache.
 */
export const CACHE_EVENT_TYPES = {
  INVALIDATED: 'invalidated',
  OPTIMISTIC_UPDATE_BEGAN: 'optimistic_update_began',
  OPTIMISTIC_UPDATE_ENDED: 'optimistic_update_ended',
  EXPIRED: 'expired',
} as const;

/**
 * Represents a cache event.
 */
export type CacheEvent =
  (typeof CACHE_EVENT_TYPES)[keyof typeof CACHE_EVENT_TYPES];

export class Cache {
  /**
   * The cache to use for caching.
   */
  #cache: SyncCache | AsyncCache;

  /**
   * The default time-to-live (TTL) for items in the cache.
   */
  #validityPeriod: DurationUnit;

  /**
   * The default stale threshold for items in the cache
   * after which they are considered stale.
   */
  #gracePeriod: DurationUnit;

  /**
   * The emitter used for caching events.
   */
  #emitter: MemoryBusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  /**
   * The scheduler used for garbage collection.
   */
  #scheduler: CacheScheduler;

  #layer: 'l1' | 'l2';

  #lockManager = new LockManager();

  /**
   * Creates a new instance of the Cache class.
   * @param cache The cache to use for caching.
   */
  constructor({
    layer,
    storage,
    validityPeriod = '1m',
    gcInterval = '5m',
    gracePeriod = '1m',
  }: CacheProps) {
    this.#layer = layer;

    /**
     * Type check the storage to determine if it is an async or sync storage.
     * If the storage has an `getAllKeys` method, it is an async storage.
     * Otherwise, it is a sync storage.
     * This is necessary because the cache needs to know whether to use async or sync facades.
     */
    if ('getAllKeys' in storage) {
      this.#cache = new AsyncCache(storage);
    } else {
      this.#cache = new SyncCache(storage);
    }

    this.#validityPeriod = validityPeriod;
    this.#gracePeriod = gracePeriod;

    /**
     * Schedule a garbage collection task to run at regular intervals.
     * This task will clear all expired items from the cache.
     */
    this.#scheduler = new CacheScheduler(gcInterval)
      .schedule(async () => {
        await this.clearExpired();
      })
      .connect();

    /**
     * Clear expired items when the cache is created
     * to ensure that no expired items are present in the l2 cache.
     */
    this.clearExpired();
  }

  disconnect() {
    this.#cache.disconnect();
    this.#emitter.disconnect();
    this.#scheduler.disconnect();
    this.clearExpired();
  }

  /**
   * Gets the value associated with the specified key from the cache.
   * @param key The key of the item to retrieve.
   * @returns The value associated with the key, or null if the key does not exist or the item has expired.
   */
  async get<TValue>(key: string): Promise<TValue | null> {
    await this.#lockManager.lock(key);

    try {
      const item = await this.#cache.getItem(key);

      if (!item) return null;

      const deserialized = CacheEntry.deserialize<TValue>(key, item);
      if (!deserialized) {
        return null;
      }

      if (deserialized.isDefunct()) {
        await this.#cache.removeItem(key);
        return null;
      }

      return deserialized.value ?? null;
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async getEntry<TValue>(key: string): Promise<CacheEntry<TValue> | null> {
    await this.#lockManager.lock(key);

    try {
      const item = await this.#cache.getItem(key);

      if (!item) return null;

      const deserialized = CacheEntry.deserialize<TValue>(key, item);
      if (!deserialized) {
        return null;
      }

      if (deserialized.isDefunct()) {
        await this.#cache.removeItem(key);
        return null;
      }

      return deserialized;
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  /**
   * Sets the value associated with the specified key in the cache.
   * @param key The key of the item.
   * @param value The value to set.
   * @param ttl The time-to-live (TTL) of the item.
   */
  async set<TValue>(
    key: string,
    value: TValue,
    validityPeriod: DurationUnit = this.#validityPeriod,
    gracePeriod: DurationUnit = this.#gracePeriod
  ): Promise<void> {
    await this.#lockManager.lock(key);

    try {
      const entry = new CacheEntry({
        key,
        value,
        validityPeriod,
        gracePeriod,
      });
      const serialized = entry.serialize();
      if (!serialized) {
        return;
      }

      await this.#cache.setItem(key, serialized);
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  /**
   * Gets the expiration timestamp of the item with the specified key.
   * @param key The key of the item.
   * @returns The expiration timestamp of the item, or -Infinity if the item does not exist or has expired.
   */
  async expiration(key: string): Promise<number> {
    const item = await this.#cache.getItem(key);
    if (!item) return -Infinity;

    const deserialized = CacheEntry.deserialize(key, item);
    if (!deserialized) {
      return -Infinity;
    }

    return deserialized.expiration;
  }

  /**
   * Gets the time-to-live (TTL) of the item with the specified key.
   * @param key The key of the item.
   * @returns The time-to-live (TTL) of the item, or undefined if the item does not exist.
   */
  async validityPeriod(key: string): Promise<DurationUnit> {
    const item = await this.#cache.getItem(key);
    if (!item) return this.#validityPeriod;

    const deserialized = CacheEntry.deserialize(key, item);
    if (!deserialized) {
      return this.#validityPeriod;
    }

    return deserialized.validityPeriod;
  }

  /**
   * Deletes the item with the specified key from the cache.
   * @param key The key of the item to delete.
   */
  async delete(key: string): Promise<void> {
    await this.#lockManager.lock(key);
    try {
      await this.#cache.removeItem(key);
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  /**
   * Clears all items from the cache.
   */
  async clear(): Promise<void> {
    await this.#cache.clear();
  }

  /**
   * Gets the key at the specified index in the cache.
   * @param index The index of the key.
   * @returns The key at the specified index, or null if the index is out of range.
   */
  async key(index: number): Promise<string | null> {
    return await this.#cache.key(index);
  }

  /**
   * Gets the number of items in the cache.
   */
  async length() {
    /**
     * If the cache is an async cache, we need to call the `length` method
     */
    if (typeof this.#cache.length === 'function') {
      return await this.#cache.length();
    }

    /**
     * If the cache is a sync cache, we can directly access the `length` property
     */
    return this.#cache.length;
  }

  /**
   * Subscribes to the specified cache event.
   * @param eventName The name of the cache event.
   * @param handler The event handler function.
   * @returns A function to unsubscribe from the cache event.
   */
  on(eventName: CacheEvent, handler: (key: string) => void) {
    this.#emitter.subscribe(eventName, handler);

    return () => {
      this.#emitter.unsubscribe(eventName, handler);
    };
  }

  /**
   * The logic is different for each layer:
   * - For the l1 cache, we simply remove the item from the cache.
   * - For the l2 cache, we emit an event to notify the subscribers that the item has been invalidated.
   *
   * Reason:
   * - When get is called, the l1 cache is checked first.
   * - If the item is not found in the l1 cache, the l2 cache is checked.
   * - If the item is found in the l2 cache, it is promoted to the l1 cache.
   */
  async invalidate(key: string) {
    if (this.#layer === 'l1') {
      await this.#cache.removeItem(key);
      return;
    }

    await this.#emit(CACHE_EVENT_TYPES.INVALIDATED, key);
  }

  /**
   * Updates the item with the specified key in the cache optimistically.
   */
  async optimisticUpdate<TValue>(key: string, value: TValue) {
    if (this.#layer === 'l2') return;

    const item = await this.#cache.getItem(key);
    if (!item) return;

    await this.#emit(CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_BEGAN, key);

    const ttlToUse = await this.validityPeriod(key);
    await this.set(key, value, ttlToUse);

    await this.#emit(CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_ENDED, key);
  }

  /**
   * Clears all expired items from the cache.
   */
  async clearExpired() {
    const length = await this.length();

    for (let i = 0; i < length; i++) {
      const key = await this.#cache.key(i);
      if (!key) continue;

      const item = await this.#cache.getItem(key);
      if (!item) continue;

      const deserialized = CacheEntry.deserialize(key, item);

      if (!deserialized || deserialized.isDefunct()) {
        await this.#cache.removeItem(key);
        await this.#emit(CACHE_EVENT_TYPES.EXPIRED, key);
      }
    }
  }

  async #emit(eventName: CacheEvent, key: string) {
    await this.#emitter.publish(eventName, key);
  }
}
