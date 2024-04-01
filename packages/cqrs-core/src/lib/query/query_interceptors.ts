import { Cache } from '../internal/cache/cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor_contracts';
import type { QueryContract } from './query_contracts';
import type { CombinedPartialOptions } from '../types';

/**
 * The `QueryInterceptors` class constructs a chain of interceptors specifically designed for handling queries.
 *
 * It applies interceptors like caching, deduplication, fallbacks, retries, timeouts, and throttling to queries for resilience and optimization.
 *
 * @template TQuery - The type of query the interceptors handle (derived from `QueryContract`).
 * @template KnownQueries - A record of known query types for type inference.
 */
export class QueryInterceptors<
  TQuery extends QueryContract<
    string,
    unknown,
    CombinedPartialOptions<QueryContract, KnownQueries>
  >,
  KnownQueries extends Record<string, QueryContract>
> {
  /**
   * @private
   * The builder for resilience interceptors, used to construct the query interceptor pipeline.
   */
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TQuery>;

  /**
   * Creates a new instance of `QueryInterceptors`.
   *
   * @param cache - The cache instance to be used by caching interceptors.
   */
  constructor(cache: Cache) {
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TQuery>(cache, {
        serialize: (request) =>
          JSON.stringify({
            queryName: request.queryName,
            payload: request.payload,
          }),
      });
  }

  /**
   * Constructs the interceptor chain specifically tailored for query handling.
   *
   * @returns {InterceptorManagerContract<TQuery>} The assembled interceptor chain.
   */
  buildInterceptors(): InterceptorManagerContract<TQuery> {
    const interceptorManager = this.#resilienceInterceptorsBuilder
      .addDeduplicationInterceptor()
      .addCacheInterceptor((query: QueryContract) => ({
        ns: query.queryName,
        key: JSON.stringify({
          queryName: query.queryName,
          payload: query.payload,
        }),
      }))
      .addFallbackInterceptor()
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .build();

    return interceptorManager;
  }
}
