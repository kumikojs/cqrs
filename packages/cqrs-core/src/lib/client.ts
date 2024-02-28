import { CommandClient } from './command/command-client';
import { QueryInterceptorManager } from './query/internal/query-interceptor-manager';
import { QueryClient, QueryClientContract } from './query/query-client';
import {
  BulkheadOptions,
  BulkheadStrategy,
} from './strategy/bulkhead-strategy';

export type ClientOptions = {
  bulkhead?: BulkheadOptions;
};

export interface ClientContract<TOptions = unknown> {
  /* command: {
    register: CommandClient<TOptions>['bus']['register'];
    dispatch: CommandClient<TOptions>['execute'];
    interceptors: {
      use: CommandClient<TOptions>['interceptors']['use'];
      tap: CommandClient<TOptions>['interceptors']['tap'];
    };
  }; */

  query: {
    register: QueryClient<TOptions>['bus']['register'];
    dispatch: QueryClient<TOptions>['execute'];
    interceptors: {
      use: QueryClient<TOptions>['interceptors']['use'];
      tap: QueryClient<TOptions>['interceptors']['tap'];
    };
  };
}

export class Client<TOptions = unknown> implements ClientContract<TOptions> {
  #commandClient: CommandClient<TOptions>;
  #queryClient: QueryClientContract<TOptions>;

  constructor(options: ClientOptions = {}) {
    const bulkhead = new BulkheadStrategy(options.bulkhead);

    this.#commandClient = new CommandClient();
    this.#queryClient = new QueryClient({
      interceptorManager: new QueryInterceptorManager({
        strategies: {
          bulkhead: {
            strategy: bulkhead,
          },
        },
      }),
    });
  }

  /*   get command() {
    return {
      bind: this.#commandClient.commandBus.bind,
      dispatch: this.#commandClient.commandBus.execute,
      intercept: this.#commandClient.commandBus.interceptors,
    };
  } */

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
}
