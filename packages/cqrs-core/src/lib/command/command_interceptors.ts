/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';
import { QueryCache } from '../query/query_cache';
import { CommandCache } from './command_cache';
import { StoikLogger } from '../logger/stoik_logger';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor_contracts';
import type { CombinedPartialOptions } from '../types';
import type { CommandContract } from './command_contracts';

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
   * The cache instance used for query invalidation.
   */
  #cache: QueryCache;

  /**
   * @private
   * A builder for creating resilience interceptors.
   */
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<TCommand>;

  #logger: StoikLogger;

  /**
   * Constructs a `CommandInterceptors` instance.
   *
   * @param cache - The cache instance to be used.
   */
  constructor(cache: QueryCache, logger: StoikLogger) {
    this.#cache = cache;
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<TCommand>(cache, logger, {
        serialize: (request) =>
          JSON.stringify({
            commandName: request.commandName,
            payload: request.payload,
          }),
      });

    this.#logger = logger.child({
      topics: ['command', 'interceptors'],
    });
  }

  /**
   * Creates a collection of interceptors for the command bus, including resilience and query invalidation interceptors.
   *
   * @returns The built interceptor manager.
   */
  buildInterceptors(): InterceptorManagerContract<TCommand> {
    this.#logger.info('Building command interceptors');

    const interceptorManager = this.#resilienceInterceptorsBuilder
      .addDeduplicationInterceptor()
      .addFallbackInterceptor()
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .build();

    this.#addInvalidatingQueriesInterceptor(interceptorManager);
    this.#addOnMutateInterceptor(interceptorManager);

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
      'command.interceptors.invalidatingQueries',
      (command) => Boolean(command.options?.invalidation?.queries),
      async (command, next) => {
        const invalidatingQueries =
          command.options?.invalidation?.queries || [];

        const result = await next?.(command);

        this.#cache.invalidateQueries(...invalidatingQueries);

        return result;
      }
    );
  }

  #addOnMutateInterceptor(
    interceptorManager: InterceptorManagerContract<TCommand>
  ) {
    interceptorManager.use(
      'command.interceptors.onMutate',
      async (command, next) => {
        if (!command.options?.onMutate) {
          return await next?.(command);
        }

        const nextResult = next ? next(command) : undefined;

        const cache = new CommandCache(
          { cache: this.#cache, logger: this.#logger },
          nextResult
        );

        //FIXME: This is a hack to get around the type issue with CommandCache
        command.options.onMutate({ cache: cache as unknown as never });

        return await nextResult;
      }
    );
  }
}
