/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientContract } from '../client';
import { OperationLifecycle } from '../internal/operation/operation-lifecycle';

import type { VoidFunction } from '../internal/types';
import type { QueryContract } from './contracts';
import type { QueryHandlerFn } from './types';

export class QuerySubject<TResult> {
  #operationLifecycle: OperationLifecycle<TResult>;
  #lastOperation: {
    query: QueryContract;
    handlerFn: QueryHandlerFn<any, TResult>;
  } | null = null;
  #client: ClientContract;
  #queryName: string;

  constructor(queryName: string, client: ClientContract) {
    this.#operationLifecycle = new OperationLifecycle<TResult>();
    this.#client = client;
    this.#queryName = queryName;
  }

  async execute<TRequest extends QueryContract>(
    query: TRequest,
    handlerFn: QueryHandlerFn<TRequest, TResult>
  ): Promise<TResult> {
    this.#lastOperation = { query, handlerFn };

    return this.#operationLifecycle.execute<TRequest, TResult>(
      query,
      handlerFn
    );
  }

  subscribe(onStateChange: VoidFunction) {
    const subscriptions = [
      this.#operationLifecycle.subscribe(onStateChange),
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
    return this.#operationLifecycle.state;
  }
}
