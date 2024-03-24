import type { CacheOptions } from '../strategy/cache-strategy';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';
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
