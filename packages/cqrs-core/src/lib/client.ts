import { CommandClient } from './command/command-client';
import { CommandInterceptorManager } from './command/internal/command-interceptor-manager';
import { EventBus } from './event/event-bus';
import { QueryInterceptorManager } from './query/internal/query-interceptor-manager';
import { QueryClient } from './query/query-client';

import type { EventBusContract } from './event/event-bus';
import type { QueryClientContract } from './query/query-client';
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

export interface ClientContract<TOptions = unknown> {
  command: {
    register: CommandClient<TOptions>['bus']['register'];
    dispatch: CommandClient<TOptions>['execute'];
    interceptors: {
      use: CommandClient<TOptions>['interceptors']['use'];
      tap: CommandClient<TOptions>['interceptors']['tap'];
    };
  };

  query: {
    register: QueryClient<TOptions>['bus']['register'];
    dispatch: QueryClient<TOptions>['execute'];
    interceptors: {
      use: QueryClient<TOptions>['interceptors']['use'];
      tap: QueryClient<TOptions>['interceptors']['tap'];
    };
  };

  eventBus: EventBusContract;
}

export class Client<TOptions = unknown> implements ClientContract<TOptions> {
  #commandClient: CommandClient<Partial<TOptions>>;
  #queryClient: QueryClientContract<Partial<TOptions>>;
  #eventBus: EventBusContract;

  constructor(options: ClientOptions = {}) {
    this.#commandClient = new CommandClient({
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

    this.#eventBus = new EventBus();
  }

  get command() {
    return {
      register: this.#commandClient.bus.register,
      dispatch: this.#commandClient.execute,
      interceptors: {
        use: this.#commandClient.interceptors.use,
        tap: this.#commandClient.interceptors.tap,
      },
    };
  }

  get query() {
    return {
      register: this.#queryClient.bus.register,
      dispatch: this.#queryClient.execute,
      interceptors: {
        use: this.#queryClient.interceptors.use,
        tap: this.#queryClient.interceptors.tap,
      },
    };
  }

  get eventBus() {
    return this.#eventBus;
  }
}
