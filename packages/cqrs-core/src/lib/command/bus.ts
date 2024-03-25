import { MemoryBusDriver } from '../bus/drivers/memory_bus';

import type { BusDriver } from '../bus/bus_driver';
import { CacheManager } from '../internal/cache/cache-manager';
import { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import { CommandInterceptors } from './interceptors';
import type {
  CommandBusContract,
  CommandContract,
  CommandHandlerContract,
} from './contracts';
import type { CommandHandlerFn, InferredCommands } from './types';

export class CommandBus<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> implements CommandBusContract<KnownCommands, KnownQueries>
{
  #driver: BusDriver<string> = new MemoryBusDriver();

  /**
   * The interceptor manager
   * Which is used to apply interceptors to the command execution
   */
  #interceptorManager: InterceptorManagerContract<
    CommandContract<
      string,
      unknown,
      CombinedPartialOptions<CommandContract, KnownCommands>
    >
  >;

  constructor(cacheManager: CacheManager) {
    this.#interceptorManager = new CommandInterceptors<
      CommandContract<
        string,
        unknown,
        CombinedPartialOptions<CommandContract, KnownCommands>
      >,
      KnownCommands
    >(cacheManager).buildInterceptors();

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
  }

  get bus() {
    return this.#driver;
  }

  get interceptors() {
    return this.#interceptorManager;
  }

  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    queryName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction {
    if (typeof handler === 'function') {
      this.#driver.subscribe(queryName, handler);
    } else {
      this.#driver.subscribe(queryName, handler.execute);
    }

    return () => this.unregister(queryName, handler);
  }

  unregister<TCommand extends KnownCommands[keyof KnownCommands]>(
    queryName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ) {
    if (typeof handler === 'function') {
      this.#driver.unsubscribe(queryName, handler);
    } else {
      this.#driver.unsubscribe(queryName, handler.execute);
    }
  }

  async execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse> {
    return this.#interceptorManager.execute<TCommand, TResponse>(
      command,
      handler
        ? handler
        : (command) => this.#driver.publish(command['commandName'], command)
    );
  }
}