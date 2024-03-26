/**
 * @module command
 */
import type { CommandContract } from './contracts';
import type { QueryContract } from '../query/contracts';
import type { FallbackOptions } from '../resilience/strategies/fallback_strategy';
import type { RetryOptions } from '../resilience/strategies/retry_strategy';
import type { ThrottleOptions } from '../resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from '../resilience/strategies/timeout_strategy';

/**
 * A set of options that can be applied to a command.
 *
 * @template TQueriesName - The names of the queries that the command depends on.
 * @remarks This type is used to infer the queries that a command depends on.
 * @see CommandWithInferredQueries
 */
export type CommandOptions<TQueriesName extends string[] = string[]> = Partial<{
  /**
   * The retry options for the command.
   *
   * @see RetryOptions for more information. {@link RetryOptions}
   */
  retry: RetryOptions;

  /**
   * The timeout options for the command.
   *
   * @see TimeoutOptions for more information. {@link TimeoutOptions}
   */
  timeout: TimeoutOptions['timeout'];

  /**
   * The throttle options for the command.
   *
   * @see ThrottleOptions for more information. {@link ThrottleOptions}
   */
  throttle: Omit<ThrottleOptions, 'serialize'>;

  /**
   * The fallback options for the command.
   *
   * @see FallbackOptions for more information. {@link FallbackOptions}
   */
  fallback: FallbackOptions['fallback'];

  /**
   * The names of the queries that the command depends on.
   */
  queries: TQueriesName;

  /**
   * Whether to invalidate the queries that the command depends on.
   */
  invalidateQueries: boolean;
}>;

/**
 * A command with inferred queries.
 *
 * @template TName - The name of the command.
 * @template TPayload - The payload type of the command.
 * @template TOptions - The options type of the command.
 * @template TQueriesName - The names of the queries that the command depends on.
 */
export type CommandWithInferredQueries<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown,
  TQueriesName extends string[] = string[]
> = CommandContract<TName, TPayload, TOptions & CommandOptions<TQueriesName>>;

/**
 * A record of inferred commands.
 *
 * @template KnownCommands - A record of known command types.
 * @template KnownQueries - A record of known query types.
 */
export type InferredCommands<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: CommandWithInferredQueries<
    CommandName,
    KnownCommands[CommandName]['payload'],
    KnownCommands[CommandName]['options'],
    KnownQueries[keyof KnownQueries]['queryName'][]
  >;
};
