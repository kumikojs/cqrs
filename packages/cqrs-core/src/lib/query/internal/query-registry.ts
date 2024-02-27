import type { VoidFunction } from '../../internal/types';
import type { QueryContract } from '../query';
import type { QueryHandlerContract } from '../query-handler';

export interface QueryRegistryContract<
  BaseQuery extends QueryContract = QueryContract
> {
  register<TQuery extends BaseQuery>(
    queryName: string,
    handler: QueryHandlerContract<TQuery>
  ): VoidFunction;

  resolve(queryName: string): QueryHandlerContract<BaseQuery>;

  clear(): void;
}

export class QueryAlreadyRegisteredException extends Error {
  constructor(queryName: string) {
    super(`Query handler for "${queryName}" is already registered`);
  }
}

export class QueryNotFoundException extends Error {
  constructor(queryName: string) {
    super(`Query handler for "${queryName}" is not registered`);
  }
}

export class QueryRegistry implements QueryRegistryContract {
  #handlers: Map<QueryContract['queryName'], QueryHandlerContract>;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TQuery extends QueryContract>(
    queryName: QueryContract['queryName'],
    handler: QueryHandlerContract<TQuery>
  ): VoidFunction {
    if (this.#handlers.has(queryName)) {
      throw new Error(`Query handler for "${queryName}" is already registered`);
    }

    this.#handlers.set(queryName, handler);

    return () => this.#handlers.delete(queryName);
  }

  public resolve(queryName: QueryContract['queryName']): QueryHandlerContract {
    const handler = this.#handlers.get(queryName);
    if (!handler) {
      throw new Error(`Query handler for "${queryName}" is not registered`);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
