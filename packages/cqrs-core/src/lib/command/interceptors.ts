import { CacheManager } from '../internal/cache/cache-manager';
import { ResiliencyInterceptorBuilder } from '../strategy/resilient_interceptor_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor-manager';
import type { CombinedPartialOptions } from '../types';
import type { CommandContract } from './contracts';

export class CommandInterceptors<
  TCommand extends CommandContract<
    string,
    unknown,
    CombinedPartialOptions<CommandContract, KnownCommands>
  >,
  KnownCommands extends Record<string, CommandContract>
> {
  #resiliencyInterceptorBuilder: ResiliencyInterceptorBuilder<TCommand>;

  constructor(cacheManager: CacheManager) {
    this.#resiliencyInterceptorBuilder =
      new ResiliencyInterceptorBuilder<TCommand>(cacheManager, {
        serialize: (request) =>
          JSON.stringify({
            commandName: request.commandName,
            payload: request.payload,
          }),
      });
  }

  buildInterceptors(): InterceptorManagerContract<TCommand> {
    const interceptorManager = this.#resiliencyInterceptorBuilder
      .addDeduplicationInterceptor()
      .addFallbackInterceptor()
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .build();

    this.#addInvalidatingQueriesInterceptor(interceptorManager);

    return interceptorManager;
  }

  #addInvalidatingQueriesInterceptor(
    interceptorManager: InterceptorManagerContract<TCommand>
  ) {
    interceptorManager.tap(
      (command) => Boolean(command.options?.invalidateQueries),
      async (command, next) => {
        const invalidatingQueries = command.options?.queries || [];

        const result = await next?.(command);

        invalidatingQueries.map((queryName) => {
          return this.#resiliencyInterceptorBuilder.cache.invalidate(queryName);
        });

        return result;
      }
    );
  }
}
