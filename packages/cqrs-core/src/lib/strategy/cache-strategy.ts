/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheDriverContract } from '../internal/cache/cache-driver';
import type { DurationUnit } from '../internal/ms/ms';
import type { PromiseAnyFunction } from '../internal/types';

import { CacheManager } from '../internal/cache/cache-manager';
import { Strategy } from './internal/strategy';

export type CacheOptions = {
  /**
   * The time to live (TTL) for the cache.
   * @default '30s'
   * @see {@link DurationUnit}
   */
  ttl: DurationUnit;

  /**
   * If true, use localStorage, otherwise use in-memory cache.
   * @type {boolean}
   * @default false
   */
  persist: boolean;

  /**
   * If true, invalidate the cache.
   * @type {boolean}
   * @default false
   */
  invalidate?: boolean;

  serialize?: (request: any) => string;
};

export class CacheStrategy extends Strategy<CacheOptions> {
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
    invalidate: false,
  };

  #cache: CacheDriverContract<string>;

  constructor(cacheManager: CacheManager, options?: Partial<CacheOptions>) {
    super({
      ...CacheStrategy.#defaultOptions,
      ...options,
    });

    this.#cache = this.options.persist
      ? cacheManager.localStorageCache
      : cacheManager.inMemoryCache;
  }

  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = `cache_strategy_key::${
      this.options.serialize?.(request) ?? JSON.stringify(request)
    }`;
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
