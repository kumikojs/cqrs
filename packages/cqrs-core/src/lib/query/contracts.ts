import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CombinedPartialOptions } from '../types';
import type { QueryContext, QueryHandlerFn, QueryOptions } from './types';

export interface QueryContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  queryName: TName;
  payload?: TPayload;
  options?: TOptions & QueryOptions & Record<string, unknown>;
  context?: QueryContext;
}

export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TResponse = unknown
> {
  execute(query: TQuery): Promise<TResponse>;
}

export interface QueryBusContract<
  KnownQueries extends Record<string, QueryContract>
> {
  interceptors: InterceptorManagerContract<
    QueryContract<
      string,
      unknown,
      CombinedPartialOptions<QueryContract, KnownQueries>
    >
  >;
  execute<TQuery extends KnownQueries[keyof KnownQueries], TResponse = void>(
    query: TQuery,
    handler?: QueryHandlerFn<TQuery, TResponse>
  ): Promise<TResponse>;
  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction;
}
