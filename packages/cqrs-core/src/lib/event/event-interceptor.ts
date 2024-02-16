import type { EventContract } from './event';
import type { Interceptor } from '../internal/interceptor/interceptor';

export type EventInterceptor<TEvent extends EventContract> =
  Interceptor<TEvent>;
