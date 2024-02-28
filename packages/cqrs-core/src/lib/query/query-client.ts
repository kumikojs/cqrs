import { QueryInterceptorManager } from './internal/query-interceptor-manager';
import { QueryTaskManager } from './internal/query-task-manager';
import { QueryBus } from './query-bus';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { QueryContract } from './query';
import type { QueryBusContract } from './query-bus';
import type { QueryHandlerContract, QueryHandlerFn } from './query-handler';

export interface QueryClientContract<
  TOptions = unknown,
  BaseQuery extends QueryContract = QueryContract<string, unknown, TOptions>
> {
  bus: QueryBusContract<BaseQuery>;
  interceptors: InterceptorManagerContract<BaseQuery>;
  execute<TQuery extends BaseQuery, TResponse>(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse>;
}

export class QueryClient<
  TOptions = unknown,
  BaseQuery extends QueryContract = QueryContract<string, unknown, TOptions>
> {
  #queryBus: QueryBusContract<BaseQuery>;
  #queryInterceptorManager: InterceptorManagerContract<BaseQuery>;
  #taskManager: TaskManagerContract<
    QueryContract,
    QueryHandlerContract['execute']
  >;

  constructor({
    queryBus = new QueryBus<BaseQuery>(),
    taskManager = new QueryTaskManager(),
    interceptorManager = new QueryInterceptorManager<BaseQuery>(),
  } = {}) {
    this.#queryBus = queryBus;
    this.#queryInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;

    this.execute = this.execute.bind(this);
  }

  get bus() {
    return this.#queryBus;
  }

  get interceptors() {
    return this.#queryInterceptorManager;
  }

  execute<TQuery extends BaseQuery, TResponse>(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse> {
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
