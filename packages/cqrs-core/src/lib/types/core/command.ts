import type { CommandCache } from '../../core/command/command_cache';
import type { EventEmitter, EventRegistry } from './event';
import type { OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';
import type { QueryRegistry } from './query';

/**
 * Represents a command.
 * An instruction for performing a "write" operation that modifies application state or triggers actions with side effects.
 *
 * @template Name - The unique name of the command, typically a string literal.
 * @template Payload - The optional payload data associated with the command.
 * @template Options - The optional configuration options for the command, extending the generic {@link CommandOptions} interface.
 * @example
 * ```typescript
 * import type { Command } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = Command<'user.create', { name: string }>;
 * ```
 */
export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & CommandOptions> {
  /**
   * The unique name of the command that serves as an identifier.
   */
  commandName: Name;

  /**
   * The optional payload data associated with the command, providing additional information or arguments for its execution.
   */
  payload?: Payload;
}

/**
 * Represents a handler for a specific command type.
 * A function or class responsible for executing a command.
 *
 * @template CommandType - The type of command the handler accepts, extending the {@link Command} interface.
 * @template ResponseType - The optional return type of the command execution, indicating any result or output.
 * @example
 * ```typescript
 * import type { Command, CommandHandler } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = Command<'user.create', { name: string }>;
 * type UpdateUserCommand = Command<'user.update', { id: number; name: string }>;
 *
 * // Function-based handler
 * const createUserHandler: CommandHandler<CreateUserCommand> = async (command) => {
 *   console.log('User created:', command.payload.name);
 * };
 *
 * // Class-based handler
 * class UpdateUserHandler implements CommandHandler<UpdateUserCommand, boolean> {
 *   async execute(command) {
 *     console.log('User updated:', command.payload.name);
 *     return true; // Example of returning a value
 *   }
 * }
 * ```
 */
export interface CommandHandler<
  CommandType extends Command = Command,
  ResponseType = void,
  ContextType = unknown
> {
  /**
   * Executes the given command.
   *
   * @param command - The command to execute.
   * @param context - The context provided for executing the command.
   * @returns A promise resolving to the result of the command execution.
   * As commands typically modify application state or trigger actions, the return type is often `void`.
   */
  execute(command: CommandType, context: ContextType): Promise<ResponseType>;
}

/**
 * Type representing a function that handles a specific command type.
 *
 * @template CommandType - The type of command the handler accepts, extending the {@link Command} interface.
 */
export type CommandHandlerFunction<CommandType extends Command> =
  CommandHandler<CommandType>['execute'];

/**
 * Type representing a command handler, which can be either a function or a class implementing the {@link CommandHandler} interface.
 *
 * @template CommandType - The type of command the handler accepts, extending the {@link Command} interface.
 */
export type CommandHandlerOrFunction<CommandType extends Command> =
  | CommandHandler<CommandType>
  | CommandHandlerFunction<CommandType>;

/**
 * Represents a registry of commands.
 */
export interface CommandRegistry {
  [key: string]: Command<string, unknown, unknown>;
}

/**
 * Options for configuring command execution, including resilience strategies and query dependencies.
 *
 * @template KnownQueries - Array of string literals representing names of queries the command depends on.
 *
 * @remarks
 * This type provides flexibility in defining optional command configurations for resilience, managing query dependencies, and enabling automatic invalidation of dependent queries after command execution.
 * - Leverages {@link ResilienceOptions} for resilience-related options (excluding cache).
 * - Integrates with {@link CommandWithDependencies} to enable advanced command configuration.
 */
export type CommandOptions<KnownQueries extends QueryRegistry = QueryRegistry> =
  Partial<
    Omit<ResilienceOptions, 'cache'> & {
      invalidation?: {
        /**
         * Names of queries that this command impacts, potentially rendering their results stale after execution.
         */
        queries: (
          | KnownQueries[keyof KnownQueries]['query']['queryName']
          | KnownQueries[keyof KnownQueries]['query']
        )[];
      };
      onMutate?: (ctx: {
        // This is a hack to allow not passing cache type to the onMutate function when using it without specifying the KnownQueries type.
        cache: Exclude<CommandCache<KnownQueries>, CommandCache>;
      }) => void;
    }
  >;

/**
 * Augments a {@link Command} with inferred queries and associated options for managing dependencies and invalidation.
 *
 * @template Name - Name of the command.
 * @template Payload - Payload type of the command.
 * @template Options - Original options type of the command.
 * @template KnownQueries - Names of the queries that the command depends on.
 */
export type CommandWithDependencies<
  Name extends string = string,
  Payload = unknown,
  Options = unknown,
  KnownQueries extends QueryRegistry = QueryRegistry
> = Command<Name, Payload, Options & CommandOptions<KnownQueries>>;

/**
 * A record of commands with inferred queries, constructed from known command and query types.
 *
 * @template KnownCommands - Record of known command types.
 * @template KnownQueries - Record of known query types.
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
 * Context object provided to command handlers for executing commands.
 *
 * @template KnownQueries - Record of known query types.
 * @template KnownEvents - Record of known event types.
 */
type CommandContext<
  KnownQueries extends QueryRegistry,
  KnownEvents extends EventRegistry
> = {
  cache: CommandCache<KnownQueries>;
  emit: EventEmitter<KnownEvents>['emit'];
};

/**
 * A record of inferred command handlers, constructed from known command and event types.
 * Represents a function or class responsible for executing a specific command type.
 * Provides a context object with access to the event bus for publishing events.
 *
 * @template CommandType - The type of command the handler accepts, extending the {@link Command} interface.
 * @template ResponseType - The return type of the command execution, indicating any result or output.
 * @template KnownQueries - Record of known query types.
 * @template KnownEvents - Record of known event types.
 */
export type InferredCommandHandlers<
  CommandType extends Command,
  ResponseType = void,
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownEvents extends EventRegistry = EventRegistry
> = CommandHandler<
  CommandType,
  ResponseType,
  CommandContext<KnownQueries, KnownEvents>
>;

/**
 * Extracts a specific command from a registry of known commands.
 *
 * @template CommandName - The name of the command to extract.
 * @template KnownCommands - The record of known commands.
 */
export type ExtractCommand<
  CommandName,
  KnownCommands extends CommandRegistry = CommandRegistry
> = Extract<KnownCommands[keyof KnownCommands], { commandName: CommandName }>;

/**
 * Extracts the command registry from a given object.
 */
export type ExtractCommands<T> = T extends {
  commands: CommandRegistry;
}
  ? T['commands']
  : CommandRegistry;
