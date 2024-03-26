import { MemoryBusDriver } from '../internal/bus/drivers/memory_bus';
import { Cache } from '../internal/cache/cache';
import { InterceptorManagerContract } from '../internal/interceptor/contracts';
import { CommandInterceptors } from './command_interceptors';

import type { BusDriver } from '../internal/bus/bus_driver';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import type {
  CommandBusContract,
  CommandContract,
  CommandHandlerContract,
} from './contracts';
import type { InferredCommands } from './types';

export class CommandBus<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> implements CommandBusContract<KnownCommands, KnownQueries>
{
  #driver: BusDriver<string> = new MemoryBusDriver();

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

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.dispatch = this.dispatch.bind(this);
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
