import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { AbortManager } from '../../infrastructure/middleware/abort_manager';
import { StoikLogger } from '../../utilities/logger/stoik_logger';
import { QueryCache } from './query_cache';
import { QueryInterceptors } from './query_interceptors';

import type { MergedPartialOptions } from '../../types/core/options/options';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import type {
  ExtractQueryDefinitions,
  ExtractQueryRequest,
  ExtractQueryResponse,
  InferredQueryHandler,
  Query,
  QueryHandlerFunction,
  QueryRegistry,
} from '../../types/core/query';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';
import type { BusDriver } from '../../types/infrastructure/bus';

/**
 * The `QueryBus` class acts as a central coordinator for managing query execution and facilitates cross-cutting concerns through interceptors.
 *
 * @remarks
 * - It provides mechanisms to register and execute queries.
 * - It applies interceptors to handle concerns like caching, logging, and authorization.
 * - It leverages a driver for managing query subscriptions and publishing.
 *
 * @template KnownQueries - A record type representing known query types for type inference.
 *                         Keys are query names (strings), and values are the corresponding {@link QueryContract} types.
 * @example
 * ```typescript
 * import { type QueryContract, QueryBus } from '@stoik/cqrs-core';
 *
 * type User = { id: number; name: string; };
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 * type GetUsersQuery = QueryContract<'users.get', never>;
 *
 * type KnownQueries = {
 *  'user.get': GetUserQuery;
 *  'users.get': GetUsersQuery;
 * };
 *
 * const bus = new QueryBus<KnownQueries>();
 *
 * // Register a handler for the 'user.get' query
 * bus.register<GetUserQuery>('user.get', async (query) => {
 *   return { id: query.payload.id, name: 'John Doe' };
 * });
 *
 * // Dispatch the query and retrieve the result
 * const user = await bus.dispatch<GetUserQuery, User>({ queryName: 'user.get', payload: { id: 1 } });
 * console.log(user); // Output: { id: 1, name: 'John Doe' }
 * ```
 */
export class QueryBus<
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownQueryDefinitions extends Record<
    string,
    Query
  > = ExtractQueryDefinitions<KnownQueries>
> {
  /**
   * @private
   * The underlying bus driver managing subscriptions and publishing of queries.
   */
  #driver: BusDriver<string>;

  /**
   * @private
   * The interceptor manager responsible for applying interceptors to query execution.
   */
  #interceptorManager: InterceptorManagerContract<
    Query<string, unknown, MergedPartialOptions<Query, KnownQueryDefinitions>>
  >;

  /**
   * @private
   * The abort manager responsible for managing ongoing requests and their cancellation.
   */
  #abortManager = new AbortManager();

  #logger: StoikLogger;

  /**
   * Constructs a QueryBus instance.
   *
   * @param cache - The cache instance to be used for data storage and retrieval.
   */
  constructor(
    cache: QueryCache,
    logger: StoikLogger,
    options: ResilienceBuilderOptions
  ) {
    this.#logger = logger.child({
      topics: ['query'],
    });

    this.#interceptorManager = new QueryInterceptors<
      Query<
        string,
        unknown,
        MergedPartialOptions<Query, KnownQueryDefinitions>
      >,
      KnownQueryDefinitions
    >(cache, this.#logger, { ...options }).buildInterceptors();

    this.#driver = new MemoryBusDriver({
      maxHandlersPerChannel: 1,
      logger: this.#logger,
    });

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  /**
   * The interceptor manager responsible for managing cross-cutting concerns for queries.
   * Refer to the {@link InterceptorManagerContract} interface for details.
   */
  get interceptors() {
    return this.#interceptorManager;
  }

  /**
   * Registers a query handler to the query bus.
   *
   * @template TQuery - The type of query the handler handles, inferred from the `KnownQueries` record.
   * @param queryName - The name of the query the handler is associated with.
   * @param handler - The query handler to register.
   *                   It can be a function implementing the {@link QueryHandlerContract} interface
   *                   or the `execute` method of the interface.
   * @returns An unregistration function to remove the handler from the bus.
   */
  register<
    TQueryName extends string = KnownQueries[keyof KnownQueries]['query']['queryName']
  >(
    queryName: TQueryName,
    handler: InferredQueryHandler<TQueryName, KnownQueries>
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.subscribe(queryName, handlerFn);

    return () => this.unregister(queryName, handler);
  }

  /**
   * Unregisters a query handler from the query bus.
   *
   * @template TQuery - The type of query the handler handles, inferred from the `KnownQueries` record.
   * @param queryName - The name of the query the handler is associated with.
   * @param handler - The query handler to unregister.
   *                   It can be a function implementing the {@link QueryHandlerContract} interface
   *                   or the `execute` method of the interface.
   */
  unregister<
    TQueryName extends string = KnownQueries[keyof KnownQueries]['query']['queryName']
  >(
    queryName: TQueryName,
    handler: InferredQueryHandler<TQueryName, KnownQueries>
  ) {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(queryName, handlerFn);
  }

  /**
   * Executes a query using the query bus's interceptor pipeline.
   *
   * @template TQuery - The inferred type of the query to execute (derived from `KnownQueries`).
   * @template TResponse - The expected response type from the query execution.
   * @param query - The query to execute.
   * @param handler - A custom handler for executing the query, overriding registered handlers.
   *                   This can be a function implementing the {@link QueryHandlerContract} interface's `execute` method.
   * @returns A promise resolving to the result of the query execution.
   */
  async execute<
    TQuery extends Query = KnownQueries[keyof KnownQueries]['query'],
    TResult = ExtractQueryResponse<TQuery['queryName'], KnownQueries>
  >(
    query: TQuery,
    handler: QueryHandlerFunction<
      ExtractQueryRequest<TQuery['queryName'], KnownQueries>,
      ExtractQueryResponse<TQuery['queryName'], KnownQueries>
    >
  ): Promise<TResult> {
    const signal = query.context?.signal;

    return this.#abortManager.execute(
      query.queryName,
      async (abortController) => {
        const useSignal = signal ?? abortController.signal;

        if (signal) {
          /**
           * If the query has already been provided with an abort signal,
           * we listen for the `abort` event to propagate the cancellation.
           */
          signal.addEventListener('abort', () => {
            abortController.abort();
          });
        }

        query.context = { ...query.context, signal: useSignal };

        return this.#interceptorManager.execute(query, handler);
      }
    );
  }

  /**
   * Dispatches a query using the query bus's interceptor pipeline.
   *
   * @template TQuery - The inferred type of the query to execute (derived from `KnownQueries`).
   * @template TResponse - The expected response type from the query execution.
   * @param query - The query to execute.
   * @returns A promise resolving to the result of the query execution.
   */
  async dispatch<
    TQuery extends Query = KnownQueries[keyof KnownQueries]['query'],
    TResult = ExtractQueryResponse<TQuery['queryName'], KnownQueries>
  >(query: TQuery): Promise<TResult> {
    return this.execute<TQuery, TResult>(query, (query) =>
      this.#driver.publish(query.queryName, query)
    );
  }

  /**
   * Cancels an ongoing query execution.
   *
   * @template TQuery - The inferred type of the query to execute (derived from `KnownQueries`).
   * @param queryName - The name of the query to cancel.
   */
  cancelQuery<
    TQuery extends Query = KnownQueryDefinitions[keyof KnownQueryDefinitions]
  >(queryName: TQuery['queryName']) {
    this.#abortManager.cancelRequest(queryName);
  }

  disconnect() {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
    this.#abortManager.disconnect();
  }
}
