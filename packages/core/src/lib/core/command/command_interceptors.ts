/* eslint-disable @typescript-eslint/no-explicit-any */

import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { ResilienceInterceptorsBuilder } from '../resilience/resilience_interceptors_builder';
import { CommandCache } from './command_cache';

import type {
  Command,
  CommandRegistry,
  CommandWithOptions,
} from '../../types/core/command';
import type { MergedPartialOptions } from '../../types/core/options/options';
import type {
  ResilienceBuilderOptions,
  ResilienceOptions,
} from '../../types/core/options/resilience_options';
import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';

/**
 * Constructs a collection of interceptors for a command bus, enhancing its functionality with resilience and query invalidation.
 *
 * @template CommandType - The type of command the handler accepts, extending {@link Command}.
 * @template KnownCommands - The known commands in the system.
 *
 * This class is designed to be used as a mixin with a command bus class or as a standalone utility for building interceptors.
 *
 * @example
 * ```typescript
 * const commandInterceptors = new CommandInterceptors<MyCommand>(cache);
 * const interceptorManager = commandInterceptors.buildInterceptors();
 * ```
 */
export class CommandInterceptors<
  CommandType extends Command<
    string,
    unknown,
    MergedPartialOptions<Command, KnownCommands> &
      ResilienceOptions &
      CommandWithOptions<never>
  >,
  KnownCommands extends CommandRegistry
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
  #resilienceInterceptorsBuilder: ResilienceInterceptorsBuilder<CommandType>;

  /**
   * @private
   * Logger instance for logging command interceptor activities.
   */
  #logger: KumikoLogger;

  /**
   * Constructs a `CommandInterceptors` instance.
   *
   * @param cache - The cache instance to be used.
   * @param logger - The logger instance to be used for logging.
   * @param options - The options for resilience and other configurations.
   */
  constructor(
    cache: QueryCache,
    logger: KumikoLogger,
    options: ResilienceBuilderOptions
  ) {
    this.#cache = cache;
    this.#resilienceInterceptorsBuilder =
      new ResilienceInterceptorsBuilder<CommandType>(cache, logger, {
        ...options,
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
  buildInterceptors(): InterceptorManagerContract<CommandType> {
    this.#logger.info('Building command interceptors');

    const interceptorManager = this.#resilienceInterceptorsBuilder
      .addDeduplicationInterceptor()
      .addFallbackInterceptor()
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .addDefaultHandlerInterceptor()
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
    interceptorManager: InterceptorManagerContract<CommandType>
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

  /**
   * @private
   * Adds an interceptor that handles the `onMutate` option for commands.
   *
   * @param interceptorManager - The interceptor manager to which the interceptor is added.
   */
  #addOnMutateInterceptor(
    interceptorManager: InterceptorManagerContract<CommandType>
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

        command.options.onMutate({ cache });

        return await nextResult;
      }
    );
  }
}
