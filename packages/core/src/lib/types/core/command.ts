import type { CommandCache } from '../../core/command/command_cache';
import { InterceptorManagerContract } from '../main';
import type { EventEmitter, EventRegistry } from './event';
import type { MergedPartialOptions, OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';
import type { QueryRegistry } from './query';

/**
 * Represents a command to modify application state or trigger side effects.
 *
 * @template Name - The unique name of the command.
 * @template Payload - Optional payload data associated with the command.
 * @template Options - Optional configuration options for the command.
 */
export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & CommandOptions> {
  commandName: Name;
  payload?: Payload;
}

/**
 * Represents a handler for executing a command.
 *
 * @template CommandType - The type of command the handler accepts.
 * @template ResponseType - The return type of the command execution.
 * @template ContextType - The context provided for executing the command.
 */
export interface CommandHandler<
  CommandType extends Command = Command,
  ResponseType = void,
  ContextType = unknown
> {
  execute(command: CommandType, context: ContextType): Promise<ResponseType>;
}

/**
 * Represents a function that handles a command.
 *
 * @template CommandType - The type of command the handler accepts.
 * @template ResponseType - The return type of the command execution.
 * @template ContextType - The context provided for executing the command.
 */
export type CommandHandlerFunction<
  CommandType extends Command = Command,
  ResponseType = void,
  ContextType = unknown
> = (command: CommandType, context: ContextType) => Promise<ResponseType>;

/**
 * Represents either a function or class-based command handler.
 *
 * @template CommandType - The type of command the handler accepts.
 * @template ResponseType - The return type of the command execution.
 * @template ContextType - The context provided for executing the command.
 */
export type CommandHandlerOrFunction<
  CommandType extends Command = Command,
  ResponseType = void,
  ContextType = unknown
> =
  | CommandHandler<CommandType, ResponseType, ContextType>
  | CommandHandlerFunction<CommandType, ResponseType, ContextType>;

/**
 * Represents a registry of commands.
 */
export type CommandRegistry = Record<string, Command>;

/**
 * Options for configuring command execution, including resilience strategies and query dependencies.
 *
 * @template KnownQueries - Array of queries the command depends on.
 */
export type CommandOptions<KnownQueries extends QueryRegistry = QueryRegistry> =
  Partial<
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

/**
 * Represents a command augmented with dependencies and options.
 *
 * @template Name - Name of the command.
 * @template Payload - Payload type of the command.
 * @template Options - Original options type of the command.
 * @template KnownQueries - Queries that the command depends on.
 */
export type CommandWithDependencies<
  Name extends string = string,
  Payload = unknown,
  Options = unknown,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Command<Name, Payload, Options & CommandOptions<KnownQueries>>;

/**
 * A record of commands with inferred queries based on known commands and queries.
 *
 * @template KnownCommands - Known command types.
 * @template KnownQueries - Known query types.
 */
export type InferredCommands<
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

/**
 * Extracts a command by its name from the known command registry.
 *
 * @template CommandName - The name of the command to extract.
 * @template KnownCommands - The registry of known commands.
 */
export type ExtractCommand<
  CommandName extends string,
  KnownCommands extends CommandRegistry
> = Extract<KnownCommands[keyof KnownCommands], { commandName: CommandName }>;

/**
 * Context object for command handlers including cache and event emitter.
 *
 * @template KnownQueries - Known query types.
 * @template KnownEvents - Known event types.
 */
export type CommandContext<
  KnownQueries extends QueryRegistry,
  KnownEvents extends EventRegistry
> = {
  cache: CommandCache<KnownQueries>;
  emit: EventEmitter<KnownEvents>['emit'];
};

/**
 * Represents a command handler with context and response types.
 *
 * @template CommandType - The type of command.
 * @template ResponseType - The return type of the command execution.
 * @template KnownQueries - Known query types.
 * @template KnownEvents - Known event types.
 */
export type InferredCommandHandler<
  CommandType extends Command,
  ResponseType = void,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> = CommandHandlerOrFunction<
  CommandType,
  ResponseType,
  CommandContext<KnownQueries, KnownEvents>
>;

type GetCommandByName<Commands extends CommandRegistry, Name extends string> = {
  [Key in keyof Commands]: Commands[Key]['commandName'] extends Name
    ? Commands[Key]
    : never;
}[keyof Commands];

type CommandForDispatch<
  CommandType extends Command,
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = CommandType extends Command
  ? GetCommandByName<KnownCommands, CommandType['commandName']> extends never
    ? CommandWithDependencies<
        CommandType['commandName'],
        CommandType['payload'],
        CommandType['options'],
        KnownQueries
      > // External command
    : CommandWithDependencies<
        GetCommandByName<
          KnownCommands,
          CommandType['commandName']
        >['commandName'],
        GetCommandByName<KnownCommands, CommandType['commandName']>['payload'],
        GetCommandByName<KnownCommands, CommandType['commandName']>['options'],
        KnownQueries
      > // Known command from the registry
  : never;

/**
 * Extracts the command registry from an object.
 */
export type ExtractCommands<T> = T extends { commands: CommandRegistry }
  ? T['commands']
  : CommandRegistry;

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
    CommandType extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>]
  >(
    command: CommandForDispatch<CommandType, KnownCommands, KnownQueries>,
    handler: InferredCommandHandler<
      CommandType,
      void,
      KnownQueries,
      KnownEvents
    >
  ): Promise<void>;

  dispatch<
    CommandType extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>]
  >(
    command: CommandForDispatch<CommandType, KnownCommands, KnownQueries>
  ): Promise<void>;

  register<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: InferredCommandHandler<
      GetCommandByName<KnownCommands, CommandName>,
      void,
      KnownQueries,
      KnownEvents
    >
  ): VoidFunction;
  register<
    CommandType extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: InferredCommandHandler<
      CommandType,
      void,
      KnownQueries,
      KnownEvents
    >
  ): VoidFunction;

  unregister<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: InferredCommandHandler<
      GetCommandByName<KnownCommands, CommandName>,
      void,
      KnownQueries,
      KnownEvents
    >
  ): void;
  unregister<
    CommandType extends Command = InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: InferredCommandHandler<
      CommandType,
      void,
      KnownQueries,
      KnownEvents
    >
  ): void;

  disconnect(): void;

  interceptors: InterceptorManagerContract<
    Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>
  >;
}
