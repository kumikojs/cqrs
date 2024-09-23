import { Client } from '../../client';
import { Operation } from '../../utilities/reactive/operation';

import type { Command, CommandHandler } from '../../types/core/command';

/**
 * **CommandSubject Class**
 *
 * A facade for executing commands and subscribing to their execution state changes.
 * Designed for UI components to interact with commands, providing both execution and state management functionalities.
 *
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
   * @private
   * The function responsible for executing commands.
   */
  #handlerFn: (command: Command) => Promise<void>;

  /**
   * @private
   * The client instance for interacting with the cache.
   */
  #client: Client;

  /**
   * Creates a new instance of `CommandSubject`.
   *
   * @param client - The client instance for interacting with the cache.
   * @param handler - An optional command handler function or class implementing the {@link CommandHandler} interface.
   */
  constructor(client: Client, handler?: CommandHandler<Command>) {
    this.#client = client;
    this.#handlerFn = handler
      ? (command: Command) => client.command.execute(command, handler)
      : (command: Command) => client.command.dispatch(command);
  }

  /**
   * Executes a command and handles the result.
   *
   * @template TRequest - The inferred type of the command to execute, extending {@link Command}.
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution, which is typically `void` for commands.
   */
  async execute<TRequest extends Command>(command: TRequest): Promise<void> {
    return this.#operation.execute<TRequest>(command, this.#handlerFn);
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
