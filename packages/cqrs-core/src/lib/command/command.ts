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

export interface CommandContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  commandName: TName;
  payload?: TPayload;
  options?: TOptions & CommandOptions & Record<string, unknown>;
}

export type InferCommandContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown,
  TQueriesName extends string[] = string[]
> = CommandContract<TName, TPayload, TOptions & CommandOptions<TQueriesName>>;
