import type {
  GetQueryOutput,
  InterceptorManagerContract,
  Query,
  QueryInput,
} from '../main';
import type { EventEmitter, EventRegistry } from './event';
import type { MergedPartialOptions } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';
import type { QueryRegistry } from './query';

export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options extends Record<string, unknown> = Record<string, unknown>
> {
  commandName: Name;
  payload?: Payload;
  options?: Options;
}

type CommandContext<
  KnownQueries extends QueryRegistry,
  KnownEvents extends EventRegistry
> = {
  cache: CommandCacheContract<KnownQueries>;
  emit: EventEmitter<KnownEvents>['emit'];
};

export type CommandWithOptions<
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

export type CommandWithDependencies<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Command<
  CommandType['commandName'],
  CommandType['payload'],
  CommandType['options'] & CommandWithOptions<CommandType, KnownQueries>
>;

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

export type CommandHandlerWithContext<
  CommandType extends Command,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> = CommandHandler<CommandType, CommandContext<KnownQueries, KnownEvents>>;

export type CommandRegistry = Record<string, Command>;

export type ExtractCommandByName<
  Commands extends CommandRegistry,
  Name extends string
> = Extract<Commands[keyof Commands], { commandName: Name }>;

export type InferCommand<
  CommandType extends Command,
  KnownCommands extends CommandRegistry
> = CommandType extends { commandName: infer Name }
  ? Name extends keyof KnownCommands & string
    ? ExtractCommandByName<KnownCommands, Name>
    : CommandType
  : never;

export type InferCommandByName<
  CommandName extends keyof KnownCommands & string,
  KnownCommands extends CommandRegistry
> = Command<
  CommandName,
  ExtractCommandByName<KnownCommands, CommandName>['payload'],
  ExtractCommandByName<KnownCommands, CommandName>['options'] &
    Record<string, unknown>
>;

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
    ExtractCommandByName<KnownCommands, CommandName>,
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

/**
 * Omit on CommandForExecution to remove the payload property does not work as expected
 * because the payload property is a Record<string, unknown> and not a direct property of the Command type.
 * This type is a workaround to remove the payload property from the Command type.
 */
export type CommandWithoutPayload<
  CommandName extends keyof KnownCommands & string,
  KnownCommands extends CommandRegistry,
  KnownQueries extends QueryRegistry
> = Omit<
  Command<
    CommandName,
    unknown,
    CommandForExecution<
      InferCommandByName<CommandName, KnownCommands>,
      KnownCommands,
      KnownQueries
    >['options'] &
      Record<string, unknown>
  >,
  'payload'
>;

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
    handler: CommandHandlerWithContext<
      CommandForExecution<CommandType, KnownCommands, KnownQueries>,
      KnownQueries,
      KnownEvents
    >
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
      ExtractCommandByName<KnownCommands, CommandName>,
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
      ExtractCommandByName<KnownCommands, CommandName>,
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
      prev?: GetQueryOutput<TQueryInput['queryName'], KnownQueries>
    ) => GetQueryOutput<TQueryInput['queryName'], KnownQueries>
  ): Promise<void>;
  optimisticUpdate<TQueryName extends keyof KnownQueries & string>(
    queryName: TQueryName,
    updater: (
      prev?: GetQueryOutput<TQueryName, KnownQueries>
    ) => GetQueryOutput<TQueryName, KnownQueries>
  ): Promise<void>;
  optimisticUpdate<
    TQuery extends QueryInput = KnownQueries[keyof KnownQueries]['req']
  >(
    queryOrName: TQuery['queryName'],
    updater: (
      prev: GetQueryOutput<TQuery['queryName'], KnownQueries>
    ) => GetQueryOutput<TQuery['queryName'], KnownQueries>
  ): Promise<void>;
  optimisticUpdate<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryOrName: TQuery['req'],
    updater: (prev: TQuery['res'] | null | undefined) => TQuery['res']
  ): Promise<void>;
}
