import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { CacheManager } from '../internal/cache/cache-manager';
import { QueryInterceptors } from './interceptors';

import type { BusDriver } from '../bus/bus_driver';
import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import type { QueryBusContract, QueryHandlerContract } from './contracts';
import type { QueryHandlerFn } from './types';

/**
 * The QueryBus is a simple event bus that allows you to register query handlers
 * and execute them.
 */
export class QueryBus<KnownQueries extends Record<string, QueryContract>>
  implements QueryBusContract<KnownQueries>
{
  #driver: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: 1,
  });

  /**
   * The interceptor manager
   * Which is used to apply interceptors to the query execution
   */
  #interceptorManager: InterceptorManagerContract<
    QueryContract<
      string,
      unknown,
      CombinedPartialOptions<QueryContract, KnownQueries>
    >
  >;

  constructor(cacheManager: CacheManager) {
    this.#interceptorManager = new QueryInterceptors<
      QueryContract<
        string,
        unknown,
        CombinedPartialOptions<QueryContract, KnownQueries>
      >,
      KnownQueries
    >(cacheManager).buildInterceptors();

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
  }

  get bus() {
    return this.#driver;
  }

  get interceptors() {
    return this.#interceptorManager;
  }

  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction {
    if (typeof handler === 'function') {
      this.#driver.subscribe(queryName, handler);
    } else {
      this.#driver.subscribe(queryName, handler.execute);
    }

    return () => this.unregister(queryName, handler);
  }

  unregister<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ) {
    if (typeof handler === 'function') {
      this.#driver.unsubscribe(queryName, handler);
    } else {
      this.#driver.unsubscribe(queryName, handler.execute);
    }
  }

  async execute<
    TQuery extends KnownQueries[keyof KnownQueries],
    TResponse = void
  >(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse> {
    return this.#interceptorManager.execute<TQuery, TResponse>(
      query,
      handler
        ? handler
        : (query) => this.#driver.publish(query['queryName'], query)
    );
  }
}
