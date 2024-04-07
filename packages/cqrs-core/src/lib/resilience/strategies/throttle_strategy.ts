/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { CacheDriver } from '../../internal/cache/cache_driver';
import type { AsyncFunction, DurationUnit } from '../../types';

/**
 * Configuration options for defining throttling behavior for requests.
 */
export type ThrottleOptions = {
  /**
   * The interval to use for throttling requests.
   *
   * @default '5s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   * 1000 // 1000 milliseconds (can also use numeric values for milliseconds)
   */
  interval: DurationUnit;

  /**
   * The maximum number of requests allowed within the configured interval for a specific request.
   * Exceeding this limit will result in a `ThrottleException` being thrown.
   *
   * @default 5
   * @type {number}
   */
  rate: number;

  /**
   * An optional function to customize the request serialization process.
   * By default, JSON.stringify is used to convert the request to a string key for caching.
   * This function allows for alternative serialization strategies if needed.
   *
   * @type {(request: any) => string}
   */
  serialize: (request: any) => string;
};

/**
 * A custom exception thrown when the request rate limit is exceeded.
 * Provides information about the limit and the time interval.
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
   * Retrieves the suffix for the duration unit.
   *
   * @param ttl - The duration unit.
   * @returns The suffix string (e.g., 'ms', 's', 'm').
   */
  static #suffix = (ttl: DurationUnit): string =>
    typeof ttl === 'number' ? 'ms' : '';
}

/**
 * A strategy designed to throttle requests, ensuring only a specific number of requests
 * are allowed within a configured time interval. If a request exceeds the configured
 * rate limit within the interval, a `ThrottleException` is thrown.
 *
 *  @example
 * ```ts
 * import { ThrottleStrategy } from '@stoik/cqrs-core';
 * import { Cache } from '@stoik/cache';
 *
 * const cache = new Cache();
 * const strategy = new ThrottleStrategy(cache);
 *
 * let counter = 0;
 *
 * const task = async () => {
 *    counter += 1;
 *    return counter;
 * };
 *
 * const results = await Promise.all([
 *    strategy.execute({}, task),
 *    strategy.execute({}, task),
 *    strategy.execute({}, task),
 *    strategy.execute({}, task),
 *    strategy.execute({}, task),
 *    strategy.execute({}, task),
 * ]);
 *
 * console.log(results); // [1, 2, 3, 4, 5, ThrottleException]
 * ```
 */
export class ThrottleStrategy extends Strategy<ThrottleOptions> {
  /**
   * The namespace for isolating throttle-related data in the cache.
   * @static
   */
  static readonly namespace = 'ns_throttle';

  /**
   * Default configuration options for the throttle strategy.
   * @private
   * @static
   */
  static #options: ThrottleOptions = {
    interval: '5s',
    rate: 5,
    serialize: (request) => JSON.stringify(request),
  };

  /**
   * @private The underlying cache driver responsible for storing and retrieving throttle-related data.
   */
  #cache: CacheDriver<string>;

  /**
   * Creates a new instance of the ThrottleStrategy.
   *
   * @param cache - The cache driver used for storing throttling data.
   * @param options - Optional configuration options to override defaults.
   */
  constructor(cache: CacheDriver<string>, options?: Partial<ThrottleOptions>) {
    super({
      ...ThrottleStrategy.#options,
      ...options,
    });

    if (this.options.rate < 1) {
      console.error(
        'Rate must be greater than or equal to 1. Defaulting to 5.'
      );
      this.options.rate = ThrottleStrategy.#options.rate;
    }

    this.#cache = cache;
  }

  /**
   * Executes the provided task with throttling logic applied.
   *
   * This method checks if the same request has been made within the configured
   * `interval`. If the request count exceeds the configured `rate` limit within that
   * interval, a `ThrottleException` is thrown. Otherwise, the task is executed
   * and the request count is incremented for the current interval.
   *
   * @template TRequest - The type of request object used for throttling.
   * @template TTask - The type of the task to be executed. Must be an asynchronous function.
   * @template TResult - The return type of the provided task (`TTask`).
   * @param request - The request object used for throttling identification.
   * @param task - The asynchronous task to be executed.
   * @returns A promise that resolves to the result of the executed task (`TResult`).
   * @throws {ThrottleException} Thrown when the request rate limit is exceeded within the interval.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = this.options.serialize(request);

    const cachedValue = this.#cache.get<number>(
      ThrottleStrategy.namespace,
      key
    );

    if (cachedValue === undefined) {
      this.#cache.set(
        ThrottleStrategy.namespace,
        key,
        1,
        this.options.interval
      );

      return task(request);
    }

    if (cachedValue >= this.options.rate) {
      throw new ThrottleException(this.options.rate, this.options.interval);
    }

    this.#cache.set(
      ThrottleStrategy.namespace,
      key,
      cachedValue + 1,
      this.options.interval
    );

    return task(request);
  }
}
