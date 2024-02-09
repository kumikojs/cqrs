/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract, CommandName } from './command';
import type { CommandHandlerContract } from './command-handler';
import {
  CommandInterceptorManager,
  CommandInterceptorManagerContract,
} from './internal/command-interceptor-manager';
import {
  CommandRegistry,
  type CommandRegistryContract,
} from './internal/command-registry';
import {
  type TaskManagerContract,
  TaskManager,
} from '../internal/task/task-manager';

type CommandHandlerFn<
  T extends CommandContract = CommandContract,
  TResponse = any
> = (command: T) => Promise<TResponse>;

type BindToSyntax<TCommand extends CommandContract> = {
  to: (
    handler: CommandHandlerContract<TCommand> | CommandHandlerFn<TCommand>
  ) => VoidFunction;
};

export interface CommandBusContract<
  BaseCommand extends CommandContract = CommandContract
> {
  bind<TCommand extends BaseCommand>(
    commandName: CommandName
  ): BindToSyntax<TCommand>;

  execute<TCommand extends BaseCommand, TResponse = any>(
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
    commandRegistry = new CommandRegistry(),
    commandInterceptorManager = new CommandInterceptorManager(),
    taskManager = new TaskManager(),
  }: {
    commandRegistry?: CommandRegistryContract;
    commandInterceptorManager?: CommandInterceptorManagerContract;
    taskManager?: TaskManagerContract<
      CommandContract,
      CommandHandlerContract['execute']
    >;
  } = {}) {
    this.#commandRegistry = commandRegistry;
    this.#commandInterceptorManager = commandInterceptorManager;
    this.#taskManager = taskManager;
  }

  bind<TCommand extends CommandContract>(
    commandName: CommandName
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

  async execute<TCommand extends CommandContract, TResponse = any>(
    command: TCommand
  ): Promise<TResponse> {
    const handler = this.#commandRegistry.resolve(command.commandName);

    // TaskManager is used before CommandInterceptorManager to ensure that the command is executed only once
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
