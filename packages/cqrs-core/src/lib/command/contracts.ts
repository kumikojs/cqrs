import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import type {
  CommandHandlerFn,
  CommandOptions,
  InferredCommands,
} from './types';

export interface CommandContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  commandName: TName;
  payload?: TPayload;
  options?: TOptions & CommandOptions & Record<string, unknown>;
}

export interface CommandHandlerContract<
  TCommand extends CommandContract = CommandContract,
  TReturn = unknown
> {
  execute(command: TCommand): Promise<TReturn>;
}

export interface CommandBusContract<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> {
  interceptors: InterceptorManagerContract<
    CommandContract<
      string,
      unknown,
      CombinedPartialOptions<CommandContract, KnownCommands>
    >
  >;
  execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse>;
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction;
}
