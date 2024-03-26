import type { VoidFunction } from '../../types';
import type { DurationUnit } from '../ms/types';

/**
 * The cache driver contract.
 * This is the interface that all cache drivers must implement.
 *
 * @internal
 * @template TKey - The type of the cache key.
 */
export interface CacheDriverContract<TKey> {
  /**
   * Get a value from the cache.
   *
   * @template TValue - The type of the value to get.
   * @param {TKey} key - The key to get the value for.
   * @returns {TValue | undefined} The value from the cache or `undefined` if it does not exist.
   */
  get<TValue>(key: TKey): TValue | undefined;

  /**
   * Set a value in the cache.
   *
   * @template TValue - The type of the value to set.
   * @param {TKey} key - The key to set the value for.
   * @param {TValue} value - The value to set.
   * @param {DurationUnit | number} [ttl] - The time to live for the value.
   */
  set<TValue>(key: TKey, value: TValue, ttl?: DurationUnit | number): void;

  /**
   * Delete a value from the cache.
   *
   * @param {TKey} key - The key to delete the value for.
   */
  delete(key: TKey): void;

  /**
   * Invalidate a value in the cache.
   * This will remove the value from the cache and emit an invalidation event.
   *
   * @param {TKey} key - The key to invalidate the value for.
   */
  invalidate(key: TKey): void;

  /**
   * Subscribe to cache invalidation events.
   *
   * @param {TKey} key - The key to subscribe to invalidation events for.
   * @param {(key: TKey) => void} handler - The handler to call when the cache is invalidated.
   * @returns {() => void} A function to unsubscribe from the invalidation events.
   */
  onInvalidate(key: TKey, handler: (key: TKey) => void): VoidFunction;
}
