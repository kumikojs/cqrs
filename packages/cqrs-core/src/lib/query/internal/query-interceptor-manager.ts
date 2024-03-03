import { CacheManager } from '../../internal/cache/cache-manager';
import { InterceptorManager } from '../../internal/interceptor/interceptor-manager';
import { CacheStrategy } from '../../strategy/cache-strategy';
import { FallbackStrategy } from '../../strategy/fallback-strategy';
import { RetryStrategy } from '../../strategy/retry-strategy';
import { ThrottleStrategy } from '../../strategy/throttle-strategy';
import { TimeoutStrategy } from '../../strategy/timeout-strategy';

import type { CacheOptions } from '../../strategy/cache-strategy';
import type { RetryOptions } from '../../strategy/retry-strategy';
import type { ThrottleOptions } from '../../strategy/throttle-strategy';
import type { TimeoutOptions } from '../../strategy/timeout-strategy';
import type { QueryContract } from '../query';

type QueryInterceptorProps = Readonly<{
  cache: CacheManager;
  strategies?: {
    cache?: {
      enabled?: boolean;
      options?: CacheOptions;
    };
    fallback?: {
      enabled?: boolean;
    };
    retry?: {
      enabled?: boolean;
      options?: RetryOptions;
    };
    timeout?: {
      enabled?: boolean;
      options?: TimeoutOptions;
    };
    throttle?: {
      enabled?: boolean;
      options?: ThrottleOptions;
    };
  };
}>;

export class QueryInterceptorManager<
  BaseQuery extends QueryContract
> extends InterceptorManager<BaseQuery> {
  #props: QueryInterceptorProps;

  constructor({ cache, strategies }: Partial<QueryInterceptorProps> = {}) {
    super();

    this.#props = {
      cache: cache || new CacheManager(),
      strategies: {
        cache: {
          enabled: strategies?.cache?.enabled ?? true,
          options: strategies?.cache?.options,
        },
        fallback: {
          enabled: strategies?.fallback?.enabled ?? true,
        },
        retry: {
          enabled: strategies?.retry?.enabled ?? true,
          options: strategies?.retry?.options,
        },
        timeout: {
          enabled: strategies?.timeout?.enabled ?? true,
          options: strategies?.timeout?.options,
        },
        throttle: {
          enabled: strategies?.throttle?.enabled ?? true,
          options: strategies?.throttle?.options,
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
