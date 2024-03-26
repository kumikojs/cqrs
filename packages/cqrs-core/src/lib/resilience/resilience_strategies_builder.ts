import { Cache } from '../internal/cache/cache';
import { CacheStrategy } from './strategies/cache_strategy';
import { DeduplicationStrategy } from './strategies/deduplication_strategy';
import { FallbackStrategy } from './strategies/fallback_strategy';
import { RetryStrategy } from './strategies/retry_strategy';
import { ThrottleStrategy } from './strategies/throttle_strategy';
import { TimeoutStrategy } from './strategies/timeout_strategy';

import type { CacheOptions } from './strategies/cache_strategy';
import type { DeduplicationOptions } from './strategies/deduplication_strategy';
import type { FallbackOptions } from './strategies/fallback_strategy';
import type { RetryOptions } from './strategies/retry_strategy';
import type { ThrottleOptions } from './strategies/throttle_strategy';
import type { TimeoutOptions } from './strategies/timeout_strategy';

/**
 * The resilience strategies builder.
 */
export type ResilienceStrategiesBuilder = {
  /**
   * Create a cache strategy.
   *
   * This strategy caches the results of a task.
   *
   * @param {Partial<CacheOptions>} options - The cache options.
   * @returns {CacheStrategy} The cache strategy.
   */
  cache: (options: Partial<CacheOptions>) => CacheStrategy;

  /**
   * Create a retry strategy.
   *
   * This strategy retries the task on failure.
   *
   * @param {Partial<RetryOptions>} options - The retry options.
   * @returns {RetryStrategy} The retry strategy.
   */
  retry: (options: Partial<RetryOptions>) => RetryStrategy;

  /**
   * Create a throttle strategy.
   *
   * This strategy throttles the task.
   *
   * @param {Partial<ThrottleOptions>} options - The throttle options.
   * @returns {ThrottleStrategy} The throttle strategy.
   */
  throttle: (options: Partial<ThrottleOptions>) => ThrottleStrategy;

  /**
   * Create a timeout strategy.
   *
   * This strategy will timeout the task after a specified duration.
   *
   * @param {Partial<TimeoutOptions>} options - The timeout options.
   * @returns {TimeoutStrategy} The timeout strategy.
   */
  timeout: (options: Partial<TimeoutOptions>) => TimeoutStrategy;

  /**
   * Create a deduplication strategy.
   *
   * This strategy deduplicates the task.
   *
   * @param {Partial<DeduplicationOptions>} options - The deduplication options.
   * @returns {DeduplicationStrategy} The deduplication strategy.
   */
  deduplication: (options: DeduplicationOptions) => DeduplicationStrategy;

  /**
   * Create a fallback strategy.
   *
   * This strategy falls back to a default value on failure.
   *
   * @param {Partial<FallbackOptions>} options - The fallback options.
   * @returns {FallbackStrategy} The fallback strategy.
   */
  fallback: (options: FallbackOptions) => FallbackStrategy;
};

/**
 * Create a resilience strategies builder.
 *
 * @param {Cache} cache - The cache.
 * @returns {ResilienceStrategiesBuilder} The resilience strategies builder.
 */
export const createResilienceStrategiesBuilder = (
  cache: Cache
): ResilienceStrategiesBuilder => ({
  cache: (options) => new CacheStrategy(cache, options),
  retry: (options) => new RetryStrategy(options),
  throttle: (options) => new ThrottleStrategy(cache.inMemoryCache, options),
  timeout: (options) => new TimeoutStrategy(options),
  deduplication: (options) => new DeduplicationStrategy(options),
  fallback: (options) => new FallbackStrategy(options),
});
