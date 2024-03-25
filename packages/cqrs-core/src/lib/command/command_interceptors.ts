import { Cache } from '../internal/cache/cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
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
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TCommand>;
  #cache: Cache;

  constructor(cache: Cache) {
    this.#cache = cache;
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TCommand>(cache, {
        serialize: (request) =>
          JSON.stringify({
            commandName: request.commandName,
            payload: request.payload,
          }),
      });
  }

  buildInterceptors(): InterceptorManagerContract<TCommand> {
    const interceptorManager = this.#resilienceInterceptorsBuilder
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
          return this.#cache.invalidate(queryName);
        });

        return result;
      }
    );
  }
}
