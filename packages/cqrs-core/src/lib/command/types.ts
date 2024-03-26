import type { CommandContract } from './contracts';
import type { QueryContract } from '../query/contracts';
import type { FallbackOptions } from '../resilience/strategies/fallback_strategy';
import type { RetryOptions } from '../resilience/strategies/retry_strategy';
import type { ThrottleOptions } from '../resilience/strategies/throttle_strategy';
import type { TimeoutOptions } from '../resilience/strategies/timeout_strategy';

export type CommandOptions<TQueriesName extends string[] = string[]> = Partial<{
  retry: RetryOptions;
  timeout: TimeoutOptions['timeout'];
  throttle: Omit<ThrottleOptions, 'serialize'>;
  fallback: FallbackOptions['fallback'];
  queries: TQueriesName;
  invalidateQueries: boolean;
}>;

export type CommandWithInferredQueries<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown,
  TQueriesName extends string[] = string[]
> = CommandContract<TName, TPayload, TOptions & CommandOptions<TQueriesName>>;

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
