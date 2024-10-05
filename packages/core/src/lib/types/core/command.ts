import type {
  GetQueryResult,
  InterceptorManagerContract,
  Query,
  QueryInput,
} from '../main';
import type { EventEmitter, EventRegistry } from './event';
import type { MergedPartialOptions, OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';
import type { QueryRegistry } from './query';

/**
 * Represents a command with its name, optional payload, and options.
 *
 * The command name is a required string, and payload and options are optional.
 * The options include command-specific execution options.
 */
export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options extends Record<string, unknown> = Record<string, unknown>
> extends OptionsContainer<Options> {
  commandName: Name;
  payload?: Payload;
}

/**
 * Context used for executing commands, including cache and event emitter.
 *
 * - **cache**: Used to manage command-related caching for queries.
 * - **emit**: Function for emitting events.
 */
export type CommandExecutionContext<
  KnownQueries extends QueryRegistry,
  KnownEvents extends EventRegistry
> = {
  cache: CommandCacheContract<KnownQueries>;
  emit: EventEmitter<KnownEvents>['emit'];
};

/**
 * Options for command execution, extending resilience options and including
 * additional settings for query invalidation and mutation handling.
 *
 * - **invalidation**: Defines queries that should be invalidated upon command execution.
 * - **onMutate**: Callback for handling cache mutations.
 */
export type CommandExecutionOptions<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Partial<
  Omit<ResilienceOptions, 'cache' | 'fallback'> & {
    invalidation?: {
      queries: (
        | KnownQueries[keyof KnownQueries]['req']['queryName']
        | KnownQueries[keyof KnownQueries]['req']
      )[];
    };
    onMutate?: (ctx: { cache: CommandCacheContract<KnownQueries> }) => void;
    fallback?: (command: CommandType, error: unknown) => void;
  }
>;

/**
 * A command type that includes dependencies for execution.
 *
 * Extends the basic `Command` type with additional options related to command execution.
 */
export type CommandWithDependencies<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Command<
  CommandType['commandName'],
  CommandType['payload'],
  CommandType['options'] & CommandExecutionOptions<CommandType, KnownQueries>
>;

/**
 * Interface for executing commands with a specific context.
 *
 * Defines a method to execute commands that return a promise.
 */
export interface CommandExecutor<
  CommandType extends Command = Command,
  ContextType = unknown
> {
  execute(command: CommandType, context: ContextType): Promise<void>;
}

/**
 * Function type for executing commands with a specific context.
 *
 * Similar to `CommandExecutor`, but defined as a function type.
 */
export type CommandExecutorFunction<
  CommandType extends Command = Command,
  ContextType = unknown
> = (command: CommandType, context: ContextType) => Promise<void>;

/**
 * Type for a command handler, which can be either an executor or an executor function.
 *
 * - **CommandExecutor**: An object implementing `execute`.
 * - **CommandExecutorFunction**: A function that performs the execution.
 */
export type CommandHandler<
  CommandType extends Command = Command,
  ContextType = unknown
> =
  | CommandExecutor<CommandType, ContextType>
  | CommandExecutorFunction<CommandType, ContextType>;

/**
 * Type for a command handler that includes the execution context.
 *
 * Extends `CommandHandler` with a context that includes both queries and events.
 */
export type CommandHandlerWithContext<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> = CommandHandler<
  CommandType,
  CommandExecutionContext<KnownQueries, KnownEvents>
>;

/**
 * A registry mapping command names to their respective command types.
 */
export type CommandRegistry = Record<string, Command>;

/**
 * Extracts a command type from the registry based on the command name.
 *
 * - **CommandName**: The name of the command to extract.
 * - **KnownCommands**: The command registry to search.
 */
export type ExtractCommand<
  CommandName extends string,
  KnownCommands extends CommandRegistry
> = Extract<KnownCommands[keyof KnownCommands], { commandName: CommandName }>;

/**
 * Finds a command by name within a given command registry.
 *
 * - **Commands**: The command registry to search.
 * - **Name**: The name of the command to find.
 */
export type FindCommandByName<
  Commands extends CommandRegistry,
  Name extends string
> = {
  [Key in keyof Commands]: Commands[Key]['commandName'] extends Name
    ? Commands[Key]
    : never;
}[keyof Commands];

/**
 * Creates a mapping of command names to their respective types with dependencies resolved.
 *
 * This type resolves each command in the `KnownCommands` registry to its corresponding `CommandWithDependencies` type,
 * including its payload, options, and the known queries required for execution.
 *
 * - **CommandName**: Each command name from the `KnownCommands` registry.
 * - **CommandWithDependencies**: The type for the command including its dependencies and options.
 *
 * This mapping ensures that all commands in the registry have their types properly inferred and linked with their dependencies.
 */
export type ResolvedCommandRegistry<
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: CommandWithDependencies<
    ExtractCommand<CommandName, KnownCommands>,
    KnownQueries
  >;
};

/**
 * Determines the type of command for execution based on whether it is known or external.
 *
 * - **If the command is known** (exists in the registry):
 *   Resolves to the command type inferred from the registry with dependencies and options.
 * - **If the command is not known** (external):
 *   Resolves to the command type with explicit typing, assuming the command is external and not in the registry.
 */
export type CommandForExecution<
  CommandType extends Command,
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = CommandType extends { commandName: infer Name }
  ? Name extends keyof KnownCommands
    ? CommandWithDependencies<KnownCommands[Name], KnownQueries>
    : CommandWithDependencies<CommandType, KnownQueries>
  : CommandWithDependencies<CommandType, KnownQueries>;

export interface CommandBusContract<
  KnownCommands extends CommandRegistry = CommandRegistry,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> {
  /**
   * Executes a command with the given handler.
   *
   * - **CommandType**: The type of the command to execute, resolved from the registry or provided explicitly.
   * - **handler**: The handler responsible for executing the command within the provided context.
   */
  execute<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    command: CommandForExecution<CommandType, KnownCommands, KnownQueries>,
    handler: CommandHandlerWithContext<
      CommandForExecution<CommandType, KnownCommands, KnownQueries>,
      KnownQueries,
      KnownEvents
    >
  ): Promise<void>;

  /**
   * Dispatches a command without specifying a handler, relying on registered handlers.
   *
   * - **CommandType**: The type of the command to dispatch, resolved from the registry or provided explicitly.
   */
  dispatch<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    command: CommandForExecution<CommandType, KnownCommands, KnownQueries>
  ): Promise<void>;

  /**
   * Registers a command handler for a specific command name.
   *
   * - **commandName**: The name of the command to register.
   * - **handler**: The handler responsible for processing the command within the given context.
   */
  register<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: CommandHandlerWithContext<
      FindCommandByName<KnownCommands, CommandName>,
      KnownQueries,
      KnownEvents
    >
  ): VoidFunction;

  /**
   * Registers a command handler for a command type.
   *
   * - **commandName**: The name of the command to register.
   * - **handler**: The handler responsible for processing the command within the given context.
   */
  register<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): VoidFunction;

  /**
   * Unregisters a command handler for a specific command name.
   *
   * - **commandName**: The name of the command to unregister.
   * - **handler**: The handler to remove from the command registry.
   */
  unregister<CommandName extends keyof KnownCommands & string>(
    commandName: CommandName,
    handler: CommandHandlerWithContext<
      FindCommandByName<KnownCommands, CommandName>,
      KnownQueries,
      KnownEvents
    >
  ): void;

  /**
   * Unregisters a command handler for a command type.
   *
   * - **commandName**: The name of the command to unregister.
   * - **handler**: The handler to remove from the command registry.
   */
  unregister<
    CommandType extends Command = ResolvedCommandRegistry<
      KnownCommands,
      KnownQueries
    >[keyof ResolvedCommandRegistry<KnownCommands, KnownQueries>]
  >(
    commandName: CommandType['commandName'],
    handler: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ): void;

  /**
   * Disconnects the command bus, cleaning up any resources.
   */
  disconnect(): void;

  /**
   * Manager for interceptors that can modify or extend command processing.
   */
  interceptors: InterceptorManagerContract<
    Command<string, unknown, MergedPartialOptions<Command, KnownCommands>>
  >;
}

export interface CommandCacheContract<KnownQueries extends QueryRegistry> {
  invalidateQueries(
    ...queries: (
      | KnownQueries[keyof KnownQueries]['req']['queryName']
      | KnownQueries[keyof KnownQueries]['req']
    )[]
  ): void;

  optimisticUpdate<TQueryInput extends KnownQueries[keyof KnownQueries]['req']>(
    query: TQueryInput,
    updater: (
      prev?: GetQueryResult<TQueryInput['queryName'], KnownQueries>
    ) => GetQueryResult<TQueryInput['queryName'], KnownQueries>
  ): Promise<void>;
  optimisticUpdate<TQueryName extends keyof KnownQueries & string>(
    queryName: TQueryName,
    updater: (
      prev?: GetQueryResult<TQueryName, KnownQueries>
    ) => GetQueryResult<TQueryName, KnownQueries>
  ): Promise<void>;
  optimisticUpdate<
    TQuery extends QueryInput = KnownQueries[keyof KnownQueries]['req']
  >(
    queryOrName: TQuery['queryName'],
    updater: (
      prev: GetQueryResult<TQuery['queryName'], KnownQueries>
    ) => GetQueryResult<TQuery['queryName'], KnownQueries>
  ): Promise<void>;
  optimisticUpdate<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryOrName: TQuery['req'],
    updater: (prev: TQuery['res'] | null | undefined) => TQuery['res']
  ): Promise<void>;
}
