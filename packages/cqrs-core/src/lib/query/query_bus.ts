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

  /**
   * The interceptor manager responsible for managing cross-cutting concerns for queries.
   *
   * @see InterceptorManagerContract - {@link InterceptorManagerContract}
   */
  get interceptors() {
    return this.#interceptorManager;
  }

  /**
   * Registers a query handler to the query bus.
   *
   * @template TQuery - The type of query the handler handles.
   * @param queryName - The name of the query the handler is associated with.
   * @param handler - The query handler to register.
   * @returns An unregistration function to remove the handler from the bus.
   */
  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.subscribe(queryName, handlerFn);

    return () => this.unregister(queryName, handler);
  }

  /**
   * Unregisters a query handler from the query bus.
   *
   * @template TQuery - The type of query the handler handles.
   * @param queryName - The name of the query the handler is associated with.
   * @param handler - The query handler to unregister.
   */
  unregister<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ) {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(queryName, handlerFn);
  }

  /**
   * Executes a query using the query bus's interceptor pipeline.
   *
   * @template TQuery - The inferred type of the query to execute.
   * @template TResponse - The expected response type from the query execution.
   * @param query - The query to execute.
   * @param handler - An optional custom handler for executing the query, overriding registered handlers.
   * @returns A promise resolving to the result of the query execution.
   */
  async execute<
    TQuery extends KnownQueries[keyof KnownQueries],
    TResponse = void
  >(
    query: TQuery,
    handler: QueryHandlerContract<QueryContract, TResponse>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute<TQuery, TResponse>(query, handler);
  }

  /**
   * Dispatches a query using the query bus's interceptor pipeline.
   *
   * @template TQuery - The inferred type of the query to execute.
   * @template TResponse - The expected response type from the query execution.
   * @param query - The query to execute.
   * @returns A promise resolving to the result of the query execution.
   */
  async dispatch<
    TQuery extends KnownQueries[keyof KnownQueries],
    TResponse = void
  >(query: TQuery): Promise<TResponse> {
    return this.#interceptorManager.execute<TQuery, TResponse>(query, (query) =>
      this.#driver.publish(query['queryName'], query)
    );
  }
}
