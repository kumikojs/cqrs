import type { CommandContract } from './command';
import type { Interceptor } from '../internal/interceptor/interceptor';

export type CommandInterceptor<TCommand extends CommandContract> =
  Interceptor<TCommand>;
