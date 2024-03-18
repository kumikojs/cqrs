/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VoidFunction } from '../../internal/types';
import type { CommandContract } from '../command';
import type { CommandHandlerContract } from '../command-handler';

export interface CommandRegistryContract {
  register<TCommand extends CommandContract>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction;

  resolve<TCommand extends CommandContract, TResponse>(
    commandName: TCommand['commandName']
  ): CommandHandlerContract<TCommand, TResponse>;

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
  #handlers: Map<
    CommandContract['commandName'],
    CommandHandlerContract<CommandContract, any>
  >;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TCommand extends CommandContract>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction {
    if (this.#handlers.has(commandName)) {
      throw new CommandAlreadyRegisteredException(commandName);
    }

    this.#handlers.set(commandName, handler);

    return () => this.#handlers.delete(commandName);
  }

  public resolve<TCommand extends CommandContract, TResponse>(
    commandName: TCommand['commandName']
  ): CommandHandlerContract<TCommand, TResponse> {
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
