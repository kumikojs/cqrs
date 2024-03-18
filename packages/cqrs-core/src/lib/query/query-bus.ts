import {
  QueryRegistry,
  type QueryRegistryContract,
} from './internal/query-registry';
import type { QueryContract } from './query';
import type { QueryHandlerContract } from './query-handler';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export {
  QueryAlreadyRegisteredException,
  QueryNotRegisteredException,
} from './internal/query-registry';

export interface QueryBusContract<
  BaseQuery extends QueryContract = QueryContract
> {
  register<TQuery extends BaseQuery>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction;

  execute<TQuery extends BaseQuery, TResponse = unknown>(
    query: TQuery
  ): Promise<TResponse>;
}

export class QueryBus<BaseQuery extends QueryContract>
  implements QueryBusContract<BaseQuery>
{
  #queryRegistry: QueryRegistryContract;

  constructor() {
    this.#queryRegistry = new QueryRegistry();

    this.register = this.register.bind(this);
    this.execute = this.execute.bind(this);
  }

  register<TQuery extends BaseQuery>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction {
    if (typeof handler === 'function') {
      handler = {
        execute: handler,
      };
    }

    return this.#queryRegistry.register(queryName, handler);
  }

  async execute<TQuery extends BaseQuery, TResponse = unknown>(
    query: TQuery
  ): Promise<TResponse> {
    return this.#queryRegistry
      .resolve<TQuery, TResponse>(query.queryName)
      .execute(query);
  }
}
