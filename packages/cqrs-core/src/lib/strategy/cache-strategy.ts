/* eslint-disable @typescript-eslint/no-explicit-any */
import { CacheDriverContract } from '../internal/cache/cache-driver';
import { CacheManager } from '../internal/cache/cache-manager';
import { PromiseAnyFunction } from '../internal/types';
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
};

export class CacheStrategy extends Strategy<CacheOptions> {
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    persist: false,
  };

  #cache: CacheDriverContract<string>;

  constructor(options?: Partial<CacheOptions>) {
    super({
      ttl: options?.ttl ?? CacheStrategy.#defaultOptions.ttl,
      persist: options?.persist ?? CacheStrategy.#defaultOptions.persist,
    });

    this.#cache = this.options.persist
      ? CacheManager.getInstance().localStorageCache
      : CacheManager.getInstance().inMemoryCache;
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const key = `cache_strategy_id::${JSON.stringify(request)}`;
    const cachedValue = this.#cache.get<TResult>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = await task(request);
    this.#cache.set(key, result, this.options.ttl);
    return result;
  }
}
