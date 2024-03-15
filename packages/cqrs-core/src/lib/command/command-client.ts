import { CommandBus } from './command-bus';
import { CommandInterceptorManager } from './internal/command-interceptor-manager';
import { CommandTaskManager } from './internal/command-task-manager';

import type { EventBusContract } from '../event/event-bus';
import type { InvalidatedQueries } from '../internal/events/invalidated-queries';
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { CommandContract } from './command';
import type { CommandBusContract } from './command-bus';
import type {
  CommandHandlerContract,
  CommandHandlerFn,
} from './command-handler';

export interface CommandClientContract<
  KnownCommands extends Record<string, CommandContract>
> {
  bus: CommandBusContract<KnownCommands>;
  interceptors: CommandInterceptorManager<KnownCommands>;
  execute<TCommand extends KnownCommands[keyof KnownCommands], TResponse>(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse>;
}

export class CommandClient<
  KnownCommands extends Record<string, CommandContract>
> implements CommandClientContract<KnownCommands>
{
  #commandBus: CommandBusContract<KnownCommands>;
  #eventBus: EventBusContract;

  /**
   * The command interceptor manager
   * Which is used to apply interceptors to the command execution
   */
  #commandInterceptorManager: CommandInterceptorManager<KnownCommands>;

  #taskManager: TaskManagerContract<
    CommandContract,
    CommandHandlerContract['execute']
  >;

  constructor({
    commandBus = new CommandBus<KnownCommands>(),
    taskManager = new CommandTaskManager(),
    interceptorManager,
    eventBus,
  }: {
    commandBus?: CommandBusContract<KnownCommands>;
    taskManager?: TaskManagerContract<
      CommandContract,
      CommandHandlerContract['execute']
    >;
    interceptorManager: CommandInterceptorManager<KnownCommands>;
    eventBus: EventBusContract;
  }) {
    this.#commandBus = commandBus;
    this.#eventBus = eventBus;
    this.#taskManager = taskManager;
    this.#commandInterceptorManager = interceptorManager;

    this.execute = this.execute.bind(this);
  }

  get bus() {
    return this.#commandBus;
  }

  get interceptors() {
    return this.#commandInterceptorManager;
  }

  async execute<
    TCommand extends KnownCommands[keyof KnownCommands],
    TResponse = void
  >(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse> {
    const result = await this.#taskManager.execute<TResponse>(command, () =>
      this.#commandInterceptorManager.execute<TCommand, TResponse>(
        command,
        handler ? handler : this.#commandBus.execute
      )
    );

    if (command.options?.invalidateQueries && command.options?.queries) {
      this.#eventBus.emit<InvalidatedQueries>({
        eventName: 'invalidated-queries',
        payload: {
          queries: command.options.queries,
        },
      });
    }
    return result;
  }
}
