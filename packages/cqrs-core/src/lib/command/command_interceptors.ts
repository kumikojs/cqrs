/**
 * @module command
 */
import { Cache } from '../internal/cache/cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CombinedPartialOptions } from '../types';
import type { CommandContract } from './contracts';

/**
 * Command interceptors class is used to build interceptors for the command bus.
 *
 * @template TCommand - The type of command the handler accepts, extending {@link CommandContract}.
 * @template KnownCommands - The known commands in the system.
 */
export class CommandInterceptors<
  TCommand extends CommandContract<
    string,
    unknown,
    CombinedPartialOptions<CommandContract, KnownCommands>
  >,
  KnownCommands extends Record<string, CommandContract>
> {
  /**
   * The cache instance.
   */
  #cache: Cache;

  /**
   * Resilience interceptors builder.
   *
   * This builder is used to build resilience interceptors for the command bus.
   */
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TCommand>;

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

  /**
   * Build interceptors for the command bus.
   *
   * @returns The interceptor manager.
   */
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

  /**
   * Add an interceptor that invalidates queries after the command is executed.
   *
   * @param interceptorManager - The interceptor manager.
   */
  #addInvalidatingQueriesInterceptor(
    interceptorManager: InterceptorManagerContract<TCommand>
  ) {
    interceptorManager.tap(
      (command) => Boolean(command.options?.invalidateQueries),
      async (command, next) => {
        const invalidatingQueries = command.options?.queries || [];

        const result = await next?.(command);

        invalidatingQueries.map((queryName) =>
          this.#cache.invalidate(queryName)
        );

        return result;
      }
    );
  }
}
