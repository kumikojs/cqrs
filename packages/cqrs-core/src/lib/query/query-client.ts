import { CacheManager } from '../internal/cache/cache-manager';
import { BulkheadStrategy } from '../strategy/bulkhead-strategy';
import { ThrottleStrategy } from '../strategy/throttle-strategy';
import { QueryBus, type QueryBusContract } from './query-bus';

const timeoutStrategy = () => import('../strategy/timeout-strategy');
const retryStrategy = () => import('../strategy/retry-strategy');
const fallbackStrategy = () => import('../strategy/fallback-strategy');
const cacheStrategy = () => import('../strategy/cache-strategy');

export class QueryClient {
  #queryBus: QueryBusContract;
  #bulkheadStrategy: BulkheadStrategy;
  #cacheManager: CacheManager;

  constructor({
    queryBus = new QueryBus(),
    cacheManager = new CacheManager(),
    bulkheadStrategy = new BulkheadStrategy(),
  } = {}) {
    this.#queryBus = queryBus;
    this.#cacheManager = cacheManager;
    this.#bulkheadStrategy = bulkheadStrategy;

    this.#bootstrap();
  }

  get queryBus() {
    return this.#queryBus;
  }

  #bootstrap() {
    this.#queryBus.interceptors
      .select((query) => Boolean(query.options?.cache))
      .apply(async (query, next) => {
        const module = await cacheStrategy();
        const strategy = new module.CacheStrategy(this.#cacheManager, {
          ...query.options?.cache,
          serialize: (request) =>
            JSON.stringify({
              name: request.queryName,
              payload: request.payload,
            }),
        });

        return strategy.execute(query, async (request) => next?.(request));
      });

    this.#queryBus.interceptors.apply(async (query, next) => {
      if (query?.options?.fallback) {
        const module = await fallbackStrategy();
        const strategy = new module.FallbackStrategy({
          fallback: query.options.fallback,
        });

        return strategy.execute(query, async (request) => next?.(request));
      }

      return next?.(query);
    });

    this.#queryBus.interceptors
      .select((query) => Boolean(query.options?.retry))
      .apply(async (query, next) => {
        const module = await retryStrategy();
        const strategy = new module.RetryStrategy(query.options?.retry);

        return strategy.execute(query, async (request) => next?.(request));
      });

    this.#queryBus.interceptors
      .select((query) => Boolean(query.options?.timeout))
      .apply(async (query, next) => {
        const module = await timeoutStrategy();
        const strategy = new module.TimeoutStrategy({
          timeout: query.options?.timeout,
        });

        return strategy.execute(query, async (request) => next?.(request));
      });

    this.#queryBus.interceptors
      .select((query) => Boolean(query.options?.bulkhead))
      .apply(async (query, next) => {
        return this.#bulkheadStrategy.execute(query, async (request) =>
          next?.(request)
        );
      });

    this.#queryBus.interceptors
      .select((query) => Boolean(query.options?.throttle))
      .apply(async (query, next) => {
        const strategy = new ThrottleStrategy(
          this.#cacheManager.inMemoryCache,
          {
            ...query.options?.throttle,
            serialize: (request) =>
              JSON.stringify({
                name: request.queryName,
                payload: request.payload,
              }),
          }
        );

        return strategy.execute(query, async (request) => next?.(request));
      });
  }
}
