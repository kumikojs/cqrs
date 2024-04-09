import { EventBus } from '../event/event_bus';
import { EventContract, EventEmitter } from '../event/event_contracts';
import type { QueryContract } from '../query/query_contracts';
import { ResilienceOptions } from '../resilience/resilience_interceptors_builder';
import type {
  CommandContract,
  CommandHandlerContract,
} from './command_contracts';

/**
 * Options for configuring command execution, including resilience strategies and query dependencies.
 *
 * @template TQueriesName - Array of string literals representing names of queries the command depends on.
 *
 * @remarks
 * This type provides flexibility in defining optional command configurations for resilience, managing query dependencies, and enabling automatic invalidation of dependent queries after command execution. *
 * - Leverages {@link ResilienceOptions} for resilience-related options (excluding cache).
 * - Integrates with {@link CommandWithInferredQueries} to enable advanced command configuration.
 */
export type CommandOptions<TQueriesName extends string[] = string[]> = Partial<
  Omit<ResilienceOptions, 'cache'> & {
    /**
     * Names of queries that this command impacts, potentially rendering their results stale after execution.
     */
    queries: TQueriesName;

    /**
     * Flag indicating whether to automatically invalidate results of dependent queries after command execution.
     */
    invalidateQueries: boolean;
  }
>;

/**
 * Augments a {@link CommandContract} with inferred queries and associated options for managing dependencies and invalidation.
 *
 * @template TName - Name of the command.
 * @template TPayload - Payload type of the command.
 * @template TOptions - Original options type of the command.
 * @template TQueriesName - Names of the queries that the command depends on.
 */
export type CommandWithInferredQueries<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown,
  TQueriesName extends string[] = string[]
> = CommandContract<TName, TPayload, TOptions & CommandOptions<TQueriesName>>;

/**
 * A record of commands with inferred queries, constructed from known command and query types.
 *
 * @template KnownCommands - Record of known command types.
 * @template KnownQueries - Record of known query types.
 */
export type InferredCommands<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: CommandWithInferredQueries<
    CommandName,
    KnownCommands[CommandName]['payload'],
    KnownCommands[CommandName]['options'],
    KnownQueries[keyof KnownQueries]['queryName'][]
  >;
};

/**
 * Context object provided to command handlers for executing commands.
 *
 * @template KnownEvents - Record of known event types.
 */
type CommandContext<KnownEvents extends Record<string, EventContract>> = {
  emit: EventEmitter<KnownEvents>['emit'];
};

/**
 * A record of inferred command handlers, constructed from known command and event types.
 * Represents a function or class responsible for executing a specific command type.
 * Provides a context object with access to the event bus for publishing events.
 *
 * @template KnownCommands - Record of known command types.
 * @template KnownEvents - Record of known event types.
 */
export type InferredCommandHandlers<
  TCommand extends CommandContract,
  TResponse = void,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> = CommandHandlerContract<TCommand, TResponse, CommandContext<KnownEvents>>;
