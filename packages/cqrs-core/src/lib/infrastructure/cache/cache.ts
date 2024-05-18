import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { CacheEntry } from './cache_entry/cache_entry';
import { CacheScheduler } from './cache_scheduler';
import { AsyncCache } from './facades/async_cache';
import { SyncCache } from './facades/sync_cache';

import type {
  NullablePromise,
  Optional,
  OptionalPromise,
} from '../../types/helpers';
import type {
  AsyncStorageDriver,
  SyncStorageDriver,
} from '../../types/infrastructure/storage';
import type { DurationUnit } from '../../types/utilities/duration_unit';

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
  #defaultTTL: DurationUnit;

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

  /**
   * Creates a new instance of the Cache class.
   * @param cache The cache to use for caching.
   */
  constructor(
    storage: SyncStorageDriver | AsyncStorageDriver,
    defaultTTL: DurationUnit,
    gcInterval: DurationUnit
  ) {
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

    this.#defaultTTL = defaultTTL;

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
  async get<TValue>(key: string): NullablePromise<TValue> {
    const item = await this.#cache.getItem(key);
    if (!item) return null;

    const deserialized = CacheEntry.deserialize<TValue>(key, item);
    if (!deserialized) {
      return null;
    }

    if (deserialized.hasExpired()) {
      await this.#cache.removeItem(key);

      return null;
    }

    return deserialized.value ?? null;
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
  async ttl(key: string): OptionalPromise<DurationUnit> {
    const item = await this.#cache.getItem(key);
    if (!item) return undefined;

    const deserialized = CacheEntry.deserialize(key, item);
    if (!deserialized) {
      return undefined;
    }

    return deserialized.ttl;
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
    ttl: Optional<DurationUnit> = this.#defaultTTL
  ): Promise<void> {
    const entry = new CacheEntry(key, value, ttl);
    const serialized = entry.serialize();
    if (!serialized) {
      return;
    }

    await this.#cache.setItem(key, serialized);
  }

  /**
   * Deletes the item with the specified key from the cache.
   * @param key The key of the item to delete.
   */
  async delete(key: string): Promise<void> {
    await this.#cache.removeItem(key);
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
  async key(index: number): NullablePromise<string> {
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
   * Invalidates the item with the specified key in the cache.
   * @param key The key of the item to invalidate.
   */
  invalidate(key: string) {
    this.#emit('invalidated', key);
  }

  /**
   * Performs an optimistic update of the item with the specified key in the cache.
   * @param key The key of the item to update.
   * @param value The new value for the item.
   */
  async optimisticUpdate<TValue>(key: string, value: TValue) {
    this.#emit('optimistic_update_began', key);

    const ttl = await this.ttl(key);

    await this.set(key, value, ttl);

    this.#emit('optimistic_update_ended', key);
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
      if (!deserialized) {
        await this.#cache.removeItem(key);
        continue;
      }

      if (deserialized.hasExpired()) {
        await this.#cache.removeItem(key);
        this.#emit('expired', key);
      }
    }
  }

  #emit(eventName: CacheEvent, key: string) {
    this.#emitter.publish(eventName, key);
  }
}
