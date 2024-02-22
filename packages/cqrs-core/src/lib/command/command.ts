/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Nullable } from '../internal/types';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type CommandName = string;

type CommandContext = {
  abortController?: AbortController;
} & Record<string, any>;

export type CommandOptions<TOptions> = {
  bulkhead?: boolean;
  retry?: RetryOptions;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
} & Record<string, any> &
  TOptions;

export interface CommandContract<TPayload = any, TOptions = unknown> {
  commandName: CommandName;
  payload?: Nullable<TPayload>;
  options?: CommandOptions<TOptions>; // options are used for command metadata and can be used to select the interceptor
  context?: CommandContext; // context is used to pass additional data to the command handler
}
