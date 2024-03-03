import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type CommandOptions = {
  retry?: RetryOptions;
  timeout?: TimeoutOptions['timeout'];
  throttle?: Omit<ThrottleOptions, 'serialize'>;
  fallback?: FallbackOptions['fallback'];
};

export interface CommandContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  commandName: TName;
  payload?: TPayload;
  options?: TOptions & CommandOptions & Record<string, unknown>;
}
