import { CacheManager } from '../../internal/cache/cache-manager';
import { InterceptorManager } from '../../internal/interceptor/interceptor-manager';
import {
  BulkheadStrategy,
  type BulkheadOptions,
} from '../../strategy/bulkhead-strategy';
import { CacheStrategy } from '../../strategy/cache-strategy';
import { FallbackStrategy } from '../../strategy/fallback-strategy';
import { Strategy } from '../../strategy/internal/strategy';
import { RetryStrategy } from '../../strategy/retry-strategy';
import { ThrottleStrategy } from '../../strategy/throttle-strategy';
import { TimeoutStrategy } from '../../strategy/timeout-strategy';

import type { QueryContract } from '../query';

type QueryInterceptorProps = {
  cache: CacheManager;
  strategies: {
    bulkhead: { strategy?: Strategy<BulkheadOptions>; enabled?: boolean };
  };
};

export class QueryInterceptorManager<
  BaseQuery extends QueryContract
> extends InterceptorManager<BaseQuery> {
  #props: QueryInterceptorProps;

  constructor({ cache, strategies }: Partial<QueryInterceptorProps> = {}) {
    super();

    this.#props = {
      cache: cache || new CacheManager(),
      strategies: {
        bulkhead: {
          strategy: strategies?.bulkhead?.strategy ?? new BulkheadStrategy(),
          enabled: strategies?.bulkhead?.enabled ?? true,
        },
      },
    };
    this.#setup();

    this.use = this.use.bind(this);
    this.tap = this.tap.bind(this);
    this.execute = this.execute.bind(this);
  }

  #setup() {
    this.#setupCacheInterceptor();
    this.#setupFallbackInterceptor();
    this.#setupRetryInterceptor();
    this.#setupTimeoutInterceptor();

    if (this.#props.strategies.bulkhead.enabled) {
      this.#setupBulkheadInterceptor();
    }

    this.#setupThrottleInterceptor();
  }

  #setupCacheInterceptor() {
    this.tap(
      (query) => Boolean(query.options?.cache),
      async (query, next) => {
        const strategy = new CacheStrategy(this.#props.cache, {
          ...query.options?.cache,
          serialize: (request) =>
            JSON.stringify({
              name: request.queryName,
              payload: request.payload,
            }),
        });

        return strategy.execute(query, async (request) => next?.(request));
      }
    );
  }

  #setupFallbackInterceptor() {
    this.use(async (query, next) => {
      if (query?.options?.fallback) {
        const strategy = new FallbackStrategy({
          fallback: query.options.fallback,
        });

        return strategy.execute(query, async (request) => next?.(request));
      }

      return next?.(query);
    });
  }

  #setupRetryInterceptor() {
    this.tap(
      (query) => Boolean(query.options?.retry),
      async (query, next) => {
        const strategy = new RetryStrategy(query.options?.retry);

        return strategy.execute(query, async (request) => next?.(request));
      }
    );
  }

  #setupTimeoutInterceptor() {
    this.tap(
      (query) => Boolean(query.options?.timeout),
      async (query, next) => {
        const strategy = new TimeoutStrategy({
          timeout: query.options?.timeout,
        });

        return strategy.execute(query, async (request) => next?.(request));
      }
    );
  }

  #setupBulkheadInterceptor() {
    this.tap(
      (query) => Boolean(query.options?.bulkhead),
      async (query, next) => {
        return this.#props.strategies.bulkhead.strategy?.execute(
          query,
          async (request) => next?.(request)
        );
      }
    );
  }

  #setupThrottleInterceptor() {
    this.tap(
      (query) => Boolean(query.options?.throttle),
      async (query, next) => {
        const strategy = new ThrottleStrategy(this.#props.cache.inMemoryCache, {
          ...query.options?.throttle,
          serialize: (request) =>
            JSON.stringify({
              name: request.queryName,
              payload: request.payload,
            }),
        });

        return strategy.execute(query, async (request) => next?.(request));
      }
    );
  }
}
