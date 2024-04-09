import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';
import { Cache } from '../internal/cache/cache';
import { CommandInterceptors } from './command_interceptors';

import { EventBus } from '../event/event_bus';
import { EventContract, EventEmitter } from '../event/event_contracts';
import type { BusDriver } from '../internal/bus/bus_driver';
import type { InterceptorManagerContract } from '../internal/interceptor/interceptor_contracts';
import type { QueryContract } from '../query/query_contracts';
import type { CombinedPartialOptions } from '../types';
import type {
  CommandContract,
  CommandHandlerContract,
} from './command_contracts';
import type {
  InferredCommandHandlers,
  InferredCommands,
} from './command_types';

/**
 * A central hub for registering and executing commands, facilitating cross-cutting concerns through interceptors.
 *
 * @remarks
 * This class enables a decoupled architecture where commands can be handled asynchronously, promoting testability and maintainability.
 * It leverages a cache for storing and retrieving data, as well as interceptors to handle resilience, query invalidation, and other cross-cutting concerns.
 *
 * @template KnownCommands - A record of known command types for inference purposes.
 * @template KnownQueries - A record of known query types for inference purposes.
 * @example
 * ```ts
 * import { type CommandContract, CommandBus } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = CommandContract<'user.create', { name: string; }>;
 * type UpdateUserCommand = CommandContract<'user.update', { id: number; name: string; }>;
 *
 * type KnownCommands = {
 *  'user.create': CreateUserCommand;
 *  'user.update': UpdateUserCommand;
 * };
 * const bus = new CommandBus<KnownCommands>();
 *
 * bus.register('user.create', async (command) => {
 *  console.log('User created:', command);
 * });
 *
 * bus.dispatch({
 *  commandName: 'user.create',
 *  payload: {
 *    name: 'John Doe',
 *  },
 * });
 * ```
 */
export class CommandBus<
  KnownCommands extends Record<string, CommandContract> = Record<
    string,
    CommandContract
  >,
  KnownQueries extends Record<string, QueryContract> = Record<
    string,
    QueryContract
  >,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> {
  /**
   * @private
   * The underlying bus driver responsible for managing subscriptions and publishing of commands.
   */
  #driver: BusDriver<string> = new MemoryBusDriver();

  /**
   * @private
   * The interceptor manager responsible for applying interceptors to the command execution pipeline.
   */
  #interceptorManager: InterceptorManagerContract<
    CommandContract<
      string,
      unknown,
      CombinedPartialOptions<CommandContract, KnownCommands>
    >
  >;

  #emitter: EventBus<KnownEvents>;

  /**
   * Constructs a CommandBus instance.
   *
   * @param cache - The cache instance to be used for data storage and retrieval.
   */
  constructor(cache: Cache, emitter: EventBus) {
    this.#interceptorManager = new CommandInterceptors<
      CommandContract<
        string,
        unknown,
        CombinedPartialOptions<CommandContract, KnownCommands>
      >,
      KnownCommands
    >(cache).buildInterceptors();

    this.#emitter = emitter;

    // Bind methods because they can be used as callbacks and we want to keep the context.
    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  /**
   * The interceptor manager responsible for managing cross-cutting concerns for commands.
   * Refer to the {@link InterceptorManagerContract} interface for details.
   */
  get interceptors() {
    return this.#interceptorManager;
  }

  /**
   * Registers a command handler to the command bus.
   *
   * @template TCommand - The type of command the handler handles, inferred from the `KnownCommands` record.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to register.
   *                   It can be a function implementing the {@link CommandHandlerContract} interface
   *                   or the `execute` method of the interface.
   * @returns An unregistration function to remove the handler from the bus.
   */
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | InferredCommandHandlers<TCommand, void, KnownEvents>
      | InferredCommandHandlers<TCommand, void, KnownEvents>['execute']
  ): VoidFunction {
    const handlerFn = (command: TCommand) =>
      typeof handler === 'function'
        ? handler(command, { emit: this.#emitter.emit })
        : handler.execute(command, { emit: this.#emitter.emit });

    this.#driver.subscribe(commandName, handlerFn);

    return () => this.unregister(commandName, handler);
  }

  /**
   * Unregisters a command handler from the command bus.
   *
   * @template TCommand - The type of query the handler handles, inferred from the `KnownCommands` record.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to unregister.
   *                   It can be a function implementing the {@link CommandHandlerContract} interface
   *                   or the `execute` method of the interface.
   */
  unregister<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | InferredCommandHandlers<TCommand, void, KnownEvents>
      | InferredCommandHandlers<TCommand, void, KnownEvents>['execute']
  ) {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(commandName, handlerFn);
  }

  /**
   * Executes a command using the command bus's interceptor pipeline, applying middleware-like functionality.
   *
   * @template TCommand - The inferred type of the command to execute (derived from `InferredCommands`).
   * @template TResponse - The expected response type from the command execution.
   *                       For commands, this is often `void` as they primarily trigger actions.
   * @param command - The command to execute.
   * @param handler - A custom handler for executing the command, overriding registered handlers.
   *                   This can be a function implementing the `CommandHandlerContract` interface's `execute` method.
   * @returns A promise resolving to the result of the command execution (often `void` for commands).
   */
  async execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): Promise<TResponse> {
    return await this.#interceptorManager.execute<TCommand, TResponse>(
      command,
      async (command) =>
        typeof handler === 'function'
          ? handler(command, { emit: this.#emitter.emit })
          : handler.execute(command, { emit: this.#emitter.emit })
    );
  }

  /**
   * Dispatches a command to the command bus for execution, initiating its processing pipeline.
   *
   * @template TCommand - The inferred type of the command to execute (derived from `InferredCommands`).
   * @template TResponse - The expected response type from the command execution.
   *                       For commands, this is often `void` as they primarily trigger actions.
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution (often `void` for commands).
   */
  async dispatch<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(command: TCommand): Promise<TResponse> {
    return this.execute<TCommand, TResponse>(command, (command) =>
      this.#driver.publish(command['commandName'], command)
    );
  }
}
