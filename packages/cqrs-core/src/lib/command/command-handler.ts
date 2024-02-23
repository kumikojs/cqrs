import type { CommandContract } from './command';

export interface CommandHandlerContract<
  TCommand extends CommandContract = CommandContract,
  TReturn = unknown
> {
  execute(command: TCommand): Promise<TReturn>;
}

export type CommandHandlerFn<
  T extends CommandContract = CommandContract,
  TResponse = unknown
> = (command: T) => Promise<TResponse>;
