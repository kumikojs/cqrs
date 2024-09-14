import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { CommandCache } from './command_cache';
import { CommandInterceptors } from './command_interceptors';

import type {
  Command,
  CommandHandler,
  CommandRegistry,
  CommandHandlerWithContext,
  ResolvedCommandRegistry,
} from '../../types/core/command';
import type { EventBusContract, EventRegistry } from '../../types/core/event';
import type { MergedPartialOptions } from '../../types/core/options/options';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import type { QueryRegistry } from '../../types/core/query';
import type { BusDriver } from '../../types/infrastructure/bus';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';

export class CommandBus<
  KnownCommands extends CommandRegistry = CommandRegistry,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> {
  #driver: BusDriver<string>;
  #interceptorManager: InterceptorManagerContract<
    Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>
  >;
  #emitter: EventBusContract<KnownEvents>;
  #cache: CommandCache<KnownQueries>;
  #logger: KumikoLogger;

  constructor(
    cache: QueryCache,
    emitter: EventBusContract<KnownEvents>,
    logger: KumikoLogger,
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

  get interceptors() {
    return this.#interceptorManager;
  }

  register<CommandType extends Command>(
    commandName: CommandType['commandName'],
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): VoidFunction {
    const handlerFn = (command: CommandType) =>
      typeof handler === 'function'
        ? handler(command, { emit: this.#emitter.emit, cache: this.#cache })
        : handler.execute(command, {
            emit: this.#emitter.emit,
            cache: this.#cache,
          });

    this.#driver.subscribe(commandName, handlerFn);

    return () => this.unregister(commandName, handler);
  }

  unregister<TCommand extends Command>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerWithContext<TCommand, KnownQueries, KnownEvents>
  ): void {
    const handlerFn = typeof handler === 'function' ? handler : handler.execute;

    this.#driver.unsubscribe(commandName, handlerFn);
  }

  async execute<
    TCommand extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>],
    TResponse = void
  >(command: TCommand, handler: CommandHandler<TCommand>): Promise<TResponse> {
    return await this.#interceptorManager.execute<TCommand, TResponse>(
      command,
      async (command) =>
        typeof handler === 'function'
          ? handler(command, { emit: this.#emitter.emit })
          : handler.execute(command, { emit: this.#emitter.emit })
    );
  }

  async dispatch<TCommand extends Command>(command: TCommand): Promise<void> {
    return this.execute<TCommand, void>(command, (command) =>
      this.#driver.publish(command['commandName'], command)
    );
  }

  disconnect(): void {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
  }
}
