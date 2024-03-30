import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { CommandContract, CommandHandlerContract } from './contracts';

/**
 * A facade for executing commands and subscribing to their execution state changes.
 * Designed for UI components to interact with commands, providing both execution and state management functionalities.
 *
 * @remarks
 * This class simplifies UI development by offering a centralized mechanism for command execution and state updates.
 * By encapsulating the underlying `Operation` class, it provides a more reactive and user-friendly experience for UI components.
 */
export class CommandSubject {
  /**
   * @private
   * The internal `Operation` instance responsible for handling command execution and state management.
   */
  #operation = new Operation<void>();

  /**
   * Executes a command and invokes the provided handler function to handle the result.
   *
   * @template TRequest - The inferred type of the command to execute, extending {@link CommandContract}.
   * @param command - The command to execute.
   * @param handlerFn - The handler function to handle the result of the command execution.
   * @returns A promise resolving to the result of the command execution, which is typically `void` for commands.
   */
  async execute<TRequest extends CommandContract>(
    command: TRequest,
    handlerFn: CommandHandlerContract<TRequest>['execute']
  ): Promise<void> {
    return this.#operation.execute<TRequest>(command, handlerFn);
  }

  /**
   * Subscribes to state changes of the command's execution.
   *
   * @param onStateChange - A callback function to be invoked whenever the command's state changes.
   * @returns A function to unsubscribe from state change notifications.
   */
  subscribe(onStateChange: VoidFunction) {
    return this.#operation.subscribe(onStateChange);
  }

  /**
   * Retrieves the current state of the ongoing command execution.
   *
   * @returns The current state of the command execution.
   */
  get state() {
    return this.#operation.state;
  }
}
