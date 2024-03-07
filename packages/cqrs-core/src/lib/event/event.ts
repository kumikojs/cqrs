import type { Nullable } from '../internal/types';

export interface EventContract<
  TName extends string = string,
  TPayload = unknown
> {
  eventName: TName;
  payload?: Nullable<TPayload>;
}
