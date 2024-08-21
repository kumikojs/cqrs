import { AesopLogger } from '../../utilities/logger/aesop_logger';
import { QueryCache } from '../query/query_cache';
import { CacheStrategy } from './strategies/cache_strategy';
import { DeduplicationStrategy } from './strategies/deduplication_strategy';
import { FallbackStrategy } from './strategies/fallback_strategy';
import { RetryStrategy } from './strategies/retry_strategy';
import { ThrottleStrategy } from './strategies/throttle_strategy';
import { TimeoutStrategy } from './strategies/timeout_strategy';

import type { ResilienceStrategiesBuilder } from '../../types/core/options/resilience_options';

/**
 * A factory function that creates a ResilienceStrategiesBuilder instance,
 * providing a centralized way to construct various resilience strategies.
 *
 * @param cache - The Cache implementation to be used by strategies that require caching.
 * @returns A new ResilienceStrategiesBuilder instance.
 */
export const createResilienceStrategiesBuilder = (
  cache: QueryCache,
  logger: AesopLogger
): ResilienceStrategiesBuilder => ({
  cache: (options) => new CacheStrategy(cache, options),
  retry: (options) => new RetryStrategy(options),
  throttle: (options) => new ThrottleStrategy(cache.l1, logger, options),
  timeout: (options) => new TimeoutStrategy(options),
  deduplication: (options) => new DeduplicationStrategy(options),
  fallback: (options) => new FallbackStrategy(options),
});
