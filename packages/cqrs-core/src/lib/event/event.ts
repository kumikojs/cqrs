import type { Nullable } from '../internal/types';

export type EventName = string;

type EventContext = Record<string, unknown>;

export type EventOptions = Record<string, unknown>;

export interface EventContract<TPayload = unknown> {
  eventName: EventName;
  payload?: Nullable<TPayload>;
  options?: EventOptions;
  context?: EventContext;
}
