import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { BusDriver } from '../../bus/bus_driver';
import type { DurationUnit } from '../../ms/types';
import type { CacheDriverContract } from '../cache_driver';
import type { VoidFunction } from '../../../types';

/**
 * The LocalStorageCacheDriver is a simple cache driver that uses the LocalStorage API
 * to store and retrieve values.
 * It also emits cache invalidation events when a key is invalidated.
 *
 * @template TKey - The type of key to use.
 * @implements CacheDriverContract<TKey> - The cache driver contract.
 */
export class LocalStorageCacheDriver<TKey extends string>
  implements CacheDriverContract<TKey>
{
  /**
   * The LocalStorage API.
   *
   * @type {Storage}
   */
  #storage: Storage;

  /**
   * The event emitter.
   *
   * @type {BusDriver<string>}
   */
  #emitter: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  constructor() {
    if (!window || !window.localStorage) {
      console.error('LocalStorage is not supported in this environment.');
      this.#storage = {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
        clear: () => null,
        key: () => null,
        length: 0,
      };
    } else {
      this.#storage = window.localStorage;
    }
  }

  /**
   * Get a value from the cache.
   *
   * @template TValue - The type of value to get.
   * @param {TKey} key - The key to get the value for.
   * @returns {TValue | undefined} The value from the cache, or undefined if not found.
   */
  get<TValue>(key: TKey): TValue | undefined {
    try {
      const item = this.#storage.getItem(key.toString());

      if (!item) {
        return undefined;
      }

      const { value, expiration } = JSON.parse(item);

      if (expiration && this.#hasExpired(expiration)) {
        this.#storage.removeItem(key.toString());
        return undefined;
      }

      return value;
    } catch (error) {
      console.error('Error while retrieving item from LocalStorage:', error);
      return undefined;
    }
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
    try {
      const expiration = ttl ? Date.now() + ms(ttl) : Infinity;

      this.#storage.setItem(
        key.toString(),
        JSON.stringify({ value, expiration })
      );
    } catch (error) {
      console.error('Error while setting item in LocalStorage:', error);
    }
  }

  /**
   * Delete a key from the cache.
   *
   * @param {TKey} key - The key to delete.
   */
  delete(key: TKey): void {
    try {
      this.#storage.removeItem(key.toString());
    } catch (error) {
      console.error('Error while deleting item from LocalStorage:', error);
    }
  }

  /**
   * Invalidate a key in the cache.
   *
   * @param {TKey} key - The key to invalidate.
   */
  invalidate(key: TKey): void {
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
   * Emit an invalidate event.
   */
  #emitInvalidate(key: TKey) {
    this.#emitter.publish(`invalidate:${key}`, key);
  }

  #hasExpired = (expiration: number) => Date.now() > expiration;
}
