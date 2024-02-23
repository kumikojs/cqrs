import type { TaskManagerContract } from '../internal/task/task-manager';
import {
  QueryInterceptorManager,
  type QueryInterceptorManagerContract,
} from './internal/query-interceptor-manager';
import {
  QueryRegistry,
  type QueryRegistryContract,
} from './internal/query-registry';
import { QueryTaskManager } from './internal/query-task-manager';
import type { QueryContract } from './query';
import type { QueryHandlerContract, QueryHandlerFn } from './query-handler';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export {
  QueryAlreadyRegisteredException,
  QueryNotFoundException,
} from './internal/query-registry';

type BindToSyntax<TQuery extends QueryContract> = {
  to: (
    handler: QueryHandlerContract<TQuery> | QueryHandlerFn<TQuery>
  ) => VoidFunction;
};

export interface QueryBusContract<
  BaseQuery extends QueryContract = QueryContract
> {
  bind<TQuery extends BaseQuery>(
    queryName: TQuery['queryName']
  ): BindToSyntax<TQuery>;

  execute<TQuery extends BaseQuery, TResponse = unknown>(
    query: TQuery
  ): Promise<TResponse>;

  interceptors: Pick<QueryInterceptorManagerContract, 'apply' | 'select'>;
}

export class QueryBus implements QueryBusContract {
  #queryRegistry: QueryRegistryContract;
  #queryInterceptorManager: QueryInterceptorManagerContract;
  #taskManager: TaskManagerContract<
    QueryContract,
    QueryHandlerContract['execute']
  >;

  constructor({
    registry = new QueryRegistry(),
    interceptorManager = new QueryInterceptorManager(),
    taskManager = new QueryTaskManager(),
  }: {
    registry?: QueryRegistryContract;
    interceptorManager?: QueryInterceptorManagerContract;
    taskManager?: TaskManagerContract<
      QueryContract,
      QueryHandlerContract['execute']
    >;
  } = {}) {
    this.#queryRegistry = registry;
    this.#queryInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;
  }

  bind<TQuery extends QueryContract>(
    queryName: TQuery['queryName']
  ): BindToSyntax<TQuery> {
    return {
      to: (handler: QueryHandlerContract<TQuery> | QueryHandlerFn<TQuery>) => {
        if (typeof handler === 'function') {
          handler = {
            execute: handler,
          };
        }

        return this.#queryRegistry.register(queryName, handler);
      },
    };
  }

  async execute<TQuery extends QueryContract, TResponse = unknown>(
    query: TQuery
  ): Promise<TResponse> {
    const handler = this.#queryRegistry.resolve(query.queryName);

    if (!query.context?.abortController) {
      query.context = {
        ...query.context,
        abortController: new AbortController(),
      };
    }

    return this.#taskManager.execute(query, () =>
      this.#queryInterceptorManager.execute(query, handler.execute)
    );
  }

  get interceptors(): Pick<
    QueryInterceptorManagerContract,
    'apply' | 'select'
  > {
    return this.#queryInterceptorManager;
  }
}
