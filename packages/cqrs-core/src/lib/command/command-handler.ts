/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract } from './command';

export interface CommandHandlerContract<
  TCommand extends CommandContract = CommandContract,
  TReturn = any
> {
  execute(command: TCommand): Promise<TReturn>;
}
