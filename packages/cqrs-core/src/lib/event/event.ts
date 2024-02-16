/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Nullable } from '../internal/types';

export type EventName = string;

type EventContext = Record<string, any>;

export type EventOptions = Record<string, any>;

export interface EventContract<TPayload = any> {
  eventName: EventName;
  payload?: Nullable<TPayload>;
  options?: EventOptions;
  context?: EventContext;
}
