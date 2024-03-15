import {
  CommandRegistry,
  type CommandRegistryContract,
} from './internal/command-registry';
import type { CommandContract } from './command';
import type { CommandHandlerContract } from './command-handler';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export {
  CommandAlreadyRegisteredException,
  CommandNotRegisteredException,
} from './internal/command-registry';

export interface CommandBusContract<
  KnownCommands extends Record<string, CommandContract>
> {
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction;

  execute<
    TCommand extends KnownCommands[keyof KnownCommands],
    TResponse = unknown
  >(
    command: TCommand
  ): Promise<TResponse>;
}

export class CommandBus<KnownCommands extends Record<string, CommandContract>>
  implements CommandBusContract<KnownCommands>
{
  #commandRegistry: CommandRegistryContract<KnownCommands>;

  constructor() {
    this.#commandRegistry = new CommandRegistry<KnownCommands>();

    this.register = this.register.bind(this);
    this.execute = this.execute.bind(this);
  }

  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction {
    if (typeof handler === 'function') {
      handler = {
        execute: handler,
      };
    }

    return this.#commandRegistry.register(commandName, handler);
  }

  async execute<
    TCommand extends KnownCommands[keyof KnownCommands],
    TResponse = unknown
  >(command: TCommand): Promise<TResponse> {
    return this.#commandRegistry
      .resolve<TCommand, TResponse>(command.commandName)
      .execute(command);
  }
}
