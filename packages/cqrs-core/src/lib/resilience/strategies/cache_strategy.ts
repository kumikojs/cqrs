/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../../internal/cache/cache';
import { Strategy } from './base_strategy';

import type { CacheDriverContract } from '../../internal/cache/cache_driver';
import type { DurationUnit } from '../../internal/ms/types';
import type { AsyncFunction } from '../../types';

/**
 * The cache options.
 */
export type CacheOptions = {
  /**
   * The time to live (TTL) for the cache.
   *
   * @default '30s'
   * @see {@link DurationUnit}
   */
  ttl: DurationUnit;

  /**
   * Persist the cache.
   *
   * If set to `true`, the cache will be stored in the local storage.
   * Otherwise, the cache will be stored in memory.
   *
   * @type {boolean}
   * @default false
   */
  persist: boolean;

  /**
   * Invalidate the cache.
   *
   * @type {boolean}
   * @default false
   */
  invalidate?: boolean;

  /**
   * Serialize the request before caching.
   * The serialized request is used as the cache key.
   *
   * @param {any} request - The request to serialize.
   * @returns {string} The serialized request.
   */
  serialize: (request: any) => string;
};

/**
 * The cache strategy.
 * This strategy caches the results of a task.
 */
export class CacheStrategy extends Strategy<CacheOptions> {
  /**
   * The default options for the cache strategy.
   */
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
    invalidate: false,
    serialize: (request) => JSON.stringify(request),
  };

  /**
   * The cache driver.
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
   * Execute the task with caching.
   *
   * If the cache is invalidated or the value is not found in the cache,
   * the task is executed and the result is cached.
   * Otherwise, the cached value is returned.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = `cache_id:${this.options.serialize?.(request)}`;

    if (this.options.invalidate) {
      this.#cache.delete(key);
    }

    const cachedValue = await this.#cache.get<TResult>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = await task(request);

    this.#cache.set(key, result, this.options.ttl);

    return result;
  }
}
