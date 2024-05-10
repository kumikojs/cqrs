import {
  ResilienceBuilderOptions,
  ResilienceInterceptorsBuilder,
} from '../resilience/resilience_interceptors_builder';
import { QueryCache } from './query_cache';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor_contracts';
import type { CombinedPartialOptions } from '../types';
import type { QueryContract } from './query_contracts';
import { StoikLogger } from '../logger/stoik_logger';

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

  #logger: StoikLogger;

  /**
   * Creates a new instance of `QueryInterceptors`.
   *
   * @param cache - The cache instance to be used by caching interceptors.
   */
  constructor(
    cache: QueryCache,
    logger: StoikLogger,
    options: ResilienceBuilderOptions
  ) {
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TQuery>(cache, logger, {
        ...options,
        serialize: cache.getCacheKey,
      });

    this.#logger = logger.child({});
  }

  /**
   * Constructs the interceptor chain specifically tailored for query handling.
   *
   * @returns {InterceptorManagerContract<TQuery>} The assembled interceptor chain.
   */
  buildInterceptors(): InterceptorManagerContract<TQuery> {
    this.#logger.info('Building query interceptors');

    const interceptorManager = this.#resilienceInterceptorsBuilder
      .addDeduplicationInterceptor()
      .addCacheInterceptor()
      .addFallbackInterceptor()
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .build();

    return interceptorManager;
  }
}
