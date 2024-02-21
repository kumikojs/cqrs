import { OperationLifecycle } from '../internal/operation/operation-lifecycle';
import { VoidFunction } from '../internal/types';
import type { CommandContract } from './command';
import type { CommandHandlerFn } from './command-handler';

export class CommandSubject<TResult> {
  #operationLifecycle = new OperationLifecycle<TResult>();

  async execute<TRequest extends CommandContract>(
    command: TRequest,
    handlerFn: CommandHandlerFn
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
