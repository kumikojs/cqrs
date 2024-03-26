import type { CacheOptions } from '../resilience/strategies/cache_strategy';
import type { FallbackOptions } from '../resilience/strategies/fallback_strategy';
import type { RetryOptions } from '../resilience/strategies/retry_strategy';
import type { ThrottleOptions } from '../resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from '../resilience/strategies/timeout_strategy';

/**
 * The context for the query.
 */
export type QueryContext = {
  /**
   * The signal used to abort the query.
   *
   * @remarks This signal can be passed from tiers libraries like `@tanstack/query`.
   */
  signal?: AbortSignal;
};

export type QueryOptions = Partial<{
  /**
   * The retry options for the query.
   *
   * @see RetryOptions for more information. {@link RetryOptions}
   */
  retry: RetryOptions;

  /**
   * The cache options for the query.
   *
   * @see CacheOptions for more information. {@link CacheOptions}
   */
  cache: Omit<CacheOptions, 'serialize'>;

  /**
   * The timeout options for the query.
   *
   * @see TimeoutOptions for more information. {@link TimeoutOptions}
   */
  timeout: TimeoutOptions['timeout'];

  /**
   * The throttle options for the query.
   *
   * @see ThrottleOptions for more information. {@link ThrottleOptions}
   */
  throttle: Omit<ThrottleOptions, 'serialize'>;

  /**
   * The fallback options for the query.
   *
   * @see FallbackOptions for more information. {@link FallbackOptions}
   */
  fallback: FallbackOptions['fallback'];
}>;
