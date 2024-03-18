import { QueryInterceptorManager } from './internal/query-interceptor-manager';
import { QueryTaskManager } from './internal/query-task-manager';
import { QueryBus } from './query-bus';
import { QueryStore } from './query-store';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { QueryContract } from './query';
import type { QueryBusContract } from './query-bus';
import type { QueryHandlerContract, QueryHandlerFn } from './query-handler';
import type { EventBusContract } from '../event/event-bus';
import type { InvalidatedQueries } from '../internal/events/invalidated-queries';
import type { QueryStoreContract } from './query-store';

export interface QueryClientContract<
  KnownQueries extends Record<string, QueryContract>
> {
  interceptors: InterceptorManagerContract<KnownQueries>;
  manager: QueryStoreContract;
  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction;
  execute<TQuery extends KnownQueries[keyof KnownQueries], TResponse>(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse>;
}

type ExtractedOptions<T extends QueryContract> = T extends {
  options?: infer O;
}
  ? O
  : never;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type CombinedPartialOptions<
  KnownQueries extends Record<string, QueryContract>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownQueries[keyof KnownQueries]>>
>;

export class QueryClient<KnownQueries extends Record<string, QueryContract>> {
  #eventBus: EventBusContract;
  #store: QueryStoreContract;
  #queryBus: QueryBusContract;
  #queryInterceptorManager: QueryInterceptorManager<
    QueryContract<string, unknown, CombinedPartialOptions<KnownQueries>>
  >;
  #taskManager: TaskManagerContract<
    QueryContract,
    QueryHandlerContract['execute']
  >;

  constructor({
    eventBus,
    queryBus = new QueryBus(),
    taskManager = new QueryTaskManager(),
    interceptorManager = new QueryInterceptorManager(),
  }: {
    eventBus: EventBusContract;
    queryBus?: QueryBusContract;
    taskManager?: TaskManagerContract<
      QueryContract,
      QueryHandlerContract['execute']
    >;
    interceptorManager?: QueryInterceptorManager<
      QueryContract<string, unknown, CombinedPartialOptions<KnownQueries>>
    >;
  }) {
    this.#eventBus = eventBus;
    this.#queryBus = queryBus;
    this.#queryInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;
    this.#store = new QueryStore();

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);

    this.#eventBus.on<InvalidatedQueries>(
      'invalidated-queries',
      async (event) => {
        if (!event.payload) return;

        this.#store.invalidate(event.payload.queries);
      }
    );
  }

  get interceptors() {
    return this.#queryInterceptorManager;
  }

  get manager() {
    return this.#store;
  }

  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction {
    return this.#queryBus.register(queryName, handler);
  }

  execute<TQuery extends KnownQueries[keyof KnownQueries], TResponse>(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse> {
    // TODO use this signal inside strategies
    if (!query.context?.signal) {
      query.context = {
        ...query.context,
        signal: new AbortController().signal,
      };
    }

    return this.#taskManager.execute(query, () =>
      this.#queryInterceptorManager.execute<TQuery, TResponse>(
        query,
        handler ? handler : this.#queryBus.execute
      )
    );
  }
}
