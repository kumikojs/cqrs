/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientContract } from '../client';
import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { QueryContract, QueryHandlerContract } from './contracts';

/**
 * The query subject.
 *
 * The query subject is a class that represents a query.
 * It is used to execute a query and subscribe to its state changes.
 *
 * @template TResult The query result type.
 */
export class QuerySubject<TResult> {
  /**
   * The operation instance used to execute the query.
   * It's responsible for managing the query execution and state changes.
   */
  #operation: Operation<TResult>;

  /**
   * The last operation executed.
   * This is used to re-execute the query when the cache is invalidated.
   */
  #lastOperation: {
    query: QueryContract;
    handlerFn: QueryHandlerContract<any, TResult>['execute'];
  } | null = null;

  /**
   * The client instance.
   * It's used to interact with the cache.
   */
  #client: ClientContract;

  /**
   * The query name.
   * It's used to subscribe to cache invalidation events.
   */
  #queryName: string;

  constructor(queryName: string, client: ClientContract) {
    this.#operation = new Operation<TResult>();
    this.#client = client;
    this.#queryName = queryName;
  }

  async execute<TRequest extends QueryContract>(
    query: TRequest,
    handlerFn: QueryHandlerContract<TRequest, TResult>['execute']
  ): Promise<TResult> {
    this.#lastOperation = { query, handlerFn };

    return this.#operation.execute<TRequest, TResult>(query, handlerFn);
  }

  subscribe(onStateChange: VoidFunction) {
    const subscriptions = [
      this.#operation.subscribe(onStateChange),
      this.#client.cache.onInvalidate(this.#queryName, () => {
        if (this.#lastOperation) {
          this.execute(
            {
              ...this.#lastOperation.query,
              options: {
                ...this.#lastOperation.query.options,
                cache: {
                  invalidate: true,
                  ...this.#lastOperation.query.options?.cache,
                },
              },
            },
            this.#lastOperation.handlerFn
          );
        }
      }),
    ];
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }

  get state() {
    return this.#operation.state;
  }
}
