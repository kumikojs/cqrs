/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Nullable } from '../internal/types';
import type { FallbackOptions } from '../strategy/fallback-strategy';
import type { RetryOptions } from '../strategy/retry-strategy';
import type { ThrottleOptions } from '../strategy/throttle-strategy';
import type { TimeoutOptions } from '../strategy/timeout-strategy';

export type EventName = string;

type EventContext = {
  abortController?: AbortController;
} & Record<string, any>;

export type EventOptions<TOptions> = {
  bulkhead?: boolean;
  retry?: RetryOptions;
  timeout?: TimeoutOptions['timeout'];
  throttle?: ThrottleOptions;
  fallback?: FallbackOptions['fallback'];
} & Record<string, any> &
  TOptions;

export interface EventContract<TPayload = any, TOptions = unknown> {
  eventName: EventName;
  payload?: Nullable<TPayload>;
  options?: EventOptions<TOptions>; // options are used for event metadata and can be used to select the interceptor
  context?: EventContext; // context is used to pass additional data to the event handler
}
