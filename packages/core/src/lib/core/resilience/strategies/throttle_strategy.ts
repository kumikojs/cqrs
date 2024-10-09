/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../../../infrastructure/cache/cache';
import { KumikoLogger } from '../../../utilities/logger/kumiko_logger';
import { Strategy } from './base_strategy';
import { ThrottleException } from './exceptions/throttle_exception';

import type { ThrottleOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class ThrottleStrategy extends Strategy<ThrottleOptions> {
  /**
   * The namespace for isolating throttle-related data in the cache.
   */
  static readonly namespace = 'ns_throttle';

  static #options: ThrottleOptions = {
    interval: '5s',
    rate: 5,
    serialize: (request) => JSON.stringify(request),
  };

  #cache: Cache;

  #logger: KumikoLogger;

  constructor(
    cache: Cache,
    logger: KumikoLogger,
    options?: Partial<ThrottleOptions>
  ) {
    super({
      ...ThrottleStrategy.#options,
      ...options,
    });

    this.#logger = logger.child({});

    if (this.options.rate < 1) {
      this.#logger.error(
        `Throttle rate must be greater than or equal to 1. Received: ${this.options.rate}`,
        {
          topics: ['interceptors', 'resilience'],
          data: { rate: this.options.rate },
        }
      );
      this.options.rate = ThrottleStrategy.#options.rate;
    }

    this.#cache = cache;
  }

  async execute<
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
