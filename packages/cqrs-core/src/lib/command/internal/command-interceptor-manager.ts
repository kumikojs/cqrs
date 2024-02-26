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

export interface CommandInterceptorManagerContract<
  BaseCommand extends CommandContract = CommandContract
> {
  apply(interceptor: CommandInterceptor<BaseCommand>): void;

  select(
    selector: <TCommand extends BaseCommand>(command: TCommand) => boolean
  ): SelectThenApplySyntax<BaseCommand>;

  execute<TResponse>(
    command: BaseCommand,
    handler: CommandHandlerContract<BaseCommand>['execute']
  ): Promise<TResponse>;
}

export class CommandInterceptorManager<
  BaseCommand extends CommandContract = CommandContract
> implements CommandInterceptorManagerContract<BaseCommand>
{
  #interceptorManager: InterceptorManagerContract<BaseCommand>;

  constructor(
    interceptorManager: InterceptorManagerContract<BaseCommand> = new InterceptorManager()
  ) {
    this.#interceptorManager = interceptorManager;
  }

  select(
    selector: (command: BaseCommand) => boolean
  ): SelectThenApplySyntax<BaseCommand> {
    return {
      apply: (interceptor: CommandInterceptor<BaseCommand>) => {
        this.#interceptorManager.use<BaseCommand>(async (command, next) => {
          if (selector(command)) {
            return interceptor(command, next);
          }

          return next?.(command);
        });
      },
    };
  }

  apply(interceptor: CommandInterceptor<BaseCommand>): void {
    this.#interceptorManager.use(interceptor);
  }

  async execute<TResponse>(
    command: BaseCommand,
    handler: CommandHandlerContract<BaseCommand>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute(command, handler);
  }
}
