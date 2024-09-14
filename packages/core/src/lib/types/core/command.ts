import type { CommandCache } from '../../core/command/command_cache';
import type { InterceptorManagerContract } from '../main';
import type { EventEmitter, EventRegistry } from './event';
import type { MergedPartialOptions, OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';
import type { QueryRegistry } from './query';

export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & CommandExecutionOptions> {
  commandName: Name;
  payload?: Payload;
}

export type CommandRegistry = Record<string, Command>;

export interface CommandExecutor<
  CommandType extends Command = Command,
  ContextType = unknown
> {
  execute(command: CommandType, context: ContextType): Promise<void>;
}

export type CommandExecutorFunction<
  CommandType extends Command = Command,
  ContextType = unknown
> = (command: CommandType, context: ContextType) => Promise<void>;

export type CommandHandler<
  CommandType extends Command = Command,
  ContextType = unknown
> =
  | CommandExecutor<CommandType, ContextType>
  | CommandExecutorFunction<CommandType, ContextType>;

export type CommandExecutionContext<
  KnownQueries extends QueryRegistry,
  KnownEvents extends EventRegistry
> = {
  cache: CommandCache<KnownQueries>;
  emit: EventEmitter<KnownEvents>['emit'];
};

export type CommandExecutionOptions<
  KnownQueries extends QueryRegistry = QueryRegistry
> = Partial<
  Omit<ResilienceOptions, 'cache'> & {
    invalidation?: {
      queries: (
        | KnownQueries[keyof KnownQueries]['req']['queryName']
        | KnownQueries[keyof KnownQueries]['req']
      )[];
    };
    onMutate?: (ctx: { cache: CommandCache<KnownQueries> }) => void;
  }
>;

export type CommandWithDependencies<
  Name extends string = string,
  Payload = unknown,
  Options = unknown,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Command<Name, Payload, Options & CommandExecutionOptions<KnownQueries>>;

export type ResolvedCommandRegistry<
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: CommandWithDependencies<
    CommandName,
    ExtractCommand<CommandName, KnownCommands>['payload'],
    ExtractCommand<CommandName, KnownCommands>['options'],
    KnownQueries
  >;
};

export type ExtractCommand<
  CommandName extends string,
  KnownCommands extends CommandRegistry
> = Extract<KnownCommands[keyof KnownCommands], { commandName: CommandName }>;

/**
 * Represents a command handler with context and response types.
 *
 * @template CommandType - The type of command.
 * @template ResponseType - The return type of the command execution.
 * @template KnownQueries - Known query types.
 * @template KnownEvents - Known event types.
 */
export type CommandHandlerWithContext<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> = CommandHandler<
  CommandType,
  CommandExecutionContext<KnownQueries, KnownEvents>
>;

type FindCommandByName<
  Commands extends CommandRegistry,
  Name extends string
> = {
  [Key in keyof Commands]: Commands[Key]['commandName'] extends Name
    ? Commands[Key]
    : never;
}[keyof Commands];

type CommandForExecution<
  CommandType extends Command,
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = CommandType extends Command
  ? FindCommandByName<KnownCommands, CommandType['commandName']> extends never
    ? CommandWithDependencies<
        CommandType['commandName'],
        CommandType['payload'],
        CommandType['options'],
        KnownQueries
      > // External command
    : CommandWithDependencies<
        FindCommandByName<
          KnownCommands,
          CommandType['commandName']
        >['commandName'],
        FindCommandByName<KnownCommands, CommandType['commandName']>['payload'],
        FindCommandByName<KnownCommands, CommandType['commandName']>['options'],
        KnownQueries
      > // Known command from the registry
  : never;

/**
 * Command Bus Contract interface defining operations for command handling.
 *
 * @template KnownCommands - Known command types.
 * @template KnownQueries - Known query types.
 * @template KnownEvents - Known event types.
 */
export interface CommandBusContract<
  KnownCommands extends CommandRegistry = CommandRegistry,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> {
  execute<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    command: CommandForExecution<CommandType, KnownCommands, KnownQueries>,
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): Promise<void>;

  dispatch<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    command: CommandForExecution<CommandType, KnownCommands, KnownQueries>
  ): Promise<void>;

  register<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: CommandHandlerWithContext<
      FindCommandByName<KnownCommands, CommandName>,
      KnownQueries,
      KnownEvents
    >
  ): VoidFunction;
  register<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): VoidFunction;

  unregister<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: CommandHandlerWithContext<
      FindCommandByName<KnownCommands, CommandName>,
      KnownQueries,
      KnownEvents
    >
  ): void;
  unregister<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): void;

  disconnect(): void;

  interceptors: InterceptorManagerContract<
    Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>
  >;
}
