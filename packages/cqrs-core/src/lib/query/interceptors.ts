import { CacheManager } from '../internal/cache/cache-manager';
import { ResiliencyInterceptorBuilder } from '../strategy/resilient_interceptor_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
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
  #resiliencyInterceptorBuilder: ResiliencyInterceptorBuilder<TQuery>;

  constructor(cacheManager: CacheManager) {
    this.#resiliencyInterceptorBuilder =
      new ResiliencyInterceptorBuilder<TQuery>(cacheManager, {
        serialize: (request) =>
          JSON.stringify({
            queryName: request.queryName,
            payload: request.payload,
          }),
      });
  }

  buildInterceptors(): InterceptorManagerContract<TQuery> {
    const interceptorManager = this.#resiliencyInterceptorBuilder
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
