/**
 * @module command
 */
import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';
import { Cache } from '../internal/cache/cache';
import { CommandInterceptors } from './command_interceptors';

import type { BusDriver } from '../internal/bus/bus_driver';
import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import type {
  CommandBusContract,
  CommandContract,
  CommandHandlerContract,
} from './contracts';
import type { InferredCommands } from './types';

/**
 * The CommandBus is a simple event bus that allows you to register command handlers
 * and execute them.
 *
 * @template KnownCommands - A record of known command types for inference purposes.
 * @template KnownQueries - A record of known query types for inference purposes.
 * @implements CommandBusContract - The command bus contract. {@link CommandBusContract}
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
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> implements CommandBusContract<KnownCommands, KnownQueries>
{
  /**
   * The underlying bus driver.
   * This driver is responsible for managing the subscriptions and publishing of commands.
   */
  #driver: BusDriver<string> = new MemoryBusDriver();

  /**
   * The interceptor manager.
   * This manager is responsible for applying interceptors to the command execution pipeline.
   */
  #interceptorManager: InterceptorManagerContract<
    CommandContract<
      string,
      unknown,
      CombinedPartialOptions<CommandContract, KnownCommands>
    >
  >;

  constructor(cache: Cache) {
    this.#interceptorManager = new CommandInterceptors<
      CommandContract<
        string,
        unknown,
        CombinedPartialOptions<CommandContract, KnownCommands>
      >,
      KnownCommands
    >(cache).buildInterceptors();

    // Bind methods because they can be used as callbacks and we want to keep the context.
    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  /**
   * Get the interceptor manager.
   *
   * @returns The interceptor manager. {@link InterceptorManagerContract}
   */
  get interceptors() {
    return this.#interceptorManager;
  }

  /**
   * Register a command handler to the command bus.
   *
   * @template TCommand - The type of command the handler handles.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to register.
   * @returns An unregistration function to remove the handler from the bus.
   */
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    queryName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.subscribe(queryName, handlerFn);

    return () => this.unregister(queryName, handler);
  }

  /**
   * Unregister a command handler from the command bus.
   *
   * @template TCommand - The type of command the handler handles.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to unregister.
   */
  unregister<TCommand extends KnownCommands[keyof KnownCommands]>(
    queryName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ) {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(queryName, handlerFn);
  }

  /**
   * Dispatch a command to the command bus.
   *
   * @template TCommand - The inferred type of the command to execute.
   * @template TResponse - The expected response type from the command execution.
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution.
   */
  async dispatch<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(command: TCommand): Promise<TResponse> {
    return this.#interceptorManager.execute<TCommand, TResponse>(
      command,
      (command) => this.#driver.publish(command['commandName'], command)
    );
  }

  /**
   * Execute a command using the command bus's interceptor pipeline.
   *
   * @template TCommand - The inferred type of the command to execute.
   * @template TResponse - The expected response type from the command execution.
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution.
   */
  async execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler: CommandHandlerContract<CommandContract, TResponse>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute<TCommand, TResponse>(
      command,
      handler
    );
  }
}
