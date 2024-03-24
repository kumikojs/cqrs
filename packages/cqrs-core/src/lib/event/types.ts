import type { EventContract } from './contracts';

export type EventHandlerFn<T extends EventContract = EventContract> = (
  event: T
) => Promise<void>;
