import type { TaskManagerContract } from '../internal/task/task-manager';
import type { CommandContract } from './command';
import type {
  CommandHandlerContract,
  CommandHandlerFn,
} from './command-handler';
import {
  CommandInterceptorManager,
  type CommandInterceptorManagerContract,
} from './internal/command-interceptor-manager';
import {
  CommandRegistry,
  type CommandRegistryContract,
} from './internal/command-registry';
import { CommandTaskManager } from './internal/command-task-manager';

/**
 * Export internal Exception classes
 * because they are used in the public API
 */
export {
  CommandAlreadyRegisteredException,
  CommandNotRegisteredException,
} from './internal/command-registry';

type BindToSyntax<TCommand extends CommandContract> = {
  to: (
    handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
  ) => VoidFunction;
};

export interface CommandBusContract<
  BaseCommand extends CommandContract = CommandContract
> {
  bind<TCommand extends BaseCommand>(
    commandName: TCommand['commandName']
  ): BindToSyntax<TCommand>;

  execute<TCommand extends BaseCommand, TResponse>(
    command: TCommand
  ): Promise<TResponse>;

  interceptors: Pick<CommandInterceptorManagerContract, 'apply' | 'select'>;
}

export class CommandBus implements CommandBusContract {
  #commandRegistry: CommandRegistryContract;
  #commandInterceptorManager: CommandInterceptorManagerContract;
  #taskManager: TaskManagerContract<
    CommandContract,
    CommandHandlerContract['execute']
  >;

  constructor({
    registry = new CommandRegistry(),
    interceptorManager = new CommandInterceptorManager(),
    taskManager = new CommandTaskManager(),
  }: {
    registry?: CommandRegistryContract;
    interceptorManager?: CommandInterceptorManagerContract;
    taskManager?: TaskManagerContract<
      CommandContract,
      CommandHandlerContract['execute']
    >;
  } = {}) {
    this.#commandRegistry = registry;
    this.#commandInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;
  }

  bind<TCommand extends CommandContract>(
    commandName: TCommand['commandName']
  ): BindToSyntax<TCommand> {
    return {
      to: (
        handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
      ) => {
        if (typeof handler === 'function') {
          handler = {
            execute: handler,
          };
        }

        return this.#commandRegistry.register(commandName, handler);
      },
    };
  }

  async execute<TCommand extends CommandContract, TResponse>(
    command: TCommand
  ): Promise<TResponse> {
    const handler = this.#commandRegistry.resolve(command.commandName);

    if (!command.context?.abortController) {
      command.context = {
        ...command.context,
        abortController: new AbortController(),
      };
    }

    return this.#taskManager.execute(command, () =>
      this.#commandInterceptorManager.execute(command, handler.execute)
    );
  }

  get interceptors(): Pick<
    CommandInterceptorManagerContract,
    'apply' | 'select'
  > {
    return this.#commandInterceptorManager;
  }
}
