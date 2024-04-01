/* eslint-disable @typescript-eslint/no-explicit-any */
import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { DurationUnit, VoidFunction } from '../../../types';
import type { BusDriver } from '../../bus/bus_driver';
import type { CacheDriver } from '../cache_driver';

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

type CacheNamespace<TKey> = Map<string, Map<TKey, CacheItem>>;

/**
 * The MemoryCacheDriver is a simple cache driver that uses an in-memory Map to store and retrieve values.
 * It also emits cache invalidation events when a key is invalidated.
 *
 * @template TKey - The type of key to use.
 * @implements CacheDriver<TKey> - The cache driver contract.
 */
export class MemoryCacheDriver<TKey> implements CacheDriver<TKey> {
  /**
   * The cache map.
   *
   * @type {Map<TKey, CacheItem>}
   */
  #cache: CacheNamespace<TKey> = new Map();

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
   * @param {string} ns - The namespace to get the value from.
   * @param {TKey} key - The key to get the value for.
   * @returns {TValue | undefined} The value from the cache, or undefined if not found.
   */
  get<TValue>(ns: string, key: TKey): TValue | undefined {
    const cache = this.#cache.get(ns);
    if (!cache) return undefined;

    const item = cache.get(key);
    if (!item) return undefined;

    if (this.#hasExpired(item)) {
      this.invalidate(ns, key);
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
  set<TValue>(ns: string, key: TKey, value: TValue, ttl?: DurationUnit): void {
    const cache = this.#cache.get(ns) ?? new Map();
    const expiration = ttl ? Date.now() + ms(ttl) : Infinity;

    cache.set(key, {
      value,
      expiration,
    });

    this.#cache.set(ns, cache);
  }

  /**
   * Delete a key from the cache.
   *
   * @param {TKey} key - The key to delete.
   */
  delete(ns: string, key?: TKey): void {
    const cache = this.#cache.get(ns);
    if (!cache) return;

    if (key) {
      cache.delete(key);

      if (cache.size === 0) {
        this.#cache.delete(ns);
      }
    } else {
      this.#cache.delete(ns);
    }
  }

  /**
   * Invalidate a key in the cache.
   *
   * @param {TKey} key - The key to invalidate.
   */
  invalidate(ns: string, key?: TKey): void {
    if (this.#cache.has(ns)) {
      this.delete(ns, key);
      this.#emitInvalidate(ns, key);
    }
  }

  /**
   * Subscribe to an invalidate event.
   *
   * @param {TKey} key - The key to subscribe to.
   * @param {(key: TKey) => void} handler - The handler to call when the key is invalidated.
   * @returns {VoidFunction} A function to unsubscribe from the event.
   */
  onInvalidate(ns: string, handler: (key: TKey) => void): VoidFunction {
    this.#emitter.subscribe(`invalidate:${ns}`, handler);

    return () => {
      this.#emitter.unsubscribe(`invalidate:${ns}`, handler);
    };
  }

  #emitInvalidate(ns: string, key?: TKey): void {
    this.#emitter.publish(`invalidate:${ns}`, key);
  }

  #hasExpired = (item: CacheItem) => Date.now() > item.expiration;
}
