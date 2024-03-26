import { CommandBus } from './command/command_bus';
import { EventBus } from './event/event_bus';
import { Cache } from './internal/cache/cache';
import { QueryBus } from './query/query_bus';

import type { CommandBusContract, CommandContract } from './command/contracts';
import type { EventBusContract, EventContract } from './event/contracts';
import type { QueryBusContract, QueryContract } from './query/contracts';

/**
 * The client contract.
 *
 * The client is the main entry point to interact with Stoik.
 * It acts as a facade to the command, query and event buses.
 * It can also be compared to a mediator.
 *
 * @template KnownCommands The known commands.
 * @template KnownQueries The known queries.
 * @template KnownEvents The known events.
 */
export interface ClientContract<
  KnownCommands extends Record<string, CommandContract> = Record<
    string,
    CommandContract
  >,
  KnownQueries extends Record<string, QueryContract> = Record<
    string,
    QueryContract
  >,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> {
  /**
   * The command bus.
   */
  command: CommandBusContract<KnownCommands, KnownQueries>;

  /**
   * The query bus.
   */
  query: QueryBusContract<KnownQueries>;

  /**
   * The event bus.
   */
  event: EventBusContract<KnownEvents>;

  /**
   * The cache manager to store and retrieve queries results.
   */
  cache: Cache;
}

/**
 * The client class.
 *
 * The client is the main entry point to interact with Stoik.
 * It acts as a facade to the command, query and event buses.
 * It can also be compared to a mediator.
 *
 * @template KnownCommands The known commands.
 * @template KnownQueries The known queries.
 * @template KnownEvents The known events.
 */
export class Client<
  KnownCommands extends Record<string, CommandContract> = Record<
    string,
    CommandContract
  >,
  KnownQueries extends Record<string, QueryContract> = Record<
    string,
    QueryContract
  >,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
> implements ClientContract<KnownCommands, KnownQueries, KnownEvents>
{
  /**
   * The event bus.
   */
  #eventBus: EventBusContract<KnownEvents> = new EventBus<KnownEvents>();

  /**
   * The command bus.
   */
  #commandBus: CommandBusContract<KnownCommands, KnownQueries>;

  /**
   * The query bus.
   */
  #queryBus: QueryBusContract<KnownQueries>;

  /**
   * The cache.
   */
  #cache: Cache = new Cache();

  constructor() {
    this.#commandBus = new CommandBus(this.#cache);
    this.#queryBus = new QueryBus(this.#cache);
  }

  /**
   * The command bus.
   *
   * @returns {CommandBusContract<KnownCommands, KnownQueries>} The command bus.
   */
  get command(): CommandBusContract<KnownCommands, KnownQueries> {
    return this.#commandBus;
  }

  /**
   * The query bus.
   *
   * @returns {QueryBusContract<KnownQueries>} The query bus.
   */
  get query(): QueryBusContract<KnownQueries> {
    return this.#queryBus;
  }

  /**
   * The event bus.
   *
   * @returns {EventBusContract<KnownEvents>} The event bus.
   */
  get event(): EventBusContract<KnownEvents> {
    return this.#eventBus;
  }

  /**
   * The cache.
   *
   * @returns {Cache} The cache.
   */
  get cache(): Cache {
    return this.#cache;
  }
}
