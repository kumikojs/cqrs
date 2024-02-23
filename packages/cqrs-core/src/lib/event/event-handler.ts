import type { EventContract } from './event';

export interface EventHandlerContract<
  TEvent extends EventContract = EventContract,
  TResponse = unknown
> {
  handle(event: TEvent): Promise<TResponse>;
}
