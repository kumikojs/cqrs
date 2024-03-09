import type { EventContract } from './event';

export interface EventHandlerContract<
  TEvent extends EventContract = EventContract
> {
  handle(event: TEvent): Promise<void>;
}

export type EventHandlerFn<T extends EventContract = EventContract> = (
  event: T
) => Promise<void>;
