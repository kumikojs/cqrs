import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { CommandContract, CommandHandlerContract } from './contracts';

export class CommandSubject<TResult> {
  #operation = new Operation<TResult>();

  async execute<TRequest extends CommandContract>(
    command: TRequest,
    handlerFn: CommandHandlerContract<TRequest, TResult>['execute']
  ): Promise<TResult> {
    return this.#operation.execute<TRequest, TResult>(command, handlerFn);
  }

  subscribe(onStateChange: VoidFunction) {
    return this.#operation.subscribe(onStateChange);
  }

  get state() {
    return this.#operation.state;
  }
}
