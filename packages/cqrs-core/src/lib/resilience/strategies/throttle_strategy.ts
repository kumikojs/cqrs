/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { CacheDriverContract } from '../../internal/cache/cache_driver';
import type { DurationUnit } from '../../internal/ms/types';
import type { AsyncFunction } from '../../types';

/**
 * The throttle options.
 */
export type ThrottleOptions = {
  /**
   * The interval to throttle the requests.
   *
   * @default '5s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   * 1000 // 1000 milliseconds
   */
  interval: DurationUnit;

  /**
   * The maximum number of the same request that can be made within the TTL.
   *
   * @type {number}
   * @default 5
   */
  rate: number;

  serialize?: (request: any) => string;
};

/**
 * The throttle exception.
 */
export class ThrottleException extends Error {
  public constructor(rate: number, ttl: DurationUnit) {
    super(
      `Rate limit exceeded. Limit: ${rate} requests per ${ttl}${ThrottleException.#suffix(
        ttl
      )}`
    );
  }

  /**
   * Get the suffix for the duration unit.
   * @param {DurationUnit} ttl - The duration unit.
   * @returns {string} The suffix.
   */
  static #suffix = (ttl: DurationUnit): string =>
    typeof ttl === 'number' ? 'ms' : '';
}

/**
 * The throttle strategy.
 * This strategy will throttle the requests.
 * If the same request is made more than the rate within the interval, an exception will be thrown.
 */
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

  /**
   * Execute the task with throttling.
   *
   * If the same request is made more than the rate within the interval,
   * an exception will be thrown.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
   * @throws {ThrottleException} Thrown when the rate limit is exceeded.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = `throttle_id:${
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
