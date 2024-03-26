/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientContract } from '../client';
import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { QueryContract, QueryHandlerContract } from './contracts';

export class QuerySubject<TResult> {
  #operation: Operation<TResult>;
  #lastOperation: {
    query: QueryContract;
    handlerFn: QueryHandlerContract<any, TResult>['execute'];
  } | null = null;
  #client: ClientContract;
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
