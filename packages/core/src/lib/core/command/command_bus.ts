import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { CommandCache } from './command_cache';
import { CommandInterceptors } from './command_interceptors';

import type {
  Command,
  CommandCacheContract,
  CommandForExecution,
  CommandHandlerWithContext,
  CommandRegistry,
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
  #cache: CommandCacheContract<KnownQueries>;
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
    this.#driver.subscribe(commandName, handler);

    return () => this.unregister(commandName, handler);
  }

  unregister<TCommand extends Command>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerWithContext<TCommand, KnownQueries, KnownEvents>
  ): void {
    this.#driver.unsubscribe(commandName, handler);
  }

  async execute<TCommand extends Command>(
    cmd: CommandForExecution<TCommand, KnownCommands, KnownQueries>,
    handler: CommandHandlerWithContext<
      CommandForExecution<TCommand, KnownCommands, KnownQueries>,
      KnownQueries,
      KnownEvents
    >
  ): Promise<void> {
    return await this.#interceptorManager.execute<
      CommandForExecution<TCommand, KnownCommands, KnownQueries>,
      void
    >(cmd, async (resolvedCmd) =>
      typeof handler === 'function'
        ? handler(resolvedCmd, {
            emit: this.#emitter.emit,
            cache: this.#cache,
          })
        : handler.execute(resolvedCmd, {
            emit: this.#emitter.emit,
            cache: this.#cache,
          })
    );
  }

  async dispatch<TCommand extends Command>(
    cmd: CommandForExecution<TCommand, KnownCommands, KnownQueries>
  ): Promise<void> {
    return this.execute(cmd, (resolvedCmd) =>
      this.#driver.publish(resolvedCmd['commandName'], resolvedCmd)
    );
  }

  disconnect(): void {
    this.#driver.disconnect();
    this.#interceptorManager.disconnect();
  }
}
