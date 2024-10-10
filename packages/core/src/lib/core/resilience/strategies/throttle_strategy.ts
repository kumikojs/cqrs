import { Cache } from '../../../infrastructure/cache/cache';
import { KumikoLogger } from '../../../utilities/logger/kumiko_logger';
import { ms } from '../../../utilities/ms/ms';
import { Strategy } from './base_strategy';
import { ThrottleException } from './exceptions/throttle_exception';

import type { ThrottleOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class ThrottleStrategy extends Strategy<ThrottleOptions> {
  static readonly namespace = 'ns_throttle';
  static #defaultOptions: ThrottleOptions = {
    interval: '5s',
    rate: 5,
    serialize: (request) => JSON.stringify(request),
  };

  readonly #cache: Cache;
  readonly #logger: KumikoLogger;

  static readonly #RATE_LIMIT_LOG_MESSAGE =
    'Rate must be greater than or equal to 1. Defaulting to 5.';

  constructor(
    cache: Cache,
    logger: KumikoLogger,
    options?: Partial<ThrottleOptions>
  ) {
    const mergedOptions = { ...ThrottleStrategy.#defaultOptions, ...options };
    super(mergedOptions);

    this.#cache = cache;
    this.#logger = logger.child({ topics: ['resilience', 'throttle'] });

    this.#validateRate(mergedOptions.rate);
  }

  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = this.options.serialize(request);

    await this.#increment(key);

    return await task(request);
  }

  async #increment(key: string): Promise<void> {
    const cacheKey = this.#getCacheKey(key);
    const currentData = await this.#getCachedTimestamps(cacheKey);

    const now = Date.now();
    const intervalInMillis = ms(this.options.interval);
    const filteredTimestamps = this.#filterTimestamps(
      currentData,
      now,
      intervalInMillis
    );

    this.#checkRateLimit(filteredTimestamps.length);

    filteredTimestamps.push(now);

    await this.#cache.set(cacheKey, filteredTimestamps, intervalInMillis);
  }

  #getCacheKey(key: string): string {
    return `${ThrottleStrategy.namespace}:${key}`;
  }

  async #getCachedTimestamps(cacheKey: string): Promise<number[]> {
    return (await this.#cache.get<number[]>(cacheKey)) ?? [];
  }

  #filterTimestamps(
    timestamps: number[],
    now: number,
    intervalInMillis: number
  ): number[] {
    return timestamps.filter(
      (timestamp) => now - timestamp <= intervalInMillis
    );
  }

  #checkRateLimit(count: number): void {
    if (count >= this.options.rate) {
      throw new ThrottleException(this.options.rate, this.options.interval);
    }
  }

  #validateRate(rate: number) {
    if (rate < 1) {
      this.#logger.error(ThrottleStrategy.#RATE_LIMIT_LOG_MESSAGE, {
        topics: ['interceptors', 'resilience'],
        data: { rate: this.options.rate },
      });
      this.options.rate = ThrottleStrategy.#defaultOptions.rate;
    }
  }
}
