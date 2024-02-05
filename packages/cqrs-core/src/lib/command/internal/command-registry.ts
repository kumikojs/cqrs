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
}
