import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { AbortManager } from '../../infrastructure/middleware/abort_manager';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from './query_cache';
import { QueryInterceptors } from './query_interceptors';

import type { MergedPartialOptions } from '../../types/core/options/options';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import type {
  ExtractQueryDefinitions,
  ExtractQueryRequest,
  ExtractQueryResponse,
  InferredQueryHandler,
  QueryRequest,
  QueryHandlerFunction,
  QueryRegistry,
  Query,
} from '../../types/core/query';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';
import type { BusDriver } from '../../types/infrastructure/bus';

export class QueryBus<
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownQueryDefinitions extends Record<
    string,
    QueryRequest
  > = ExtractQueryDefinitions<KnownQueries>
> {
  #abortManager = new AbortManager();
  #driver: BusDriver<string>;
  #interceptorManager: InterceptorManagerContract<
    QueryRequest<
      string,
      unknown,
      MergedPartialOptions<QueryRequest, KnownQueryDefinitions>
    >
  >;
  #logger: KumikoLogger;

  constructor(
    cache: QueryCache,
    logger: KumikoLogger,
    options: ResilienceBuilderOptions
  ) {
    this.#logger = logger.child({
      topics: ['query'],
    });

    this.#interceptorManager = new QueryInterceptors<
      QueryRequest<
        string,
        unknown,
        MergedPartialOptions<QueryRequest, KnownQueryDefinitions>
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

  get interceptors() {
    return this.#interceptorManager;
  }

  register<
    TQueryName extends string = KnownQueries[keyof KnownQueries]['req']['queryName']
  >(
    queryName: TQueryName,
    handler: InferredQueryHandler<TQueryName, KnownQueries>
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.subscribe(queryName, handlerFn);

    return () => this.unregister(queryName, handler);
  }

  unregister<
    TQueryName extends string = KnownQueries[keyof KnownQueries]['req']['queryName']
  >(
    queryName: TQueryName,
    handler: InferredQueryHandler<TQueryName, KnownQueries>
  ) {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(queryName, handlerFn);
  }

  /**
   * The overloads order is important to ensure the correct type inference.
   * The 1st overload is defined to handle the case when the query is known and we don't need to specify the request and result type explicitly.
   */
  async execute<
    TQuery extends QueryRequest = KnownQueries[keyof KnownQueries]['req'],
    TResult = ExtractQueryResponse<TQuery['queryName'], KnownQueries>
  >(
    query: TQuery,
    handler: QueryHandlerFunction<TQuery, TResult>
  ): Promise<TResult>;
  async execute<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: TQuery['req'],
    handler: QueryHandlerFunction<TQuery['req'], TQuery['res']>
  ): Promise<TQuery['res']>;
  async execute<TQuery extends Query>(
    query: TQuery['req'],
    handler: QueryHandlerFunction<TQuery['req'], TQuery['res']>
  ): Promise<TQuery['res']> {
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

  async dispatch<
    TQuery extends KnownQueries[keyof KnownQueries]['req'] = KnownQueries[keyof KnownQueries]['req'],
    TResult = ExtractQueryResponse<TQuery['queryName'], KnownQueries>
  >(query: TQuery): Promise<TResult>;
  async dispatch<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: TQuery['req']
  ): Promise<TQuery['res']>;
  async dispatch<TQuery extends Query>(
    query: TQuery['req']
  ): Promise<TQuery['res']> {
    return this.execute(query, (query) =>
      this.#driver.publish(query.queryName, query)
    );
  }

  cancelQuery<
    TQuery extends QueryRequest = KnownQueryDefinitions[keyof KnownQueryDefinitions]
  >(queryName: TQuery['queryName']) {
    this.#abortManager.cancelRequest(queryName);
  }

  disconnect() {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
    this.#abortManager.disconnect();
  }
}
