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
  BaseCommand extends CommandContract = CommandContract
> {
  register<TCommand extends BaseCommand>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction;

  execute<TCommand extends BaseCommand, TResponse = unknown>(
    command: TCommand
  ): Promise<TResponse>;
}

export class CommandBus<BaseCommand extends CommandContract>
  implements CommandBusContract<BaseCommand>
{
  #commandRegistry: CommandRegistryContract;

  constructor({
    registry = new CommandRegistry(),
  }: {
    registry?: CommandRegistryContract;
  } = {}) {
    this.#commandRegistry = registry;

    this.register = this.register.bind(this);
    this.execute = this.execute.bind(this);
  }

  register<TCommand extends BaseCommand>(
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

  async execute<TCommand extends BaseCommand, TResponse = unknown>(
    command: TCommand
  ): Promise<TResponse> {
    return this.#commandRegistry
      .resolve<TCommand, TResponse>(command.commandName)
      .execute(command);
  }
}
