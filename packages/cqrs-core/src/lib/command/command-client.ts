import { CommandBus } from './command-bus';
import { CommandInterceptorManager } from './internal/command-interceptor-manager';
import { CommandTaskManager } from './internal/command-task-manager';

import type { EventBusContract } from '../event/event-bus';
import type { InvalidatedQueries } from '../internal/events/invalidated-queries';
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { CommandContract, InferCommandContract } from './command';
import type { CommandBusContract } from './command-bus';
import type {
  CommandHandlerContract,
  CommandHandlerFn,
} from './command-handler';
import type { QueryContract } from '../query/query';

export interface CommandClientContract<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> {
  interceptors: CommandInterceptorManager<
    CommandContract<string, unknown, CombinedPartialOptions<KnownCommands>>
  >;
  execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse>;
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction;
}

type ExtractedOptions<T extends CommandContract> = T extends {
  options?: infer O;
}
  ? O
  : never;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type CombinedPartialOptions<
  KnownCommands extends Record<string, CommandContract>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownCommands[keyof KnownCommands]>>
>;

type InferredCommands<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: InferCommandContract<
    CommandName,
    KnownCommands[CommandName]['payload'],
    KnownCommands[CommandName]['options'],
    KnownQueries[keyof KnownQueries]['queryName'][]
  >;
};

export class CommandClient<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> implements CommandClientContract<KnownCommands, KnownQueries>
{
  #commandBus: CommandBusContract;
  #eventBus: EventBusContract;

  /**
   * The command interceptor manager
   * Which is used to apply interceptors to the command execution
   */
  #commandInterceptorManager: CommandInterceptorManager<
    CommandContract<string, unknown, CombinedPartialOptions<KnownCommands>>
  >;

  #taskManager: TaskManagerContract<
    CommandContract,
    CommandHandlerContract['execute']
  >;

  constructor({
    commandBus = new CommandBus(),
    taskManager = new CommandTaskManager(),
    interceptorManager,
    eventBus,
  }: {
    commandBus?: CommandBusContract;
    taskManager?: TaskManagerContract<
      CommandContract,
      CommandHandlerContract['execute']
    >;
    interceptorManager: CommandInterceptorManager<
      CommandContract<string, unknown, CombinedPartialOptions<KnownCommands>>
    >;
    eventBus: EventBusContract;
  }) {
    this.#commandBus = commandBus;
    this.#eventBus = eventBus;
    this.#taskManager = taskManager;
    this.#commandInterceptorManager = interceptorManager;

    this.execute = this.execute.bind(this);
    this.register = this.register.bind(this);
  }

  get bus() {
    return this.#commandBus;
  }

  get interceptors() {
    return this.#commandInterceptorManager;
  }

  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    queryName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction {
    return this.#commandBus.register(queryName, handler);
  }

  async execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
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
