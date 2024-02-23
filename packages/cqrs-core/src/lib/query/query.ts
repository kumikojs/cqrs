import type { Nullable } from '../internal/types';
import { CacheOptions } from '../strategy/cache-strategy';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type QueryName = string;

type QueryContext = {
  abortController?: AbortController;
} & Record<string, unknown>;

export type QueryOptions<TOptions> = {
  bulkhead?: boolean;
  retry?: RetryOptions;
  cache?: Omit<CacheOptions, 'serialize'>;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
} & Record<string, unknown> &
  TOptions;

export interface QueryContract<TPayload = unknown, TOptions = unknown> {
  queryName: QueryName;
  payload?: Nullable<TPayload>;
  options?: QueryOptions<TOptions>; // options are used for query metadata and can be used to select the interceptor
  context?: QueryContext; // context is used to pass additional data to the query handler
}
