import type { CacheOptions } from '../resilience/strategies/cache_strategy';
import type { FallbackOptions } from '../resilience/strategies/fallback_strategy';
import type { RetryOptions } from '../resilience/strategies/retry_strategy';
import type { ThrottleOptions } from '../resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from '../resilience/strategies/timeout_strategy';

export type QueryContext = {
  signal?: AbortSignal;
};

export type QueryOptions = Partial<{
  retry: RetryOptions;
  cache: Omit<CacheOptions, 'serialize'>;
  timeout: TimeoutOptions['timeout'];
  throttle: Omit<ThrottleOptions, 'serialize'>;
  fallback: FallbackOptions['fallback'];
}>;
