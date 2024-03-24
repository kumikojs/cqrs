import { OperationLifecycle } from '../internal/operation/operation-lifecycle';

import type { VoidFunction } from '../internal/types';
import type { CommandContract } from './contracts';
import type { CommandHandlerFn } from './types';

export class CommandSubject<TResult> {
  #operationLifecycle = new OperationLifecycle<TResult>();

  async execute<TRequest extends CommandContract>(
    command: TRequest,
    handlerFn: CommandHandlerFn<TRequest, TResult>
  ): Promise<TResult> {
    return this.#operationLifecycle.execute<TRequest, TResult>(
      command,
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
