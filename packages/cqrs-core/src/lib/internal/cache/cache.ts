import { MemoryCacheDriver } from './drivers/memory_cache';
import { LocalStorageCacheDriver } from './drivers/local_storage_cache';

import type { VoidFunction } from '../../types';

/**
 * The Cache class is a simple cache manager that allows you to store and retrieve
 * values from in-memory and local storage caches.
 *
 * @unstable This API is not stable and may change in the future.
 * It will also support other cache drivers like AsyncStorage and a refactorization may be needed.
 */
export class Cache {
  /**
   * The in-memory cache driver.
   *
   * @type {MemoryCacheDriver<string>}
   */
  #inMemoryCache: MemoryCacheDriver<string>;

  /**
   * The local storage cache driver.
   *
   * @type {LocalStorageCacheDriver<string>}
   */
  #localStorageCache: LocalStorageCacheDriver<string>;

  constructor() {
    this.#inMemoryCache = new MemoryCacheDriver();
    this.#localStorageCache = new LocalStorageCacheDriver();
  }

  /**
   * Get the in-memory cache driver.
   *
   * @returns {MemoryCacheDriver<string>}
   */
  get inMemoryCache() {
    return this.#inMemoryCache;
  }

  /**
   * Get the local storage cache driver.
   *
   * @returns {LocalStorageCacheDriver<string>}
   */
  get localStorageCache() {
    return this.#localStorageCache;
  }

  /**
   * Invalidate a key in both caches.
   *
   * @param {string} key - The key to invalidate.
   */
  invalidate(key: string) {
    this.#inMemoryCache.invalidate(key);
    this.#localStorageCache.invalidate(key);
  }

  /**
   * Clear a key in both caches.
   *
   * @param {string} key - The key to clear.
   * @unused This method is not used in the codebase and may be removed in the future.
   */
  clear(key: string) {
    this.#inMemoryCache.delete(key);
    this.#localStorageCache.delete(key);
  }

  /**
   * Subscribe to cache invalidation events.
   *
   * @param {string} key - The key to subscribe to.
   * @param {Function} handler - The handler to call when the key is invalidated.
   * @returns {Function} An unsubscription function to remove the handler from the cache.
   */
  onInvalidate(key: string, handler: (key: string) => void): VoidFunction {
    const memorySubscription = this.#inMemoryCache.onInvalidate(key, handler);
    const localStorageSubscription = this.#localStorageCache.onInvalidate(
      key,
      handler
    );

    return () => {
      memorySubscription();
      localStorageSubscription();
    };
  }
}
