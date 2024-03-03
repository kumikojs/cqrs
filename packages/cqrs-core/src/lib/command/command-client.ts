import { CommandInterceptorManager } from './internal/command-interceptor-manager';
import { CommandTaskManager } from './internal/command-task-manager';
import { CommandBus } from './command-bus';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { CommandContract } from './command';
import type { CommandBusContract } from './command-bus';
import type {
  CommandHandlerContract,
  CommandHandlerFn,
} from './command-handler';

export interface CommandClientContract<
  TOptions = unknown,
  BaseCommand extends CommandContract = CommandContract<
    string,
    unknown,
    TOptions
  >
> {
  bus: CommandBusContract<BaseCommand>;
  interceptors: InterceptorManagerContract<BaseCommand>;
  execute<TCommand extends BaseCommand, TResponse>(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse>;
}

export class CommandClient<
  TOptions = unknown,
  BaseCommand extends CommandContract = CommandContract<
    string,
    unknown,
    TOptions
  >
> {
  #commandBus: CommandBusContract<BaseCommand>;
  #commandInterceptorManager: InterceptorManagerContract<BaseCommand>;
  #taskManager: TaskManagerContract<
    CommandContract,
    CommandHandlerContract['execute']
  >;

  constructor({
    commandBus = new CommandBus<BaseCommand>(),
    taskManager = new CommandTaskManager(),
    interceptorManager = new CommandInterceptorManager<BaseCommand>(),
  } = {}) {
    this.#commandBus = commandBus;
    this.#commandInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;

    this.execute = this.execute.bind(this);
  }

  get bus() {
    return this.#commandBus;
  }

  get interceptors() {
    return this.#commandInterceptorManager;
  }

  execute<TCommand extends BaseCommand, TResponse = void>(
    command: TCommand,
    handler?: CommandHandlerFn<TCommand, TResponse>
  ): Promise<TResponse> {
    return this.#taskManager.execute(command, () =>
      this.#commandInterceptorManager.execute<TCommand, TResponse>(
        command,
        handler ? handler : this.#commandBus.execute
      )
    );
  }
}
