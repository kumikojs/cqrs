/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import { Cache } from '../../internal/cache/cache';
import { JsonSerializer } from '../../internal/serializer/json_serializer';
import { QueryCache } from '../../query/query_cache';
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
   * Serializes a request into a namespace and key pair for cache lookup and storage.
   *
   * @param request - The request to serialize.
   * @returns An object containing a `ns` (namespace) and `key` property for cache operations.
   */
  serialize: (request: any) => string;

  invalidate: boolean;
};

/**
 * A strategy that optimizes task execution by caching results. This strategy reduces
 * redundant computations and enhances performance by storing the results of previously
 * executed tasks for reuse.
 *
 * When a task is executed using the `CacheStrategy`, it first checks the cache for a
 * corresponding entry identified by the provided request object. If a matching entry
 * exists, the cached result is returned immediately, avoiding the need to re-execute
 * the task. If no cached entry is found, the task is executed using the provided
 * function, and the result is stored in the cache for future use.
 *
 * @example
 * ```ts
 * import { CacheStrategy, Cache } from '@stoik/cqrs-core';
 *
 * const cache = new Cache();
 * const strategy = new CacheStrategy(cache);
 *
 * async function fetchData(url: string): Promise<any> {
 *   try {
 *     const response = await strategy.execute(url, fetch);

 *     return await response.json();
 *   } catch (error) {
 *     console.error('Failed to fetch data:', error);
 *     // Consider throwing the error or handling it differently based on your application logic
 *   }
 * }

 * // Example usage
 * const someUrl = 'https://api.example.com/data';
 * fetchData(someUrl)
 *   .then(data => console.log('Fetched data:', data))
 *   .catch(error => console.error('Error fetching data:', error));
 * ```
 */
export class CacheStrategy extends Strategy<CacheOptions> {
  static #serializer: JsonSerializer = new JsonSerializer();
  /**
   * Default configuration options for the CacheStrategy.
   * @private
   * @static
   */
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
    serialize: (request) => {
      const key = CacheStrategy.#serializer.serialize(request);

      if (key.isFailure()) throw new Error('Failed to serialize request data');

      return key.value;
    },
    invalidate: false,
  };

  /**
   * @private The underlying cache driver responsible for storing and retrieving cached values.
   */
  #cache: Cache;

  constructor(cache: QueryCache, options?: Partial<CacheOptions>) {
    super({
      ...CacheStrategy.#defaultOptions,
      ...options,
    });

    this.#cache = this.options.persist ? cache.l2 : cache.l1;
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
    const key = this.options.serialize(request);

    if (!this.options.invalidate) {
      const cachedValue = this.#cache.get<TResult>(key);

      if (cachedValue) {
        return cachedValue;
      }
    }

    const result = await task(request);
    this.#cache.set(key, result, this.options.ttl);

    return result;
  }
}
