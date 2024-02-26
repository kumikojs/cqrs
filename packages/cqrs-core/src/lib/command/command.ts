import type { Nullable } from '../internal/types';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type CommandContext = {
  signal?: AbortSignal;
};

export type CommandOptions = {
  bulkhead?: boolean;
  retry?: RetryOptions;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
};

export interface CommandContract<
  TName = string,
  TPayload = unknown,
  TOptions = unknown
> {
  commandName: TName;
  payload?: Nullable<TPayload>;
  options?: TOptions & CommandOptions & Record<string, unknown>;
  context?: CommandContext;
}
