/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheDriverContract } from '../internal/cache/cache-driver';
import type { PromiseAnyFunction } from '../internal/types';
import type { TTL } from '../utils/ttl';
import { Strategy } from './internal/strategy';

export type ThrottleOptions = {
  /**
   * The time to live (TTL) for the cache.
   * @default '5s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  ttl: TTL;

  /**
   * The maximum number of the same request that can be made within the TTL.
   * @type {number}
   * @default 5
   */
  limit: number;

  serialize?: (request: any) => string;
};

export class ThrottleException extends Error {
  public constructor(limit: number, ttl: TTL) {
    super(
      `Rate limit exceeded. Limit: ${limit} requests per ${ttl}${ThrottleException.#suffix(
        ttl
      )}`
    );
  }

  static #suffix = (ttl: TTL): string => (typeof ttl === 'number' ? 'ms' : '');
}

export class ThrottleStrategy extends Strategy<ThrottleOptions> {
  static #options: ThrottleOptions = {
    ttl: '5s',
    limit: 5,
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

    if (this.options.limit < 1) {
      console.error('Limit must be greater than or equal to 1');
      this.options.limit = Infinity;
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
    const cachedValue = await this.#cache.get<number>(key);

    if (cachedValue === undefined) {
      await this.#cache.set(key, 1, this.options.ttl);
      return task(request);
    }

    if (cachedValue >= this.options.limit) {
      throw new ThrottleException(this.options.limit, this.options.ttl);
    }

    await this.#cache.set(key, cachedValue + 1, this.options.ttl);
    return task(request);
  }
}
