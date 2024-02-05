/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommandContract } from './command';
import { CommandHandlerContract } from './command-handler';

type CommandHandlerFn<
  T extends CommandContract = CommandContract,
  TResponse = any
> = (command: T) => Promise<TResponse>;

export interface CommandBusContract<
  BaseCommand extends CommandContract = CommandContract
> {
  register<TCommand extends BaseCommand>(
    commandName: string,
    handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
  ): VoidFunction;

  execute<TCommand extends BaseCommand, TResponse = any>(
    command: TCommand
  ): Promise<TResponse>;
}
