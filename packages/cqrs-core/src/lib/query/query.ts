import type { CacheOptions } from '../strategy/cache-strategy';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

type QueryContext = {
  signal?: AbortSignal;
};

export type QueryOptions = {
  retry?: RetryOptions;
  cache?: Omit<CacheOptions, 'serialize'>;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
};

export interface QueryContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  queryName: TName;
  payload?: TPayload;
  options?: TOptions & QueryOptions & Record<string, unknown>;
  context?: QueryContext;
}
