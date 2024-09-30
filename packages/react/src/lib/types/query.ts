import type {
  Query,
  QueryInput,
  QueryResult,
  ResilienceOptions,
} from '@kumiko/core/types';

type QueryOptions = {
  runOnMount?: boolean;
};

type ExtendedQueryInput<
  TQueryName extends string,
  TQueryParams = unknown,
  TQueryOptions extends Record<string, unknown> = Record<string, unknown>
> = QueryInput<
  TQueryName,
  TQueryParams,
  TQueryOptions & QueryOptions & ResilienceOptions
>;

export type ExtendedQuery<
  Input extends ExtendedQueryInput<string> = ExtendedQueryInput<string>,
  Output extends QueryResult = QueryResult
> = Query<Input, Output>;
