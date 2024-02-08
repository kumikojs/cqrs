/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract, CommandName } from '../command';
import type { CommandHandlerContract } from '../command-handler';
import type { CommandInterceptor } from '../command-interceptor';

import { InterceptorManager } from '../../interceptor/internal/interceptor-manager';

export class CommandInterceptorManager {
  #interceptorManager: InterceptorManager<CommandContract>;

  constructor(
    interceptorManager: InterceptorManager<CommandContract> = new InterceptorManager()
  ) {
    this.#interceptorManager = interceptorManager;
  }

  apply<TCommand extends CommandContract>(
    interceptor: CommandInterceptor<TCommand>
  ) {
    return {
      to: (...commandNames: CommandName[]) => {
        this.#applyToCommandNames(interceptor, commandNames);
      },
      toAll: () => {
        this.#interceptorManager.use(interceptor);
      },
      when: (options: Record<string, any>) => {
        this.#applyWhenMatchesOptions(interceptor, options);
      },
    };
  }

  async execute<TCommand extends CommandContract>(
    command: TCommand,
    handler: CommandHandlerContract<TCommand>['execute']
  ) {
    return this.#interceptorManager.execute(command, handler);
  }

  #applyToCommandNames<TCommand extends CommandContract>(
    interceptor: CommandInterceptor<TCommand>,
    commandNames: CommandName[]
  ) {
    this.#interceptorManager.use(async (command: TCommand, next) => {
      if (commandNames.includes(command.commandName)) {
        return interceptor(command, next);
      }

      return next?.(command);
    });
  }

  #applyWhenMatchesOptions<TCommand extends CommandContract<any, any>>(
    interceptor: CommandInterceptor<TCommand>,
    options: Record<string, any>
  ) {
    this.#interceptorManager.use(async (command: TCommand, next) => {
      if (command.options) {
        const keys = Object.keys(options);
        const hasAllKeys = keys.every((key) => {
          return command.options[key] === options[key];
        });

        if (hasAllKeys) {
          return interceptor(command, next);
        }
      }

      return next?.(command);
    });
  }
}
