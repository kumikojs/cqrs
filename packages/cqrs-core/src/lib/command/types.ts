import type { CommandContract } from './contracts';
import type { QueryContract } from '../query/contracts';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

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

export type CommandHandlerFn<
  T extends CommandContract = CommandContract,
  TResponse = unknown
> = (command: T) => Promise<TResponse>;

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
