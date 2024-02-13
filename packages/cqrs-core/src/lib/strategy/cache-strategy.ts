/* eslint-disable @typescript-eslint/no-explicit-any */
import { CacheDriverContract } from '../internal/cache/cache-driver';
import { CacheManager } from '../internal/cache/cache-manager';
import { PromiseAnyFunction } from '../internal/types';
import type { TTL } from '../utils/ttl';
import { Strategy } from './internal/strategy';

export type CacheOptions = {
  /**
   * The time to live (TTL) for the cache.
   * @type {number | TTL} When a number, it represents the time in milliseconds.
   * @default '30s'
   * @example
   * ttl: '30s'
   * ttl: 30000
   * ttl: '1m'
   * ttl: 60000
   */
  ttl?: number | TTL;

  /**
   * If true, use localStorage, otherwise use in-memory cache.
   * @type {boolean}
   * @default false
   */
  localStorage?: boolean;
};

export class CacheStrategy extends Strategy<CacheOptions> {
  static #defaultOptions: CacheOptions = {
    ttl: '30s',
    localStorage: false,
  };

  #cache: CacheDriverContract<string>;

  constructor(options: CacheOptions = CacheStrategy.#defaultOptions) {
    super(options);
    this.#cache = options.localStorage
      ? CacheManager.getInstance().localStorageCache
      : CacheManager.getInstance().inMemoryCache;
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const key = JSON.stringify(request);
    const cachedValue = this.#cache.get<TResult>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = await task(request);
    this.#cache.set(key, result, this.options.ttl);
    return result;
  }
}
