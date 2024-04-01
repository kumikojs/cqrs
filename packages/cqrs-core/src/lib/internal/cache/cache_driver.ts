import type { DurationUnit, VoidFunction } from '../../types';

/**
 * The cache driver contract.
 * This is the interface that all cache drivers must implement.
 *
 * @internal
 * @template TKey - The type of the cache key.
 */
export interface CacheDriver<TKey> {
  /**
   * Get a value from the cache.
   *
   * @template TValue - The type of value to get.
   * @param {string} ns - The namespace to get the value from.
   * @param {TKey} key - The key to get the value for.
   * @returns {TValue | undefined} The value from the cache, or undefined if not found.
   */
  get<TValue>(ns: string, key: TKey): TValue | undefined;

  /**
   * Set a value in the cache.
   *
   * @template TValue - The type of value to set.
   * @param {string} ns - The namespace to set the value in.
   * @param {TKey} key - The key to set the value for.
   * @param {TValue} value - The value to set.
   * @param {DurationUnit} [ttl] - The time-to-live for the value.
   */
  set<TValue>(ns: string, key: TKey, value: TValue, ttl?: DurationUnit): void;

  /**
   * Delete a key from the cache.
   *
   * @param {string} ns - The namespace to delete the key from.
   * @param {TKey} key - The optional key to delete.
   */
  delete(ns: string, key?: TKey): void;

  /**
   * Register a handler for when a key is invalidated.
   *
   * @param {string} ns - The namespace to register the handler for.
   * @param {Function} handler - The handler to register.
   * @returns {VoidFunction} A function to unregister the handler.
   */
  invalidate(ns: string, key?: TKey): void;

  /**
   * Subscribe to an invalidate event.
   *
   * @param {string} ns - The namespace to subscribe to.
   * @param {(key: TKey) => void} handler - The handler to call when the key is invalidated.
   * @returns {VoidFunction} A function to unsubscribe from the event.
   */
  onInvalidate(ns: string, handler: (key: TKey) => void): VoidFunction;
}
