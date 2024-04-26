import { CommandCache } from './command_cache';

import type { BaseQueries } from '../query/query_types';
import type { EventContract, EventEmitter } from '../event/event_contracts';
import type { ResilienceOptions } from '../resilience/resilience_interceptors_builder';
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
export type CommandOptions<KnownQueries extends BaseQueries = BaseQueries> =
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
        //FIXME: This is a hack to allow to don't pass cache type to the onMutate function when using it without specifying the KnownQueries type
        cache: Exclude<CommandCache<KnownQueries>, CommandCache>;
      }) => void;
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
  KnownQueries extends BaseQueries = BaseQueries
> = CommandContract<TName, TPayload, TOptions & CommandOptions<KnownQueries>>;

/**
 * A record of commands with inferred queries, constructed from known command and query types.
 *
 * @template KnownCommands - Record of known command types.
 * @template KnownQueries - Record of known query types.
 */
export type InferredCommands<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends BaseQueries
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: CommandWithInferredQueries<
    CommandName,
    ExtractCommand<CommandName, KnownCommands>['payload'],
    ExtractCommand<CommandName, KnownCommands>['options'],
    KnownQueries
  >;
};

/**
 * Context object provided to command handlers for executing commands.
 *
 * @template KnownEvents - Record of known event types.
 */
type CommandContext<
  KnownQueries extends BaseQueries,
  KnownEvents extends Record<string, EventContract>
> = {
  cache: CommandCache<KnownQueries>;
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
  KnownQueries extends BaseQueries = BaseQueries,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> = CommandHandlerContract<
  TCommand,
  TResponse,
  CommandContext<KnownQueries, KnownEvents>
>;

export type ExtractCommand<
  TCommandName,
  KnownCommands extends Record<string, CommandContract> = Record<
    string,
    CommandContract
  >
> = Extract<KnownCommands[keyof KnownCommands], { commandName: TCommandName }>;
