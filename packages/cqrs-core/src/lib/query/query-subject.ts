/* eslint-disable @typescript-eslint/no-explicit-any */
import { OperationLifecycle } from '../internal/operation/operation-lifecycle';

import type { VoidFunction } from '../internal/types';
import type { QueryContract } from './query';
import type { QueryHandlerFn } from './query-handler';

export class QuerySubject<TResult> {
  #operationLifecycle: OperationLifecycle<TResult>;
  #lastOperation: {
    query: QueryContract;
    handlerFn: QueryHandlerFn<any, TResult>;
  } | null = null;

  constructor() {
    this.#operationLifecycle = new OperationLifecycle<TResult>();

    this.#operationLifecycle.subscribe(() => {
      if (this.#operationLifecycle.state.isInvalidated && this.#lastOperation) {
        this.execute(
          {
            ...this.#lastOperation.query,
            options: {
              ...this.#lastOperation.query.options,
              cache: {
                invalidate: true,
                ...this.#lastOperation.query.options?.cache,
              },
            } as any,
          },
          this.#lastOperation.handlerFn
        );
      }
    });
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
    return this.#operationLifecycle.subscribe(onStateChange);
  }

  invalidate() {
    this.#operationLifecycle.invalidate();
  }

  get state() {
    return this.#operationLifecycle.state;
  }
}
