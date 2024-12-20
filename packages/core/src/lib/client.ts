import { CommandBus } from './core/command/command_bus';
import { EventBus } from './core/event/event_bus';
import { QueryBus } from './core/query/query_bus';
import { QueryCache } from './core/query/query_cache';
import { KumikoLogger, logger } from './utilities/logger/kumiko_logger';

import type { CommandBusContract, CommandRegistry } from './types/core/command';
import type { EventBusContract, EventRegistry } from './types/core/event';
import type { QueryRegistry } from './types/core/query';
import type {
  ClientOptions,
  ExtractCommands,
  ExtractEvents,
  ExtractQueries,
  Feature,
  FeatureSchema,
  FeatureToSchema,
  MergedFeatureSchema,
  QueryBusContract,
} from './types/main';

/**
 * **Client Class**
 *
 * The `Client` class serves as the primary entry point for interacting with the Kumiko library.
 * It acts as a facade, providing a simplified interface to the command, query, and event buses.
 * It facilitates communication and coordination between different parts of the application,
 * playing a role similar to a mediator pattern.
 *
 */
export class Client<
  FeatureList extends Feature[] = Feature[],
  FeatureSchemaList extends FeatureSchema[] = FeatureToSchema<
    FeatureList[number]
  >[],
  KnownCommands extends CommandRegistry = ExtractCommands<
    MergedFeatureSchema<FeatureSchemaList>
  >,
  KnownQueries extends QueryRegistry = ExtractQueries<
    MergedFeatureSchema<FeatureSchemaList>
  >,
  KnownEvents extends EventRegistry = ExtractEvents<
    MergedFeatureSchema<FeatureSchemaList>
  >
> {
  #cache: QueryCache;
  #eventBus: EventBusContract<KnownEvents>;
  #commandBus: CommandBusContract<KnownCommands, KnownQueries, KnownEvents>;
  #queryBus: QueryBusContract<KnownQueries>;
  #logger: KumikoLogger;

  /**
   * Constructs a new `Client` instance.
   *
   * @param options - The options for configuring the client.
   */
  constructor(options: ClientOptions) {
    this.#logger =
      options?.logger instanceof KumikoLogger
        ? options.logger
        : logger(options.logger);

    this.#cache = new QueryCache(options.cache);

    this.#eventBus = new EventBus(this.#logger);
    this.#commandBus = new CommandBus(
      this.#cache,
      this.#eventBus,
      this.#logger,
      options?.resilience?.command
    );
    this.#queryBus = new QueryBus(
      this.#cache,
      this.#logger,
      options?.resilience?.query
    );
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
  get command(): CommandBusContract<KnownCommands, KnownQueries, KnownEvents> {
    return this.#commandBus;
  }

  /**
   * Provides access to the query bus for executing queries.
   *
   * @returns {QueryBus<KnownQueries>} The query bus instance.
   */
  get query(): QueryBusContract<KnownQueries> {
    return this.#queryBus;
  }

  /**
   * Provides access to the event bus for publishing and subscribing to events.
   *
   * @returns {EventBus<KnownEvents>} The event bus instance.
   */
  get event(): EventBusContract<KnownEvents> {
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
