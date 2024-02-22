import { OperationLifecycle } from '../internal/operation/operation-lifecycle';
import type { VoidFunction } from '../internal/types';
import type { QueryContract } from './query';
import type { QueryHandlerFn } from './query-handler';

export class QuerySubject<TResult> {
  #operationLifecycle = new OperationLifecycle<TResult>();

  async execute<TRequest extends QueryContract>(
    query: TRequest,
    handlerFn: QueryHandlerFn
  ): Promise<TResult> {
    return this.#operationLifecycle.execute<TRequest, TResult>(
      query,
      handlerFn
    );
  }

  subscribe(onStateChange: VoidFunction) {
    return this.#operationLifecycle.subscribe(onStateChange);
  }

  get state() {
    return this.#operationLifecycle.state;
  }
}
