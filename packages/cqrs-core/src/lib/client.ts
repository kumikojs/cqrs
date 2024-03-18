import { CommandClient } from './command/command-client';
import { CommandInterceptorManager } from './command/internal/command-interceptor-manager';
import { EventBus } from './event/event-bus';
import { QueryInterceptorManager } from './query/internal/query-interceptor-manager';
import { QueryClient } from './query/query-client';

import type { CommandContract } from './command/command';
import type { EventContract } from './event/event';
import type { EventBusContract } from './event/event-bus';
import type { QueryContract } from './query/query';
import type { CacheOptions } from './strategy/cache-strategy';
import type { RetryOptions } from './strategy/retry-strategy';
import type { ThrottleOptions } from './strategy/throttle-strategy';
import type { TimeoutOptions } from './strategy/timeout-strategy';

export type ClientOptions = Readonly<{
  strategies?: {
    timeout?: {
      enabled?: boolean;
      options?: TimeoutOptions;
    };
    fallback?: {
      enabled?: boolean;
    };
    retry?: {
      enabled?: boolean;
      options?: RetryOptions;
    };
    cache?: {
      enabled?: boolean;
      options?: CacheOptions;
    };
    throttle?: {
      enabled?: boolean;
      options?: ThrottleOptions;
    };
  };
}>;

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
    register: CommandClient<KnownCommands, KnownQueries>['register'];
    dispatch: CommandClient<KnownCommands, KnownQueries>['execute'];
    interceptors: CommandClient<KnownCommands, KnownQueries>['interceptors'];
  };

  query: {
    register: QueryClient<KnownQueries>['register'];
    dispatch: QueryClient<KnownQueries>['execute'];
    interceptors: QueryClient<KnownQueries>['interceptors'];
    manager: QueryClient<KnownQueries>['manager'];
  };

  eventBus: EventBusContract<KnownEvents>;
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

  #commandClient: CommandClient<KnownCommands, KnownQueries>;

  #queryClient: QueryClient<KnownQueries>;

  constructor(options: ClientOptions = {}) {
    this.#commandClient = new CommandClient({
      eventBus: this.#eventBus,
      interceptorManager: new CommandInterceptorManager({
        strategies: {
          fallback: options?.strategies?.fallback,
          retry: options?.strategies?.retry,
          timeout: options?.strategies?.timeout,
          throttle: options?.strategies?.throttle,
        },
      }),
    });

    this.#queryClient = new QueryClient({
      eventBus: this.#eventBus,
      interceptorManager: new QueryInterceptorManager({
        strategies: {
          cache: options?.strategies?.cache,
          fallback: options?.strategies?.fallback,
          retry: options?.strategies?.retry,
          timeout: options?.strategies?.timeout,
          throttle: options?.strategies?.throttle,
        },
      }),
    });
  }

  get command() {
    return {
      register: this.#commandClient.register,
      dispatch: this.#commandClient.execute,
      interceptors: this.#commandClient.interceptors,
    };
  }

  get query() {
    return {
      register: this.#queryClient.register,
      dispatch: this.#queryClient.execute,
      interceptors: this.#queryClient.interceptors,
      manager: this.#queryClient.manager,
    };
  }

  get eventBus() {
    return this.#eventBus;
  }
}
