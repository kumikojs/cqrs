import { Cache } from '../internal/cache/cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';

import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CombinedPartialOptions } from '../types';
import type { CommandContract } from './contracts';

/**
 * Constructs a collection of interceptors for a command bus, enhancing its functionality with resilience and query invalidation.
 *
 * @template TCommand - The type of command the handler accepts, extending {@link CommandContract}.
 * @template KnownCommands - The known commands in the system.
 *
 * @remarks
 * This class is designed to be used as a mixin with a command bus class or as a standalone utility for building interceptors.
 *
 * @example
 * ```typescript
 * const commandInterceptors = new CommandInterceptors<MyCommand>(cache);
 * const interceptorManager = commandInterceptors.buildInterceptors();
 * ```
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
   * @private
   * The cache instance used for data storage and retrieval.
   */
  #cache: Cache;

  /**
   * @private
   * A builder for creating resilience interceptors.
   */
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TCommand>;

  /**
   * Constructs a `CommandInterceptors` instance.
   *
   * @param cache - The cache instance to be used.
   */
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
   * Creates a collection of interceptors for the command bus, including resilience and query invalidation interceptors.
   *
   * @returns The built interceptor manager.
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
   * @private
   * Adds an interceptor that invalidates specified queries after a command's execution.
   *
   * @param interceptorManager - The interceptor manager to which the interceptor is added.
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
