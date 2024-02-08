import type { CommandContract } from './command';
import type { Interceptor } from '../interceptor/interceptor';

export type CommandInterceptor<TCommand extends CommandContract> =
  Interceptor<TCommand>;
