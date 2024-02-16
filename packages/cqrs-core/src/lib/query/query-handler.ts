/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryContract } from './query';

export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TReturn = any
> {
  execute(query: TQuery): Promise<TReturn>;
}
