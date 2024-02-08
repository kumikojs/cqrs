/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract, CommandName } from './command';
import type { CommandHandlerContract } from './command-handler';
import {
  CommandRegistry,
  type CommandRegistryContract,
} from './internal/command-registry';

type CommandHandlerFn<
  T extends CommandContract = CommandContract,
  TResponse = any
> = (command: T) => Promise<TResponse>;

export interface CommandBusContract<
  BaseCommand extends CommandContract = CommandContract
> {
  register<TCommand extends BaseCommand>(
    commandName: CommandName,
    handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
  ): VoidFunction;

  execute<TCommand extends BaseCommand, TResponse = any>(
    command: TCommand
  ): Promise<TResponse>;
}

export class CommandBus implements CommandBusContract {
  #commandRegistry: CommandRegistryContract;

  constructor({
    commandRegistry = new CommandRegistry(),
  }: {
    commandRegistry?: CommandRegistryContract;
  } = {}) {
    this.#commandRegistry = commandRegistry;
  }

  register<TCommand extends CommandContract>(
    commandName: CommandName,
    handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
  ): VoidFunction {
    if (typeof handler === 'function') {
      handler = {
        execute: handler,
      };
    }

    return this.#commandRegistry.register(commandName, handler);
  }

  async execute<TCommand extends CommandContract, TResponse = any>(
    command: TCommand
  ): Promise<TResponse> {
    const handler = this.#commandRegistry.resolve(command.commandName);

    return handler.execute(command);
  }
}
