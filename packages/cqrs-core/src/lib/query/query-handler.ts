/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryContract } from './query';

export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TReturn = any
> {
  execute(query: TQuery): Promise<TReturn>;
}

export type QueryHandlerFn<
  T extends QueryContract = QueryContract,
  TResponse = any
> = (query: T) => Promise<TResponse>;
