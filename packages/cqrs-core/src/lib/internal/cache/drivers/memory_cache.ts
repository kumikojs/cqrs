/* eslint-disable @typescript-eslint/no-explicit-any */
import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { BusDriver } from '../../bus/bus_driver';
import type { DurationUnit } from '../../ms/types';
import type { CacheDriverContract } from '../cache_driver';
import type { VoidFunction } from '../../../types';

/**
 * Cache item interface.
 *
 * @unstable This interface is subject to change.
 * May be replace by a CacheEntry type or class in the future.
 */
interface CacheItem {
  value: any;
  expiration: number;
}

/**
 * The MemoryCacheDriver is a simple cache driver that uses an in-memory Map to store and retrieve values.
 * It also emits cache invalidation events when a key is invalidated.
 *
 * @template TKey - The type of key to use.
 * @implements CacheDriverContract<TKey> - The cache driver contract.
 */
export class MemoryCacheDriver<TKey> implements CacheDriverContract<TKey> {
  /**
   * The cache map.
   *
   * @type {Map<TKey, CacheItem>}
   */
  #cache: Map<TKey, CacheItem> = new Map();

  /**
   * The event emitter.
   *
   * @type {BusDriver<string>}
   */
  #emitter: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  /**
   * Get a value from the cache.
   *
   * @template TValue - The type of value to get.
   * @param {TKey} key - The key to get the value for.
   * @returns {TValue | undefined} The value from the cache, or undefined if not found.
   */
  get<TValue>(key: TKey): TValue | undefined {
    const item = this.#cache.get(key);

    if (!item) {
      return undefined;
    }

    if (this.#hasExpired(item)) {
      this.#cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Set a value in the cache.
   *
   * @template TValue - The type of value to set.
   * @param {TKey} key - The key to set the value for.
   * @param {TValue} value - The value to set.
   * @param {DurationUnit} [ttl] - The time-to-live for the value.
   */
  set<TValue>(key: TKey, value: TValue, ttl?: DurationUnit): void {
    const expiration = ttl ? Date.now() + ms(ttl) : Infinity;

    this.#cache.set(key, { value, expiration });
  }

  /**
   * Delete a key from the cache.
   *
   * @param {TKey} key - The key to delete.
   */
  delete(key: TKey): void {
    console.log('Deleting key:', key);
    this.#cache.delete(key);
  }

  /**
   * Invalidate a key in the cache.
   *
   * @param {TKey} key - The key to invalidate.
   */
  invalidate(key: TKey): void {
    console.log('Invalidating key:', key);
    this.delete(key);
    this.#emitInvalidate(key);
  }

  /**
   * Subscribe to an invalidate event.
   *
   * @param {TKey} key - The key to subscribe to.
   * @param {(key: TKey) => void} handler - The handler to call when the key is invalidated.
   * @returns {VoidFunction} A function to unsubscribe from the event.
   */
  onInvalidate(key: TKey, handler: (key: TKey) => void): VoidFunction {
    this.#emitter.subscribe(`invalidate:${key}`, handler);

    return () => {
      this.#emitter.unsubscribe(`invalidate:${key}`, handler);
    };
  }

  /**
   * Emit a cache invalidation event.
   *
   * @param key - The key to invalidate.
   */
  #emitInvalidate(key: TKey) {
    this.#emitter.publish(`invalidate:${key}`, key);
  }

  #hasExpired = (item: CacheItem) => Date.now() > item.expiration;
}
