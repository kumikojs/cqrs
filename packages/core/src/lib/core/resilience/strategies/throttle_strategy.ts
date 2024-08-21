/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../../../infrastructure/cache/cache';
import { AesopLogger } from '../../../utilities/logger/aesop_logger';
import { Strategy } from './base_strategy';
import { ThrottleException } from './exceptions/throttle_exception';

import type { ThrottleOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

/**
 * A strategy designed to throttle requests, ensuring only a specific number of requests
 * are allowed within a configured time interval. If a request exceeds the configured
 * rate limit within the interval, a `ThrottleException` is thrown.
 *
 *  @example
 * ```ts
 * import { ThrottleStrategy } from '@aesop/core';
 * import { Cache } from '@aesop/cache';
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
  #cache: Cache;

  #logger: AesopLogger;

  /**
   * Creates a new instance of the ThrottleStrategy.
   *
   * @param cache - The cache driver used for storing throttling data.
   * @param options - Optional configuration options to override defaults.
   */
  constructor(
    cache: Cache,
    logger: AesopLogger,
    options?: Partial<ThrottleOptions>
  ) {
    super({
      ...ThrottleStrategy.#options,
      ...options,
    });

    this.#logger = logger.child({});

    if (this.options.rate < 1) {
      this.#logger.error(
        'Rate must be greater than or equal to 1. Defaulting to 5.',
        {
          topics: ['interceptors', 'resilience'],
          data: { rate: this.options.rate },
        }
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

    const cachedValue = await this.#cache.get<number>(
      `${ThrottleStrategy.namespace}:${key}`
    );

    if (cachedValue === null) {
      await this.#cache.set(
        `${ThrottleStrategy.namespace}:${key}`,
        1,
        this.options.interval
      );

      return task(request);
    }

    if (cachedValue >= this.options.rate) {
      throw new ThrottleException(this.options.rate, this.options.interval);
    }

    await this.#cache.set(
      `${ThrottleStrategy.namespace}:${key}`,
      cachedValue + 1,
      this.options.interval
    );

    return task(request);
  }
}
