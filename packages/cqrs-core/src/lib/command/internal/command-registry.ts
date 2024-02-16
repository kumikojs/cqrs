import type { VoidFunction } from '../../internal/types';
import type { CommandContract, CommandName } from '../command';
import type { CommandHandlerContract } from '../command-handler';

export interface CommandRegistryContract<
  BaseCommand extends CommandContract = CommandContract
> {
  register<TCommand extends BaseCommand>(
    commandName: string,
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction;

  resolve(commandName: string): CommandHandlerContract<BaseCommand>;

  clear(): void;
}

export class CommandAlreadyRegisteredException extends Error {
  constructor(commandName: string) {
    super(`Command handler for "${commandName}" is already registered`);
  }
}

export class CommandNotRegisteredException extends Error {
  constructor(commandName: string) {
    super(`Command handler for "${commandName}" is not registered`);
  }
}

export class CommandRegistry implements CommandRegistryContract {
  #handlers: Map<CommandName, CommandHandlerContract>;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TCommand extends CommandContract>(
    commandName: CommandName,
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction {
    if (this.#handlers.has(commandName)) {
      throw new CommandAlreadyRegisteredException(commandName);
    }

    this.#handlers.set(commandName, handler);

    return () => this.#handlers.delete(commandName);
  }

  public resolve(commandName: CommandName): CommandHandlerContract {
    const handler = this.#handlers.get(commandName);
    if (!handler) {
      throw new CommandNotRegisteredException(commandName);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
