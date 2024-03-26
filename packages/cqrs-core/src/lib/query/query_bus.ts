import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';
import { Cache } from '../internal/cache/cache';
import { QueryInterceptors } from './query_interceptors';

import type { BusDriver } from '../internal/bus/bus_driver';
import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CombinedPartialOptions } from '../types';
import type {
  QueryBusContract,
  QueryContract,
  QueryHandlerContract,
} from './contracts';

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

  constructor(cache: Cache) {
    this.#interceptorManager = new QueryInterceptors<
      QueryContract<
        string,
        unknown,
        CombinedPartialOptions<QueryContract, KnownQueries>
      >,
      KnownQueries
    >(cache).buildInterceptors();

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
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
    handler: QueryHandlerContract<QueryContract, TResponse>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute<TQuery, TResponse>(query, handler);
  }

  async dispatch<
    TQuery extends KnownQueries[keyof KnownQueries],
    TResponse = void
  >(query: TQuery): Promise<TResponse> {
    return this.#interceptorManager.execute<TQuery, TResponse>(query, (query) =>
      this.#driver.publish(query['queryName'], query)
    );
  }
}
