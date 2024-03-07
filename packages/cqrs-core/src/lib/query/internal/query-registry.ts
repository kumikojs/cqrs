/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VoidFunction } from '../../internal/types';
import type { QueryContract } from '../query';
import type { QueryHandlerContract } from '../query-handler';

export interface QueryRegistryContract {
  register<TQuery extends QueryContract>(
    queryName: TQuery['queryName'],
    handler: QueryHandlerContract<TQuery>
  ): VoidFunction;

  resolve<TQuery extends QueryContract, TResponse>(
    queryName: TQuery['queryName']
  ): QueryHandlerContract<TQuery, TResponse>;

  clear(): void;
}

export class QueryAlreadyRegisteredException extends Error {
  constructor(queryName: string) {
    super(`Query handler for "${queryName}" is already registered`);
  }
}

export class QueryNotRegisteredException extends Error {
  constructor(queryName: string) {
    super(`Query handler for "${queryName}" is not registered`);
  }
}

export class QueryRegistry implements QueryRegistryContract {
  #handlers: Map<
    QueryContract['queryName'],
    QueryHandlerContract<QueryContract, any>
  >;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TQuery extends QueryContract>(
    queryName: TQuery['queryName'],
    handler: QueryHandlerContract<TQuery>
  ): VoidFunction {
    if (this.#handlers.has(queryName)) {
      throw new QueryAlreadyRegisteredException(queryName);
    }

    this.#handlers.set(queryName, handler);

    return () => this.#handlers.delete(queryName);
  }

  public resolve<TQuery extends QueryContract, TResponse>(
    queryName: TQuery['queryName']
  ): QueryHandlerContract<TQuery, TResponse> {
    const handler = this.#handlers.get(queryName);
    if (!handler) {
      throw new QueryNotRegisteredException(queryName);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
