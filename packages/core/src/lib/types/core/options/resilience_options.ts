/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from '../../../core/resilience/strategies/base_strategy';

import type { DurationUnit } from '../../helpers';

/**
 * Configuration options for tailoring cache behavior.
 */
export type ResilienceCacheOptions = {
  /**
   * The time to live (TTL) for cached values in a duration format.
   * Defaults to '5m'.
   */
  validityPeriod?: DurationUnit;

  /**
   * The time to consider a cached value stale and in need of refresh in a duration format.
   * Defaults to '5m'.
   */
  gracePeriod?: DurationUnit;

  /**
   * Flag to enable or disable L2 cache.
   * Defaults to 'true'.
   */
  persist: boolean;

  /**
   * Serializes a request into a namespace and key pair for cache lookup and storage.
   */
  serialize: (request: any) => string;

  /**
   * Determines whether to invalidate cached values after retrieval.
   * Defaults to false.
   */
  invalidate: boolean;
};

/**
 * Configuration options for customizing request deduplication behavior.
 */
export type DeduplicationOptions = {
  /**
   * Serializes a request into a unique string representation for deduplication purposes.
   */
  serialize: (request: any) => string;
};

/**
 * Configuration options for defining fallback behavior in case of task failures.
 */
export type FallbackOptions = {
  /**
   * A function to be invoked when the primary task execution encounters an error.
   * This function receives the original request and the encountered error,
   * allowing for custom fallback logic and potential error handling.
   *
   * @param request - The request data used for the task execution.
   * @param error - The error object thrown by the failing task.
   * @returns The fallback result value.
   */
  fallback: <TRequest>(request: TRequest, error: unknown) => any;
};

/**
 * Configuration options for customizing the retry behavior of the strategy.
 */
export type RetryOptions = {
  /**
   * The maximum number of attempts to execute the task before giving up.
   * Defaults to 3 retries.
   *
   * @default 3
   * @type {number}
   */
  maxAttempts: number;

  /**
   * The delay between retry attempts in a duration format.
   * Supports various units like milliseconds ('ms'), seconds ('s'), minutes ('m'), etc.
   * Defaults to '1s' (one second).
   *
   * @default '1s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  delay: DurationUnit;

  /**
   * An array of error types (or classes) that should immediately cause the strategy
   * to abandon retries and throw the encountered error. Any other error type
   * will be retried up to the configured `maxAttempts`.
   *
   * @type {any[]}
   * @example
   * [MyCustomError, NetworkError] // These errors will not be retried.
   */
  shouldNotRetryErrors: any[];
};

/**
 * Configuration options for defining throttling behavior for requests.
 */
export type ThrottleOptions = {
  /**
   * The interval to use for throttling requests.
   *
   * @default '5s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   * 1000 // 1000 milliseconds (can also use numeric values for milliseconds)
   */
  interval: DurationUnit;

  /**
   * The maximum number of requests allowed within the configured interval for a specific request.
   * Exceeding this limit will result in a `ThrottleException` being thrown.
   *
   * @default 5
   * @type {number}
   */
  rate: number;

  /**
   * An optional function to customize the request serialization process.
   * By default, JSON.stringify is used to convert the request to a string key for caching.
   * This function allows for alternative serialization strategies if needed.
   *
   * @type {(request: any) => string}
   */
  serialize: (request: any) => string;
};

/**
 * Configuration options for defining the timeout behavior of the strategy.
 */
export type TimeoutOptions = {
  /**
   * The time to wait before timing out the task.
   *
   * @default '30s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  timeout: DurationUnit;
};

export type ResilienceBuilderOptions =
  | Partial<{
      timeout: TimeoutOptions['timeout'];
      throttle: Omit<Partial<ThrottleOptions>, 'serialize'>;
      retry: Partial<RetryOptions>;
    }>
  | undefined;

/**
 * A structure representing various resilience options that can be configured
 * for a query to enhance its robustness and adaptability.
 */
export type ResilienceOptions = Partial<{
  /**
   * The retry options for the query.
   *
   * @see RetryOptions for more information. {@link RetryOptions}
   */
  retry: Partial<RetryOptions> | false;

  /**
   * The cache options for the query.
   */
  cache:
    | Omit<Partial<ResilienceCacheOptions>, 'serialize' | 'invalidate'>
    | false;

  /**
   * The timeout options for the query.
   *
   * @see TimeoutOptions for more information. {@link TimeoutOptions}
   */
  timeout: TimeoutOptions['timeout'] | false;

  /**
   * The throttle options for the query.
   *
   * @see ThrottleOptions for more information. {@link ThrottleOptions}
   */
  throttle: Omit<Partial<ThrottleOptions>, 'serialize'> | false;

  /**
   * The fallback options for the query.
   *
   * @see FallbackOptions for more information. {@link FallbackOptions}
   */
  fallback: FallbackOptions['fallback'];
}>;

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
  cache: (
    options: Partial<ResilienceCacheOptions>
  ) => Strategy<ResilienceCacheOptions>;

  /**
   * Creates a retry strategy for retries the task on failure.
   *
   * @param {Partial<RetryOptions>} options - The retry options.
   * @returns {RetryStrategy} The retry strategy.
   */
  retry: (options: Partial<RetryOptions>) => Strategy<RetryOptions>;

  /**
   * Creates a throttle strategy for throttling the task.
   *
   * @param {Partial<ThrottleOptions>} options - The throttle options.
   * @returns {ThrottleStrategy} The throttle strategy.
   */
  throttle: (options: Partial<ThrottleOptions>) => Strategy<ThrottleOptions>;

  /**
   * Creates a timeout strategy for timing out the task after a specified duration.
   *
   * @param {Partial<TimeoutOptions>} options - The timeout options.
   * @returns {TimeoutStrategy} The timeout strategy.
   */
  timeout: (options: Partial<TimeoutOptions>) => Strategy<TimeoutOptions>;

  /**
   * Creates a deduplication strategy for deduplicating the task.
   *
   * @param {Partial<DeduplicationOptions>} options - The deduplication options.
   * @returns {DeduplicationStrategy} The deduplication strategy.
   */
  deduplication: (
    options: DeduplicationOptions
  ) => Strategy<DeduplicationOptions>;

  /**
   * Creates a fallback strategy for falling back to a default value on failure.
   *
   * @param {Partial<FallbackOptions>} options - The fallback options.
   * @returns {FallbackStrategy} The fallback strategy.
   */
  fallback: (options: FallbackOptions) => Strategy<FallbackOptions>;
};
