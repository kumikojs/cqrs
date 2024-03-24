import { CacheStrategy } from './cache-strategy';
import { RetryStrategy } from './retry-strategy';
import { ThrottleStrategy } from './throttle-strategy';
import { TimeoutStrategy } from './timeout-strategy';
import { DeduplicationStrategy } from './deduplication-strategy';
import { FallbackStrategy } from './fallback-strategy';

import type { CacheOptions } from './cache-strategy';
import type { RetryOptions } from './retry-strategy';
import type { ThrottleOptions } from './throttle-strategy';
import type { TimeoutOptions } from './timeout-strategy';
import type { DeduplicationOptions } from './deduplication-strategy';
import type { FallbackOptions } from './fallback-strategy';
import { CacheManager } from '../internal/cache/cache-manager';
import type { Interceptor } from '../internal/interceptor/interceptor';

export type StrategyOptions = {
  cache: {
    options: CacheOptions;
    enabled: boolean;
  };
  retry: {
    options: RetryOptions;
    enabled: boolean;
  };
  throttle: {
    options: ThrottleOptions;
    enabled: boolean;
  };
  timeout: {
    options: TimeoutOptions;
    enabled: boolean;
  };
  deduplication: {
    options: DeduplicationOptions;
    enabled: boolean;
  };
  fallback: {
    options: FallbackOptions;
    enabled: boolean;
  };
};

export type StrategyBuilder = {
  cache: (options: Partial<CacheOptions>) => CacheStrategy;
  retry: (options: Partial<RetryOptions>) => RetryStrategy;
  throttle: (options: Partial<ThrottleOptions>) => ThrottleStrategy;
  timeout: (options: Partial<TimeoutOptions>) => TimeoutStrategy;
  deduplication: (options: DeduplicationOptions) => DeduplicationStrategy;
  fallback: (options: FallbackOptions) => FallbackStrategy;
};

export const createStrategyBuilder = (
  cache: CacheManager
): StrategyBuilder => ({
  cache: (options) => new CacheStrategy(cache, options),
  retry: (options) => new RetryStrategy(options),
  throttle: (options) => new ThrottleStrategy(cache.inMemoryCache, options),
  timeout: (options) => new TimeoutStrategy(options),
  deduplication: (options) => new DeduplicationStrategy(options),
  fallback: (options) => new FallbackStrategy(options),
});

export type StrategyInterceptor<T> = Interceptor<T>;

// Interceptors pipeline from strategies
export const createStrategyInterceptor = <T>(
  strategies: StrategyInterceptor<T>[]
): StrategyInterceptor<T> => {
  return async (request, next) => {
    let result = request;

    for (const strategy of strategies) {
      result = await strategy(result, next);
    }

    return result;
  };
};
