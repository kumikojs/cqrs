import type { CommandContract } from './command';
import type { Interceptor } from '../interceptor/internal/interceptor-manager';

export type CommandInterceptor<TCommand extends CommandContract> =
  Interceptor<TCommand>;
