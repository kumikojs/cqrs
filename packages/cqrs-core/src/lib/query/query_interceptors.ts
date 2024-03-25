import { Cache } from '../internal/cache/cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { QueryContract } from './contracts';
import type { CombinedPartialOptions } from '../types';

export class QueryInterceptors<
  TQuery extends QueryContract<
    string,
    unknown,
    CombinedPartialOptions<QueryContract, KnownQueries>
  >,
  KnownQueries extends Record<string, QueryContract>
> {
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TQuery>;
  #cache: Cache;

  constructor(cache: Cache) {
    this.#cache = cache;
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TQuery>(cache, {
        serialize: (request) =>
          JSON.stringify({
            queryName: request.queryName,
            payload: request.payload,
          }),
      });
  }

  buildInterceptors(): InterceptorManagerContract<TQuery> {
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
