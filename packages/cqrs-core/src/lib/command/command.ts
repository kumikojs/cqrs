import type { Nullable } from '../internal/types';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type CommandName = string;

type CommandContext = {
  abortController?: AbortController;
} & Record<string, unknown>;

export type CommandOptions<TOptions> = {
  bulkhead?: boolean;
  retry?: RetryOptions;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
} & Record<string, unknown> &
  TOptions;

export interface CommandContract<TPayload = unknown, TOptions = unknown> {
  commandName: CommandName;
  payload?: Nullable<TPayload>;
  options?: CommandOptions<TOptions>;
  context?: CommandContext;
}
