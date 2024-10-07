import type {
  Query,
  QueryInput,
  QueryOutput,
  ResilienceOptions,
} from '@kumiko/core/types';

type QueryOptions = {
  runOnMount?: boolean;
};

export type OptionalQueryOptions = {
  options?: QueryOptions;
};

export type ExtendedQueryInput<
  TQueryName extends string,
  TQueryPayload = unknown,
  TQueryOptions extends Record<string, unknown> = Record<string, unknown>
> = QueryInput<
  TQueryName,
  TQueryPayload,
  TQueryOptions & QueryOptions & ResilienceOptions
>;

export type ExtendedQuery<
  Input extends ExtendedQueryInput<string> = ExtendedQueryInput<string>,
  Output extends QueryOutput = QueryOutput
> = Query<Input, Output>;
