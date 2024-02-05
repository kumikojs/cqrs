import { VoidFunction } from '../../internal/types';
import { CommandContract } from '../command';
import { CommandHandlerContract } from '../command-handler';

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

export class CommandRegistry implements CommandRegistryContract {
  protected handlers: Map<
    CommandContract['commandName'],
    CommandHandlerContract
  >;

  constructor() {
    this.handlers = new Map();
  }

  public register<TCommand extends CommandContract>(
    commandName: CommandContract['commandName'],
    handler: CommandHandlerContract<TCommand>
  ): VoidFunction {
    if (this.handlers.has(commandName)) {
      throw new Error(
        `Command handler for "${commandName}" is already registered`
      );
    }

    this.handlers.set(commandName, handler);

    return () => this.handlers.delete(commandName);
  }

  public resolve(
    commandName: CommandContract['commandName']
  ): CommandHandlerContract {
    const handler = this.handlers.get(commandName);
    if (!handler) {
      throw new Error(`Command handler for "${commandName}" is not registered`);
    }

    return handler;
  }

  public clear(): void {
    this.handlers.clear();
  }
}
