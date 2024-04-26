import type { ResilienceOptions } from '../resilience/resilience_interceptors_builder';
import type { QueryContract } from './query_contracts';

/**
 * The context for a query, primarily used for cancellation.
 */
export interface QueryContext {
  /**
   * The signal for aborting the query.
   *
   * @remarks Integrates with libraries like `@tanstack/react-query` for cancellation mechanisms.
   */
  signal?: AbortSignal;
}

/**
 * Options for configuring a query's behavior and resilience.
 * (Refer to {@link ResilienceOptions} for more information.)
 */
export type QueryOptions = ResilienceOptions;

export type ExtractQueryRequest<
  TQueryName,
  KnownQueries extends BaseQueries = BaseQueries
> = Extract<
  KnownQueries[keyof KnownQueries],
  { query: { queryName: TQueryName } }
>['query'];

export type ExtractQueryResponse<
  TQueryName,
  KnownQueries extends BaseQueries = BaseQueries
> = Extract<
  KnownQueries[keyof KnownQueries],
  { query: { queryName: TQueryName } }
>['response'];

export type BaseQueries = Record<
  string,
  { query: QueryContract; response: unknown }
>;
