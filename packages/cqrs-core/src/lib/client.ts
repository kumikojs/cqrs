import { CommandBus } from './command/command_bus';
import { EventBus } from './event/event_bus';
import { Cache } from './internal/cache/cache';
import { QueryBus } from './query/query_bus';

import type { CommandBusContract, CommandContract } from './command/contracts';
import type { EventBusContract, EventContract } from './event/contracts';
import type { QueryBusContract, QueryContract } from './query/contracts';

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
  command: CommandBusContract<KnownCommands, KnownQueries>;

  query: QueryBusContract<KnownQueries>;

  eventBus: EventBusContract<KnownEvents>;

  cache: Cache;
}

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
  #eventBus: EventBusContract<KnownEvents> = new EventBus<KnownEvents>();

  #commandBus: CommandBusContract<KnownCommands, KnownQueries>;

  #queryBus: QueryBusContract<KnownQueries>;

  #cache: Cache = new Cache();

  constructor() {
    this.#commandBus = new CommandBus(this.#cache);
    this.#queryBus = new QueryBus(this.#cache);
  }

  get command() {
    return this.#commandBus;
  }

  get query() {
    return this.#queryBus;
  }

  get eventBus() {
    return this.#eventBus;
  }

  get cache() {
    return this.#cache;
  }
}
