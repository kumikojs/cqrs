import { CommandBus } from './command/command_bus';
import { EventBus } from './event/event_bus';
import { Cache } from './internal/cache/cache';
import { QueryBus } from './query/query_bus';

import type { CommandContract } from './command/contracts';
import type { EventBusContract, EventContract } from './event/contracts';
import type { QueryContract } from './query/contracts';

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
  command: {
    register: CommandBus<KnownCommands, KnownQueries>['register'];
    dispatch: CommandBus<KnownCommands, KnownQueries>['execute'];
    interceptors: CommandBus<KnownCommands, KnownQueries>['interceptors'];
  };

  query: {
    register: QueryBus<KnownQueries>['register'];
    dispatch: QueryBus<KnownQueries>['execute'];
    interceptors: QueryBus<KnownQueries>['interceptors'];
  };

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

  #commandBus: CommandBus<KnownCommands, KnownQueries>;

  #queryBus: QueryBus<KnownQueries>;

  #cache: Cache = new Cache();

  constructor() {
    this.#commandBus = new CommandBus(this.#cache);
    this.#queryBus = new QueryBus(this.#cache);
  }

  get command() {
    return {
      register: this.#commandBus.register,
      dispatch: this.#commandBus.execute,
      interceptors: this.#commandBus.interceptors,
    };
  }

  get query() {
    return {
      register: this.#queryBus.register,
      dispatch: this.#queryBus.execute,
      interceptors: this.#queryBus.interceptors,
    };
  }

  get eventBus() {
    return this.#eventBus;
  }

  get cache() {
    return this.#cache;
  }
}
