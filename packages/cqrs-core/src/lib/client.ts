import { CommandClient } from './command/command-client';
import { QueryClient } from './query/query-client';

export class Client {
  #commandClient: CommandClient;
  #queryClient: QueryClient;

  constructor() {
    this.#commandClient = new CommandClient();
    this.#queryClient = new QueryClient();
  }

  get command() {
    return {
      bind: this.#commandClient.commandBus.bind,
      dispatch: this.#commandClient.commandBus.execute,
      interception: this.#commandClient.commandBus.interceptors,
    };
  }

  get query() {
    return {
      bind: this.#queryClient.queryBus.bind,
      dispatch: this.#queryClient.queryBus.execute,
      interception: this.#queryClient.queryBus.interceptors,
    };
  }
}
