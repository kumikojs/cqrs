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

export type ResilienceStrategiesBuilder = {
  cache: (options: Partial<CacheOptions>) => CacheStrategy;
  retry: (options: Partial<RetryOptions>) => RetryStrategy;
  throttle: (options: Partial<ThrottleOptions>) => ThrottleStrategy;
  timeout: (options: Partial<TimeoutOptions>) => TimeoutStrategy;
  deduplication: (options: DeduplicationOptions) => DeduplicationStrategy;
  fallback: (options: FallbackOptions) => FallbackStrategy;
};

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
