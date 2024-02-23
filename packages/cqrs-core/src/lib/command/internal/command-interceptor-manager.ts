import {
  InterceptorManager,
  type InterceptorManagerContract,
} from '../../internal/interceptor/interceptor-manager';
import type { CommandContract } from '../command';
import type { CommandHandlerContract } from '../command-handler';
import type { CommandInterceptor } from '../command-interceptor';

export type SelectThenApplySyntax<TCommand extends CommandContract> = {
  apply: (interceptor: CommandInterceptor<TCommand>) => void;
};

export interface CommandInterceptorManagerContract {
  apply<TCommand extends CommandContract>(
    interceptor: CommandInterceptor<TCommand>
  ): void;

  select<TCommand extends CommandContract>(
    selector: (command: TCommand) => boolean
  ): SelectThenApplySyntax<TCommand>;

  execute<TCommand extends CommandContract, TResponse>(
    command: TCommand,
    handler: CommandHandlerContract<TCommand>['execute']
  ): Promise<TResponse>;
}

export class CommandInterceptorManager
  implements CommandInterceptorManagerContract
{
  #interceptorManager: InterceptorManagerContract<CommandContract>;

  constructor(
    interceptorManager: InterceptorManagerContract<CommandContract> = new InterceptorManager()
  ) {
    this.#interceptorManager = interceptorManager;
  }

  select<TCommand extends CommandContract>(
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

  async execute<TCommand extends CommandContract, TResponse>(
    command: TCommand,
    handler: CommandHandlerContract<TCommand>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute(command, handler);
  }
}
