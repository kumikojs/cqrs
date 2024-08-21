/* eslint-disable @typescript-eslint/no-explicit-any */

import { InterceptorManager } from '../../infrastructure/middleware/interceptor_manager';
import { QueryCache } from '../query/query_cache';
import { createResilienceStrategiesBuilder } from './resilience_strategies_builder';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';

import type {
  ResilienceBuilderOptions,
  ResilienceOptions,
  ResilienceStrategiesBuilder,
} from '../../types/core/options/resilience_options';
import type { Maybe } from '../../types/helpers';

/**
 * A builder responsible for constructing a series of resilience interceptors
 * that can be applied to requests to handle potential issues and improve
 * the overall reliability of operations.
 *
 * @template T - The type of requests that will be intercepted, extending
 *   a base type that includes an optional `options` property of type
 *   `ResilienceOptions`.
 */
export class ResilienceInterceptorsBuilder<
  T extends {
    options?: ResilienceOptions;
  }
> {
  /**
   * The resilience strategies builder used to create instances of various
   * strategies for handling potential issues and improving the robustness of
   * asynchronous operations.
   *
   * This property is private as it's an internal dependency used for
   * constructing resilience strategies within the builder.
   * @private
   */
  #strategyBuilder: ResilienceStrategiesBuilder;

  /**
   * The interceptor manager responsible for chaining and executing a series of
   * resilience interceptors in the desired order.
   *
   * This property holds the core functionality of the builder, managing
   * the sequence of interceptors applied to requests.
   * @private
   */
  #interceptorManager: InterceptorManager<T>;

  /**
   * The deduplication strategy instance specifically configured for the context
   * of this builder.
   *
   * This pre-configured deduplication strategy is readily available for use
   * within the interceptor chain.
   */
  #deduplicationStrategy: ReturnType<
    ResilienceStrategiesBuilder['deduplication']
  >;

  /**
   * A function used to serialize a request object into a unique cache key.
   *
   * This serializer function is essential for caching strategies to identify
   * and manage cached results effectively.
   */
  #serializer: (request: T) => string;

  #options: Maybe<ResilienceBuilderOptions>;

  /**
   * Initializes a new instance of the `ResilienceInterceptorsBuilder` class.
   *
   * @param cache - The cache implementation to be utilized by resilience strategies.
   * @param { serialize: (request: T) => string } - An object containing a `serialize`
   *   function that generates a unique cache key for a given request.
   */
  constructor(
    cache: QueryCache,
    logger: KumikoLogger,
    {
      serialize,
      ...options
    }: { serialize: (request: T) => string } & ResilienceBuilderOptions
  ) {
    this.#strategyBuilder = createResilienceStrategiesBuilder(cache, logger);
    this.#interceptorManager = new InterceptorManager(logger);
    this.#deduplicationStrategy = this.#strategyBuilder.deduplication({
      serialize,
    });
    this.#serializer = serialize;
    this.#options = options;
  }

  /**
   * Add the retry interceptor.
   *
   * @returns {this} The builder.
   */
  public addRetryInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.retry',
      async (command, next) => {
        if (!command.options?.retry) {
          return next?.(command);
        }

        const strategy = this.#strategyBuilder.retry({
          ...(typeof command.options.retry === 'boolean'
            ? {}
            : command.options.retry),
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
    );

    return this;
  }

  /**
   * Add the timeout interceptor.
   *
   * @returns {this} The builder.
   */
  public addTimeoutInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.timeout',
      async (command, next) => {
        if (!command.options?.timeout) {
          return next?.(command);
        }

        const strategy = this.#strategyBuilder.timeout({
          timeout:
            typeof command.options.timeout === 'boolean'
              ? undefined
              : command.options.timeout || this.#options?.timeout,
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
    );

    return this;
  }

  /**
   * Add the throttle interceptor.
   *
   * @returns {this} The builder.
   */
  public addThrottleInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.throttle',
      async (command, next) => {
        if (!command.options?.throttle) {
          return next?.(command);
        }

        const strategy = this.#strategyBuilder.throttle({
          ...(typeof command.options.throttle === 'boolean'
            ? {}
            : command.options.throttle || this.#options?.throttle),
          serialize: this.#serializer,
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
    );

    return this;
  }

  /**
   * Add the fallback interceptor.
   *
   * @returns {this} The builder.
   */
  public addFallbackInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.fallback',
      async (command, next) => {
        if (!command.options?.fallback) {
          return next?.(command);
        }

        const strategy = this.#strategyBuilder.fallback({
          fallback: command.options.fallback,
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
    );

    return this;
  }

  /**
   * Add the cache interceptor.
   *
   * @returns {this} The builder.
   */
  public addCacheInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.cache',
      async (command, next) => {
        if (!command.options?.cache) {
          return next?.(command);
        }

        const strategy = this.#strategyBuilder.cache({
          ...(typeof command.options.cache === 'boolean'
            ? {}
            : command.options.cache),
          serialize: this.#serializer,
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
    );

    return this;
  }

  /**
   * Add the deduplication interceptor.
   *
   * @returns {this} The builder.
   */
  public addDeduplicationInterceptor(): this {
    this.#interceptorManager.use(
      'kumiko.resilience.interceptors.deduplication',
      async (command, next) => {
        return this.#deduplicationStrategy.execute(command, async (request) =>
          next?.(request)
        );
      }
    );
    return this;
  }

  /**
   * Constructs and returns the configured `InterceptorManager`, ready to be
   * integrated into command execution flows to handle resilience concerns.
   *
   * @returns {InterceptorManager<T>} The fully constructed `InterceptorManager`.
   */
  public build(): InterceptorManager<T> {
    return this.#interceptorManager;
  }
}
