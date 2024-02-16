/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventContract } from './event';

export interface EventHandlerContract<
  TEvent extends EventContract = EventContract,
  TReturn = any
> {
  execute(event: TEvent): Promise<TReturn>;
}
