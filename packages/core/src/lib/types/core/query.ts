import type { DurationUnit } from '../helpers';
import type { AsyncStorageDriver, SyncStorageDriver } from '../main';
import type { OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';

/**
 * Represents a query definition.
 */
export interface Query<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & ResilienceOptions> {
  queryName: Name;
  payload?: Payload;
  context?: QueryContext;
}

/**
 * Represents a query handler definition.
 */
export interface QueryHandler<
  QueryType extends Query = Query,
  ResponseType = unknown
> {
  execute(query: QueryType): Promise<ResponseType>;
}

/**
 * Function type representing a query handler.
 */
export type QueryHandlerFunction<
  QueryType extends Query = Query,
  ResponseType = unknown
> = QueryHandler<QueryType, ResponseType>['execute'];

/**
 * Type representing either a query handler or a query handler function.
 */
export type QueryHandlerOrFunction<
  QueryType extends Query = Query,
  ResponseType = unknown
> =
  | QueryHandler<QueryType, ResponseType>
  | QueryHandlerFunction<QueryType, ResponseType>;

/**
 * Represents the context for a query, primarily used for cancellation.
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
 * Extracts the request type for a specific query name.
 */
export type ExtractQueryRequest<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: { queryName: QueryName } }>['req'];

/**
 * Extracts the response type for a specific query name.
 */
export type ExtractQueryResponse<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: { queryName: QueryName } }>['res'];

/**
 * Represents a registry of queries.
 */
export interface QueryRegistry {
  [key: string]: QueryEntry;
}

/**
 * Represents an entry in the query registry.
 * Each entry contains the request and response types for a specific query.
 */
export type QueryEntry<ReqType extends Query = Query, ResType = unknown> = {
  req: ReqType;
  res: ResType;
};

/**
 * Infers the query handler type for a specific query name.
 */
export type InferredQueryHandler<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = QueryHandlerOrFunction<
  ExtractQueryRequest<QueryName, Queries>,
  ExtractQueryResponse<QueryName, Queries>
>;

/**
 * Extracts the responses for a list of queries.
 */
export type ExtractQueryResponses<Queries extends QueryRegistry> = {
  [Key in keyof Queries]: Queries[Key] extends { response: infer ResponseType }
    ? ResponseType
    : never;
};

/**
 * Extracts the query definitions for a list of queries.
 */
export type ExtractQueryDefinitions<Queries extends QueryRegistry> = {
  [Key in keyof Queries]: Queries[Key] extends { req: infer QueryType }
    ? QueryType extends Query<infer Name, infer Payload, infer Options>
      ? Query<Name, Payload, Options>
      : never
    : never;
};

/**
 * Extracts queries from a given type.
 */
export type ExtractQueries<Type> = Type extends { queries: QueryRegistry }
  ? Type['queries']
  : QueryRegistry;

/**
 * Represents the options for the query cache.
 *
 * @remarks
 * The query cache is used to store the results of queries for a specified duration.
 * The cache is split into two levels: L1 and L2.
 * - The L1 cache is used for fast access to the most recent query results.
 * - The L2 cache is used for long-term storage of query results.
 * The cache is also responsible for invalidating query results when necessary.
 */
export type QueryCacheOptions = {
  l1?: CacheOptions;
  l2: CacheOptions & {
    driver: SyncStorageDriver | AsyncStorageDriver;
  };
};

type CacheOptions = {
  ttl?: DurationUnit;
  gcInterval?: DurationUnit;
};
