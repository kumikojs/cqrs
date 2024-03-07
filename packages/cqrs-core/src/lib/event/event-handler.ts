import type { EventContract } from './event';

export interface EventHandlerContract<
  TEvent extends EventContract = EventContract
> {
  handle(event: TEvent): Promise<void>;
}
