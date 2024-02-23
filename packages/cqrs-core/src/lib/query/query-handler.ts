import type { QueryContract } from './query';

export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TResponse = unknown
> {
  execute(query: TQuery): Promise<TResponse>;
}

export type QueryHandlerFn<
  T extends QueryContract = QueryContract,
  TResponse = unknown
> = (query: T) => Promise<TResponse>;
