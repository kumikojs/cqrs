/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheDriverContract } from '../internal/cache/cache-driver';
import type { PromiseAnyFunction } from '../internal/types';
import type { TTL } from '../internal/ttl/ttl';

import { Strategy } from './internal/strategy';

export type ThrottleOptions = {
  /**
   * The time to live (TTL) for the cache.
   * When the TTL is a number, it is treated as milliseconds.
   * @default '5s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   * 1000 // 1000 milliseconds
   */
  interval: TTL;

  /**
   * The maximum number of the same request that can be made within the TTL.
   * @type {number}
   * @default 5
   */
  rate: number;

  serialize?: (request: any) => string;
};

export class ThrottleException extends Error {
  public constructor(rate: number, ttl: TTL) {
    super(
      `Rate rate exceeded. Limit: ${rate} requests per ${ttl}${ThrottleException.#suffix(
        ttl
      )}`
    );
  }

  static #suffix = (ttl: TTL): string => (typeof ttl === 'number' ? 'ms' : '');
}

export class ThrottleStrategy extends Strategy<ThrottleOptions> {
  static #options: ThrottleOptions = {
    interval: '5s',
    rate: 5,
  };

  #cache: CacheDriverContract<string>;

  constructor(
    cache: CacheDriverContract<string>,
    options?: Partial<ThrottleOptions>
  ) {
    super({
      ...ThrottleStrategy.#options,
      ...options,
    });

    if (this.options.rate < 1) {
      console.error('Rate must be greater than or equal to 1');
      this.options.rate = Infinity;
    }

    this.#cache = cache;
  }

  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = `throttle_strategy_id::${
      this.options.serialize?.(request) ?? JSON.stringify(request)
    }`;
    const cachedValue = this.#cache.get<number>(key);

    if (cachedValue === undefined) {
      this.#cache.set(key, 1, this.options.interval);
      return task(request);
    }

    if (cachedValue >= this.options.rate) {
      throw new ThrottleException(this.options.rate, this.options.interval);
    }

    this.#cache.set(key, cachedValue + 1, this.options.interval);
    return task(request);
  }
}
