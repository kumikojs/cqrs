import type { QueryContract } from './query';
import type { Interceptor } from '../internal/interceptor/interceptor';

export type QueryInterceptor<TQuery extends QueryContract> =
  Interceptor<TQuery>;
