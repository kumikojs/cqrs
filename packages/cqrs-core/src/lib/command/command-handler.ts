/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommandContract } from './command';

export interface CommandHandlerContract<
  BaseCommand extends CommandContract = CommandContract
> {
  execute<TCommand extends BaseCommand, TResponse = any>(
    command: TCommand
  ): Promise<TResponse>;
}
