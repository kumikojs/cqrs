/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../../internal/cache/cache';
import { Strategy } from './base_strategy';

import type { CacheDriverContract } from '../../internal/cache/cache_driver';
import type { DurationUnit } from '../../internal/ms/types';
import type { AsyncFunction } from '../../types';

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

  constructor(cache: Cache, options?: Partial<CacheOptions>) {
    super({
      ...CacheStrategy.#defaultOptions,
      ...options,
    });

    this.#cache = this.options.persist
      ? cache.localStorageCache
      : cache.inMemoryCache;
  }

  public async execute<
    TRequest,
    TTask extends AsyncFunction,
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
