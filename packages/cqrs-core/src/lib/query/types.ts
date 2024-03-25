import type { CacheOptions } from '../resilience/strategies/cache_strategy';
import type { FallbackOptions } from '../resilience/strategies/fallback_strategy';
import type { RetryOptions } from '../resilience/strategies/retry_strategy';
import type { ThrottleOptions } from '../resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from '../resilience/strategies/timeout_strategy';
import type { QueryContract } from './contracts';

export type QueryContext = {
  signal?: AbortSignal;
};

export type QueryOptions = Partial<{
  retry: RetryOptions;
  cache: Omit<CacheOptions, 'serialize' | 'invalidate'>;
  timeout: TimeoutOptions['timeout'];
  throttle: Omit<ThrottleOptions, 'serialize'>;
  fallback: FallbackOptions['fallback'];
}>;

export type QueryHandlerFn<
  T extends QueryContract = QueryContract,
  TResponse = unknown
> = (query: T) => Promise<TResponse>;
