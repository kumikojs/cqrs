import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { StoikLogger } from '../../utilities/logger/stoik_logger';
import { EventBus } from '../event/event_bus';
import { QueryCache } from '../query/query_cache';
import { CommandCache } from './command_cache';
import { CommandInterceptors } from './command_interceptors';

import type {
  Command,
  CommandHandlerOrFunction,
  CommandRegistry,
  ExtractCommand,
  InferredCommandHandler,
  InferredCommands,
} from '../../types/core/command';
import type { EventRegistry } from '../../types/core/event';
import type { MergedPartialOptions } from '../../types/core/options/options';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import type { QueryRegistry } from '../../types/core/query';
import type { BusDriver } from '../../types/infrastructure/bus';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';

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
 * import { type Command, CommandBus } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = Command<'user.create', { name: string; }>;
 * type UpdateUserCommand = Command<'user.update', { id: number; name: string; }>;
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
  KnownCommands extends CommandRegistry = CommandRegistry,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> {
  /**
   * @private
   * The underlying bus driver responsible for managing subscriptions and publishing of commands.
   */
  #driver: BusDriver<string>;

  /**
   * @private
   * The interceptor manager responsible for applying interceptors to the command execution pipeline.
   */
  #interceptorManager: InterceptorManagerContract<
    Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>
  >;

  #emitter: EventBus<KnownEvents>;

  #cache: CommandCache<KnownQueries>;

  #logger: StoikLogger;

  /**
   * Constructs a CommandBus instance.
   *
   * @param cache - The cache instance to be used for data storage and retrieval.
   */
  constructor(
    cache: QueryCache,
    emitter: EventBus,
    logger: StoikLogger,
    options: ResilienceBuilderOptions
  ) {
    this.#logger = logger.child({
      topics: ['command'],
    });

    this.#driver = new MemoryBusDriver({
      maxHandlersPerChannel: 1,
      logger: this.#logger,
    });

    this.#cache = new CommandCache<KnownQueries>({
      cache,
      logger: this.#logger,
    });

    this.#emitter = emitter;

    this.#interceptorManager = new CommandInterceptors<
      Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>,
      KnownCommands
    >(cache, this.#logger, options).buildInterceptors();

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
  register<
    TCommandName extends string = KnownCommands[keyof KnownCommands]['commandName']
  >(
    commandName: TCommandName,
    handler: InferredCommandHandler<
      ExtractCommand<TCommandName, KnownCommands>,
      void,
      KnownQueries,
      KnownEvents
    >
  ): VoidFunction {
    const handlerFn = (command: ExtractCommand<TCommandName, KnownCommands>) =>
      typeof handler === 'function'
        ? handler(command, { emit: this.#emitter.emit, cache: this.#cache })
        : handler.execute(command, {
            emit: this.#emitter.emit,
            cache: this.#cache,
          });

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
  unregister<
    TCommandName extends string = KnownCommands[keyof KnownCommands]['commandName']
  >(
    commandName: TCommandName,
    handler: InferredCommandHandler<
      ExtractCommand<TCommandName, KnownCommands>,
      void,
      KnownQueries,
      KnownEvents
    >
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
    TCommand extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler: CommandHandlerOrFunction<TCommand>
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
    TCommand extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(command: TCommand): Promise<TResponse> {
    return this.execute<TCommand, TResponse>(command, (command) =>
      this.#driver.publish(command['commandName'], command)
    );
  }

  disconnect(): void {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
  }
}
