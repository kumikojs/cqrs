import { CommandBus } from './command/command_bus';
import { EventBus } from './event/event_bus';
import { QueryBus } from './query/query_bus';
import { QueryCache } from './query/query_cache';

import type {
  BaseModule,
  Combined,
  ComputeCommands,
  ComputeEvents,
  ComputeQueries,
} from './client_types';
import type { CommandContract } from './command/command_contracts';
import type { EventContract } from './event/event_contracts';
import type { QueryCacheOptions } from './query/query_cache';
import type { BaseQueries } from './query/query_types';
import type { ThrottleOptions } from './resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from './resilience/strategies/timeout_strategy';

type ClientOptions = Partial<{
  cache: Partial<QueryCacheOptions>;
  timeout: TimeoutOptions['timeout'];
  throttle: Pick<ThrottleOptions, 'interval' | 'rate'>;
}>;

/**
 * **Client Class**
 *
 * @remarks
 * The `Client` class serves as the primary entry point for interacting with the Stoik library.
 * It acts as a facade, providing a simplified interface to the command, query, and event buses.
 * It also facilitates communication and coordination between different parts of the application,
 * playing a role similar to a mediator pattern.
 *
 * @template KnownCommands The known commands and their associated contracts.
 * @template KnownQueries The known queries and their associated contracts.
 * @template KnownEvents The known events and their associated contracts.
 *
 * @example
 * ```ts
 * import { Client } from '@stoik/cqrs-core';
 * import type { CommandContract, QueryContract, EventContract } from '@stoik/cqrs-core';
 * import { CommandContract } from '@stoik/react-cqrs';

 * // Define the commands
 * type CreateUserCommand = CommandContract<"user.create", { name: string; email: string; }>;
 *
 * // Define the queries
 * type GetUserQuery = QueryContract<"user.get", { id: string; }>;
 *
 * // Define the events
 * type UserCreatedEvent = EventContract<"user.created", { id: string; name: string; email: string; }>;
 *
 * // Define the known commands, queries, and events.
 * type KnownCommands = {
 *  "user.create": CreateUserCommand;
 * };
 *
 * type KnownQueries = {
 * "user.get": GetUserQuery;
 * };
 *
 * type KnownEvents = {
 * "user.created": UserCreatedEvent;
 * };
 *
 * // Create a new client instance.
 * const client = new Client<KnownCommands, KnownQueries, KnownEvents>();
 * ```
 */
export class Client<
  Modules extends BaseModule[] = BaseModule[],
  KnownCommands extends Record<string, CommandContract> =
    | Record<string, CommandContract>
    | ComputeCommands<Combined<Modules>>,
  KnownQueries extends BaseQueries =
    | BaseQueries
    | ComputeQueries<Combined<Modules>>,
  KnownEvents extends Record<string, EventContract> =
    | Record<string, EventContract>
    | ComputeEvents<Combined<Modules>>
> {
  /**
   * The cache instance used for storing and retrieving data to improve performance.
   *
   * @private
   * @type {QueryCache} - {@link Cache}
   */
  #cache: QueryCache;

  /**
   * The event bus used for publishing and subscribing to application events.
   *
   * @private
   * @type {EventBus<KnownEvents>} - {@link EventBus}
   */
  #eventBus: EventBus<KnownEvents> = new EventBus<KnownEvents>();

  /**
   * The command bus responsible for handling command execution and associated logic.
   *
   * @private
   * @type {CommandBus<KnownCommands, KnownQueries>} - {@link CommandBus}
   */
  #commandBus: CommandBus<KnownCommands, KnownQueries, KnownEvents>;

  /**
   * The query bus responsible for executing queries and returning data.
   *
   * @private
   * @type {QueryBus<KnownQueries>} - {@link QueryBus}
   */
  #queryBus: QueryBus<KnownQueries>;

  constructor(options?: ClientOptions) {
    this.#cache = new QueryCache(options?.cache);

    this.#commandBus = new CommandBus(this.#cache, this.#eventBus);
    this.#queryBus = new QueryBus(this.#cache);
  }

  /**
   * Disposes of the client instance and releases any resources used by the client.
   */
  dispose(): void {
    this.#commandBus.dispose();
    this.#queryBus.dispose();
    this.#eventBus.dispose();
    this.#cache.dispose();
  }

  /**
   * Provides access to the command bus for interacting with commands.
   *
   * @returns {CommandBus<KnownCommands, KnownQueries>} The command bus instance.
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
