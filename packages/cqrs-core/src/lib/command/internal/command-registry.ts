/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VoidFunction } from '../../internal/types';
import type { CommandContract } from '../command';
import type { CommandHandlerContract } from '../command-handler';

export interface CommandRegistryContract<
  KnownCommands extends Record<string, CommandContract>
> {
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction;

  resolve<TCommand extends KnownCommands[keyof KnownCommands], TResponse>(
    commandName: TCommand['commandName']
  ): CommandHandlerContract<TCommand, TResponse>;

  clear(): void;
}

export class CommandAlreadyRegisteredException extends Error {
  constructor(commandName: CommandContract['commandName']) {
    super(`Command handler for "${commandName}" is already registered`);
  }
}

export class CommandNotRegisteredException extends Error {
  constructor(commandName: CommandContract['commandName']) {
    super(`Command handler for "${commandName}" is not registered`);
  }
}

export class CommandRegistry<
  KnownCommands extends Record<string, CommandContract>
> implements CommandRegistryContract<KnownCommands>
{
  #handlers: Map<
    keyof KnownCommands,
    CommandHandlerContract<KnownCommands[keyof KnownCommands], any>
  >;

  constructor() {
    this.#handlers = new Map();
  }

  public register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction {
    if (this.#handlers.has(commandName as keyof KnownCommands)) {
      throw new CommandAlreadyRegisteredException(commandName);
    }

    this.#handlers.set(commandName as keyof KnownCommands, handler);

    return () => this.#handlers.delete(commandName as keyof KnownCommands);
  }

  public resolve<
    TCommand extends KnownCommands[keyof KnownCommands],
    TResponse
  >(
    commandName: TCommand['commandName']
  ): CommandHandlerContract<TCommand, TResponse> {
    const handler = this.#handlers.get(commandName as keyof KnownCommands);
    if (!handler) {
      throw new CommandNotRegisteredException(commandName);
    }

    return handler;
  }

  public clear(): void {
    this.#handlers.clear();
  }
}
