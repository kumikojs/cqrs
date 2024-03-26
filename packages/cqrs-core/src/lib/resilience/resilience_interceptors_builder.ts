/* eslint-disable @typescript-eslint/no-explicit-any */

import { Cache } from '../internal/cache/cache';
import { InterceptorManager } from '../internal/interceptor/interceptor_manager';
import { createResilienceStrategiesBuilder } from './resilience_strategies_builder';

import type { ResilienceStrategiesBuilder } from './resilience_strategies_builder';

/**
 * The resilience interceptors builder.
 */
export class ResilienceInterceptorsBuilder<
  T extends {
    options?: any;
  }
> {
  /**
   * The resilience strategies builder.
   */
  #strategyBuilder: ResilienceStrategiesBuilder;

  /**
   * The interceptor manager.
   */
  #interceptorManager: InterceptorManager<T>;

  /**
   * The deduplication strategy.
   */
  #deduplicationStrategy: ReturnType<
    ResilienceStrategiesBuilder['deduplication']
  >;

  /**
   * The serializer function used to generate the cache key.
   */
  #serializer: (request: T) => string;

  constructor(
    cache: Cache,
    { serialize }: { serialize: (request: T) => string }
  ) {
    this.#strategyBuilder = createResilienceStrategiesBuilder(cache);
    this.#interceptorManager = new InterceptorManager();
    this.#deduplicationStrategy = this.#strategyBuilder.deduplication({
      serialize,
    });
    this.#serializer = serialize;
  }

  /**
   * Add the retry interceptor.
   *
   * @returns {this} The builder.
   */
  public addRetryInterceptor(): this {
    this.#interceptorManager.tap(
      (command) => Boolean(command.options?.retry),
      async (command, next) => {
        console.log('retry');
        const strategy = this.#strategyBuilder.retry({
          delay: command.options?.retry?.delay,
          maxAttempts: command.options?.retry?.maxAttempts,
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
    this.#interceptorManager.tap(
      (command) => Boolean(command.options?.timeout),
      async (command, next) => {
        console.log('timeout');
        const strategy = this.#strategyBuilder.timeout({
          timeout: command.options?.timeout,
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
    this.#interceptorManager.tap(
      (command) => Boolean(command.options?.throttle),
      async (command, next) => {
        console.log('throttle');
        const strategy = this.#strategyBuilder.throttle({
          rate: command.options?.throttle?.rate,
          interval: command.options?.throttle?.interval,
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
    this.#interceptorManager.use(async (command, next) => {
      console.log('fallback');
      if (command?.options?.fallback) {
        const strategy = this.#strategyBuilder.fallback({
          fallback: command.options.fallback,
        });
        return strategy.execute(command, async (request) => next?.(request));
      }
      return next?.(command);
    });
    return this;
  }

  /**
   * Add the cache interceptor.
   *
   * @returns {this} The builder.
   */
  public addCacheInterceptor(): this {
    this.#interceptorManager.tap(
      (command) => Boolean(command.options?.cache),
      async (command, next) => {
        console.log('cache');
        const strategy = this.#strategyBuilder.cache({
          ...command.options?.cache,
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
    this.#interceptorManager.use(async (command, next) => {
      console.log('deduplication', this.#serializer(command));
      return this.#deduplicationStrategy.execute(command, async (request) =>
        next?.(request)
      );
    });
    return this;
  }

  /**
   * Build the interceptor manager.
   *
   * @returns {InterceptorManager<T>} The interceptor manager.
   */
  public build(): InterceptorManager<T> {
    return this.#interceptorManager;
  }
}
