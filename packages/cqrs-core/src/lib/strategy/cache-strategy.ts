/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheDriverContract } from '../internal/cache/cache-driver';
import { CacheManager } from '../internal/cache/cache-manager';
import type { PromiseAnyFunction } from '../internal/types';
import type { TTL } from '../utils/ttl';
import { Strategy } from './internal/strategy';

export type CacheOptions = {
  /**
   * The time to live (TTL) for the cache.
   * @default '30s'
   * @see {@link TTL}
   */
  ttl: TTL;

  /**
   * If true, use localStorage, otherwise use in-memory cache.
   * @type {boolean}
   * @default false
   */
  persist: boolean;

  serialize?: (request: any) => string;
};

export class CacheStrategy extends Strategy<CacheOptions> {
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
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
    const cachedValue = await this.#cache.get<TResult>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = await task(request);
    await this.#cache.set(key, result, this.options.ttl);
    return result;
  }
}
