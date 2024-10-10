import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { AbortManager } from '../../infrastructure/middleware/abort_manager';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from './query_cache';
import { QueryInterceptors } from './query_interceptors';

import type { MergedPartialOptions } from '../../types/core/options/options';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import type {
  ExtractQueryDefinitions,
  Query,
  QueryBusContract,
  QueryProcessorFunction,
  QueryHandler,
  QueryRegistry,
  QueryInput,
} from '../../types/core/query';
import type { BusDriver } from '../../types/infrastructure/bus';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';

export class QueryBus<
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownQueryDefinitions extends Record<
    string,
    QueryInput
  > = ExtractQueryDefinitions<KnownQueries>
> implements QueryBusContract<KnownQueries>
{
  #abortManager = new AbortManager();
  #driver: BusDriver<string>;
  #interceptorManager: InterceptorManagerContract<
    QueryInput<
      string,
      unknown,
      MergedPartialOptions<QueryInput, KnownQueryDefinitions>
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
      QueryInput<
        string,
        unknown,
        MergedPartialOptions<QueryInput, KnownQueryDefinitions>
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

  register<TQuery extends Query>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandler<TQuery>
  ): VoidFunction {
    this.#driver.subscribe(queryName, handler);

    return () => this.unregister(queryName, handler);
  }

  unregister<TQuery extends Query>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandler<TQuery>
  ): void {
    this.#driver.unsubscribe(queryName, handler);
  }

  async execute<TQuery extends Query>(
    query: TQuery['req'],
    handler: QueryProcessorFunction<TQuery>
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

  async dispatch<TQuery extends Query>(
    query: TQuery['req']
  ): Promise<TQuery['res']> {
    return this.execute(query, (query) =>
      this.#driver.publish(query.queryName, query)
    );
  }

  cancelQuery<TQuery extends Query>(
    queryName: TQuery['req']['queryName']
  ): void {
    this.#abortManager.cancelRequest(queryName);
  }

  disconnect() {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
    this.#abortManager.disconnect();
  }
}
