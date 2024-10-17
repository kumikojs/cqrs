import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';
import { QueryCache } from './query_cache';
import { QueryKeyResolver } from './query_key_resolver';

import type { MergedPartialOptions } from '../../types/core/options/options';
import type {
  ResilienceBuilderOptions,
  ResilienceOptions,
} from '../../types/core/options/resilience_options';
import type { QueryInput } from '../../types/core/query';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';

/**
 * The `QueryInterceptors` class constructs a chain of interceptors specifically designed for handling queries.
 *
 * It applies interceptors like caching, deduplication, fallbacks, retries, timeouts, and throttling to queries for resilience and optimization.
 *
 * @template TQuery - The type of query the interceptors handle (derived from `Query`).
 * @template KnownQueries - A record of known query types for type inference.
 */
export class QueryInterceptors<
  TQuery extends QueryInput<
    string,
    unknown,
    MergedPartialOptions<QueryInput, KnownQueries> & ResilienceOptions
  >,
  KnownQueries extends Record<string, QueryInput>
> {
  /**
   * @private
   * The builder for resilience interceptors, used to construct the query interceptor pipeline.
   */
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TQuery>;

  #logger: KumikoLogger;

  /**
   * Creates a new instance of `QueryInterceptors`.
   *
   * @param cache - The cache instance to be used by caching interceptors.
   */
  constructor(
    cache: QueryCache,
    logger: KumikoLogger,
    options: ResilienceBuilderOptions
  ) {
    const keyResolver = new QueryKeyResolver();
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TQuery>(cache, logger, {
        ...options,
        serialize: keyResolver.generateKey.bind(keyResolver),
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
      .addDefaultHandlerInterceptor()
      .build();

    return interceptorManager;
  }
}
