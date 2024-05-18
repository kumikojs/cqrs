import { CommandBus } from './core/command/command_bus';
import { EventBus } from './core/event/event_bus';
import { QueryBus } from './core/query/query_bus';
import { QueryCache } from './core/query/query_cache';
import type { CommandRegistry, ExtractCommands } from './types/core/command';
import type { EventRegistry, ExtractEvents } from './types/core/event';
import type { BaseModule, ClientOptions, Combined } from './types/main';
import type { ExtractQueries, QueryRegistry } from './types/core/query';
import { StoikLogger, logger } from './utilities/logger/stoik_logger';

/**
 * **Client Class**
 *
 * The `Client` class serves as the primary entry point for interacting with the Stoik library.
 * It acts as a facade, providing a simplified interface to the command, query, and event buses.
 * It facilitates communication and coordination between different parts of the application,
 * playing a role similar to a mediator pattern.
 *
 * @template KnownCommands The known commands and their associated contracts.
 * @template KnownQueries The known queries and their associated contracts.
 * @template KnownEvents The known events and their associated contracts.
 *
 * @example
 * ```ts
 * import { Client } from '@stoik/cqrs-core';
 * import type { Command, QueryContract, EventContract } from '@stoik/cqrs-core';
 *
 * // Define the commands
 * type CreateUserCommand = Command<'user.create', { name: string; email: string; }>;
 *
 * // Define the queries
 * type GetUserQuery = QueryContract<'user.get', { id: string; }>;
 *
 * // Define the events
 * type UserCreatedEvent = EventContract<'user.created', { id: string; name: string; email: string; }>;
 *
 * // Define the known commands, queries, and events.
 * type KnownCommands = {
 *  'user.create': CreateUserCommand;
 * };
 *
 * type KnownQueries = {
 *  'user.get': GetUserQuery;
 * };
 *
 * type KnownEvents = {
 *  'user.created': UserCreatedEvent;
 * };
 *
 * // Create a new client instance.
 * const client = new Client<KnownCommands, KnownQueries, KnownEvents>();
 * ```
 */
export class Client<
  Modules extends BaseModule[] = BaseModule[],
  KnownCommands extends CommandRegistry =
    | CommandRegistry
    | ExtractCommands<Combined<Modules>>,
  KnownQueries extends QueryRegistry =
    | QueryRegistry
    | ExtractQueries<Combined<Modules>>,
  KnownEvents extends EventRegistry =
    | EventRegistry
    | ExtractEvents<Combined<Modules>>
> {
  #cache: QueryCache;
  #eventBus: EventBus<KnownEvents>;
  #commandBus: CommandBus<KnownCommands, KnownQueries, KnownEvents>;
  #queryBus: QueryBus<KnownQueries>;
  #logger: StoikLogger;

  /**
   * Constructs a new `Client` instance.
   *
   * @param options - The options for configuring the client.
   */
  constructor(options?: ClientOptions) {
    this.#logger = logger(options?.logger);

    this.#cache = new QueryCache(options?.cache);

    this.#eventBus = new EventBus(this.#logger);
    this.#commandBus = new CommandBus(
      this.#cache,
      this.#eventBus,
      this.#logger,
      options?.command
    );
    this.#queryBus = new QueryBus(this.#cache, this.#logger, options?.query);
  }

  /**
   * Disposes of the client instance and releases any resources used by the client.
   */
  dispose(): void {
    this.#commandBus.disconnect();
    this.#queryBus.disconnect();
    this.#eventBus.disconnect();
    this.#cache.disconnect();
  }

  /**
   * Provides access to the command bus for interacting with commands.
   *
   * @returns {CommandBus<KnownCommands, KnownQueries, KnownEvents>} The command bus instance.
   */
  get command(): CommandBus<KnownCommands, KnownQueries, KnownEvents> {
    return this.#commandBus;
  }

  /**
   * Provides access to the query bus for executing queries.
   *
   * @returns {QueryBus<KnownQueries>} The query bus instance.
   */
  get query(): QueryBus<KnownQueries> {
    return this.#queryBus;
  }

  /**
   * Provides access to the event bus for publishing and subscribing to events.
   *
   * @returns {EventBus<KnownEvents>} The event bus instance.
   */
  get event(): EventBus<KnownEvents> {
    return this.#eventBus;
  }

  /**
   * Provides access to the cache instance for storage and retrieval of data.
   *
   * @returns {QueryCache} The cache instance.
   */
  get cache(): QueryCache {
    return this.#cache;
  }
}
