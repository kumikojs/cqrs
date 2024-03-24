/* eslint-disable @typescript-eslint/no-explicit-any */

import { CacheManager } from '../internal/cache/cache-manager';
import { InterceptorManager } from '../internal/interceptor/interceptor-manager';
import {
  createStrategyBuilder,
  type StrategyBuilder,
} from './strategy_builder';

export class ResiliencyInterceptorBuilder<
  T extends {
    options?: any;
  }
> {
  #strategyBuilder: StrategyBuilder;
  #interceptorManager: InterceptorManager<T>;
  #deduplicationStrategy: ReturnType<StrategyBuilder['deduplication']>;
  #serializer: (request: T) => string;

  constructor(
    public readonly cache: CacheManager,
    { serialize }: { serialize: (request: T) => string }
  ) {
    this.#strategyBuilder = createStrategyBuilder(cache);
    this.#interceptorManager = new InterceptorManager();
    this.#deduplicationStrategy = this.#strategyBuilder.deduplication({
      serialize,
    });
    this.#serializer = serialize;
  }

  public addRetryInterceptor() {
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

  public addTimeoutInterceptor() {
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

  public addThrottleInterceptor() {
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

  public addFallbackInterceptor() {
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

  public addCacheInterceptor() {
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

  public addDeduplicationInterceptor() {
    this.#interceptorManager.use(async (command, next) => {
      console.log('deduplication', this.#serializer(command));
      return this.#deduplicationStrategy.execute(command, async (request) =>
        next?.(request)
      );
    });
    return this;
  }

  public build() {
    return this.#interceptorManager;
  }
}
