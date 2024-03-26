/**
 * @module command
 */
import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { CommandContract, CommandHandlerContract } from './contracts';

/**
 * Command subject class is used to execute commands and subscribe to their state changes.
 * It's useful for UI components that need to execute commands and display the state of the command.
 */
export class CommandSubject<TResult> {
  /**
   * The operation instance used to execute the command.
   * It's responsible for managing the command execution and state changes.
   */
  #operation = new Operation<TResult>();

  /**
   * Execute the command and handle the result with the provided handler.
   *
   * @template TRequest - The type of the command to execute.
   * @param command - The command to execute.
   * @param handlerFn - The handler function to handle the result of the command.
   * @returns The result of the command execution.
   */
  async execute<TRequest extends CommandContract>(
    command: TRequest,
    handlerFn: CommandHandlerContract<TRequest, TResult>['execute']
  ): Promise<TResult> {
    return this.#operation.execute<TRequest, TResult>(command, handlerFn);
  }

  /**
   * Subscribe to state changes of the command.
   *
   * @param onStateChange - The function to call when the state of the command changes.
   * @returns A function to unsubscribe from the state changes.
   */
  subscribe(onStateChange: VoidFunction) {
    return this.#operation.subscribe(onStateChange);
  }

  /**
   * Get the current state of the performed command.
   *
   * @returns The current state of the command.
   */
  get state() {
    return this.#operation.state;
  }
}
