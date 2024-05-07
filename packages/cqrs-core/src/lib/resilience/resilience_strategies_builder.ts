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
import { QueryCache } from '../query/query_cache';
import { StoikLogger } from '../logger/stoik_logger';

/**
 * A builder for creating instances of various resilience strategies to handle
 * potential issues and improve the robustness of asynchronous operations.
 */
export type ResilienceStrategiesBuilder = {
  /**
   * Creates a CacheStrategy instance for caching task results.
   *
   * @param options - Partial configuration options for the CacheStrategy.
   * @returns A newly constructed CacheStrategy instance.
   */
  cache: (options: Partial<CacheOptions>) => CacheStrategy;

  /**
   * Creates a retry strategy for retries the task on failure.
   *
   * @param {Partial<RetryOptions>} options - The retry options.
   * @returns {RetryStrategy} The retry strategy.
   */
  retry: (options: Partial<RetryOptions>) => RetryStrategy;

  /**
   * Creates a throttle strategy for throttling the task.
   *
   * @param {Partial<ThrottleOptions>} options - The throttle options.
   * @returns {ThrottleStrategy} The throttle strategy.
   */
  throttle: (options: Partial<ThrottleOptions>) => ThrottleStrategy;

  /**
   * Creates a timeout strategy for timing out the task after a specified duration.
   *
   * @param {Partial<TimeoutOptions>} options - The timeout options.
   * @returns {TimeoutStrategy} The timeout strategy.
   */
  timeout: (options: Partial<TimeoutOptions>) => TimeoutStrategy;

  /**
   * Creates a deduplication strategy for deduplicating the task.
   *
   * @param {Partial<DeduplicationOptions>} options - The deduplication options.
   * @returns {DeduplicationStrategy} The deduplication strategy.
   */
  deduplication: (options: DeduplicationOptions) => DeduplicationStrategy;

  /**
   * Creates a fallback strategy for falling back to a default value on failure.
   *
   * @param {Partial<FallbackOptions>} options - The fallback options.
   * @returns {FallbackStrategy} The fallback strategy.
   */
  fallback: (options: FallbackOptions) => FallbackStrategy;
};

/**
 * A factory function that creates a ResilienceStrategiesBuilder instance,
 * providing a centralized way to construct various resilience strategies.
 *
 * @param cache - The Cache implementation to be used by strategies that require caching.
 * @returns A new ResilienceStrategiesBuilder instance.
 */
export const createResilienceStrategiesBuilder = (
  cache: QueryCache,
  logger: StoikLogger
): ResilienceStrategiesBuilder => ({
  cache: (options) => new CacheStrategy(cache, options),
  retry: (options) => new RetryStrategy(options),
  throttle: (options) => new ThrottleStrategy(cache.l1, logger, options),
  timeout: (options) => new TimeoutStrategy(options),
  deduplication: (options) => new DeduplicationStrategy(options),
  fallback: (options) => new FallbackStrategy(options),
});
