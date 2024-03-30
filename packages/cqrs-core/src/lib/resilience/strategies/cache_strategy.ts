/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../../internal/cache/cache';
import { Strategy } from './base_strategy';

import type { CacheDriverContract } from '../../internal/cache/cache_driver';
import type { AsyncFunction, DurationUnit } from '../../types';

/**
 * Configuration options for tailoring cache behavior.
 */
export type CacheOptions = {
  /**
   * Specifies the duration for which cached values remain valid before expiration.
   * Defaults to '30s'.
   *
   * @default '30s'
   * @see {@link DurationUnit}
   */
  ttl: DurationUnit;

  /**
   * Determines whether cached values are stored persistently in local storage (true),
   * or in memory for the current session (false).
   * Defaults to false (in-memory).
   *
   * @type boolean
   * @default false
   */
  persist: boolean;

  /**
   * Controls whether to invalidate existing cached values before executing the task.
   * Defaults to false, preserving cached values until expiration.
   *
   * @type boolean
   * @default false
   */
  invalidate?: boolean;

  /**
   * Serializes a request into a namespace and key pair for cache lookup and storage.
   *
   * @param request - The request to serialize.
   * @returns An object containing a `ns` (namespace) and `key` property for cache operations.
   */
  serialize: (request: any) => { ns: string; key: string };
};

/**
 * A strategy that optimizes task execution by caching results, reducing redundant computations and enhancing performance.
 *
 * @example
 * ```ts
 * import { CacheStrategy } from '@stoik/cqrs-core';
 *
 * const cache = new Cache();
 * const strategy = new CacheStrategy(cache);
 *
 * let counter = 0;
 *
 * const task = async () => {
 *    counter += 1;
 *    return counter;
 * };
 *
 * const result1 = await strategy.execute('key', task);
 * const result2 = await strategy.execute('key', task);
 *
 * console.log(result1); // 1
 * console.log(result2); // 1
 * ```
 */
export class CacheStrategy extends Strategy<CacheOptions> {
  /**
   * Default configuration options for the CacheStrategy.
   * @private
   * @static
   */
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
    invalidate: false,
    serialize: (request) => ({
      ns: 'default',
      key: JSON.stringify(request),
    }),
  };

  /**
   * @private The underlying cache driver responsible for storing and retrieving cached values.
   */
  #cache: CacheDriverContract<string>;

  constructor(cache: Cache, options?: Partial<CacheOptions>) {
    super({
      ...CacheStrategy.#defaultOptions,
      ...options,
    });

    this.#cache = this.options.persist
      ? cache.localStorageCache
      : cache.inMemoryCache;
  }

  /**
   * Executes a task with caching optimization.
   *
   * Prioritizes retrieving results from the cache if available,
   * executing the task only when necessary and storing the result for future reuse.
   *
   * @template TRequest - The type of request data used for the task.
   * @template TTask - The type of the task to be executed, constrained to be an asynchronous function.
   * @template TResult - The expected type of the result produced by the task execution.
   *
   * @param request - The request data to be passed to the task.
   * @param task - The async function representing the task to be executed.
   * @returns A promise that resolves with the result of the task execution,
   *          either retrieved from the cache or obtained by executing the task.
   */
  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const { ns, key } = this.options.serialize(request);

    if (this.options.invalidate) {
      this.#cache.delete(ns);
    }

    const cachedValue = await this.#cache.get<TResult>(ns, key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = await task(request);
    this.#cache.set(ns, key, result, this.options.ttl);

    return result;
  }
}
