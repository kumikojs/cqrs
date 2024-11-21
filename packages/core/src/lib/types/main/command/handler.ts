import type { Command } from './types';

export interface CommandHandlerContract<CommandType extends Command = Command> {
  execute(command: CommandType): Promise<void>;
}

export type CommandHandlerFunction<CommandType extends Command> = (
  command: CommandType
) => Promise<void>;

export type CommandHandler<CommandType extends Command> =
  | CommandHandlerContract<CommandType>
  | CommandHandlerFunction<CommandType>;
