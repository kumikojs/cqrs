/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandContract } from '../command';
import type { CommandHandlerContract } from '../command-handler';
import type { CommandInterceptor } from '../command-interceptor';

import { InterceptorManager } from '../../interceptor/internal/interceptor-manager';

export type SelectThenApplySyntax<TCommand extends CommandContract> = {
  apply: (interceptor: CommandInterceptor<TCommand>) => void;
};

export interface CommandInterceptorManagerContract {
  apply<TCommand extends CommandContract>(
    interceptor: CommandInterceptor<TCommand>
  ): void;

  select<TCommand extends CommandContract<any, any>>(
    selector: (command: TCommand) => boolean
  ): SelectThenApplySyntax<TCommand>;

  execute<TCommand extends CommandContract>(
    command: TCommand,
    handler: CommandHandlerContract<TCommand>['execute']
  ): Promise<any>;
}

export class CommandInterceptorManager {
  #interceptorManager: InterceptorManager<CommandContract>;

  constructor(
    interceptorManager: InterceptorManager<CommandContract> = new InterceptorManager()
  ) {
    this.#interceptorManager = interceptorManager;
  }

  select<TCommand extends CommandContract<any, any>>(
    selector: (command: TCommand) => boolean
  ): SelectThenApplySyntax<TCommand> {
    return {
      apply: (interceptor: CommandInterceptor<TCommand>) => {
        this.#interceptorManager.use<TCommand>(async (command, next) => {
          if (selector(command)) {
            return interceptor(command, next);
          }

          return next?.(command);
        });
      },
    };
  }

  apply<TCommand extends CommandContract>(
    interceptor: CommandInterceptor<TCommand>
  ): void {
    this.#interceptorManager.use(interceptor);
  }

  async execute<TCommand extends CommandContract>(
    command: TCommand,
    handler: CommandHandlerContract<TCommand>['execute']
  ): Promise<any> {
    return this.#interceptorManager.execute(command, handler);
  }
}
